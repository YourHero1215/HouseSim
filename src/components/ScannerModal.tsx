import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  Camera,
  Video,
  Upload,
  Sparkles,
  RotateCw,
  Check,
  X,
  RefreshCw,
  Sliders,
  Layers,
  Play,
  Info,
  ChevronDown,
  ChevronUp,
  Cpu,
  Eye,
  CheckCircle2,
} from 'lucide-react';
import {
  InteractionBehavior,
  ScannedObjectAsset,
  ScanShapeMode,
} from '../types/housesim';
import {
  analyzeFrameTo3DData,
  CVAnalysisResult,
  renderDemoTurntableFrame,
} from '../utils/scannerCV';
import { buildScannedObjectMesh } from '../utils/meshBuilder';
import { soundFX } from '../utils/soundEffects';

interface ScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveScannedAsset: (asset: ScannedObjectAsset, placeImmediately: boolean) => void;
}

type ScanMethod = 'photogrammetry' | 'ai_depth';

export const ScannerModal: React.FC<ScannerModalProps> = ({
  isOpen,
  onClose,
  onSaveScannedAsset,
}) => {
  const [activeTab, setActiveTab] = useState<'camera' | 'video'>('camera');
  const [scanMethod, setScanMethod] = useState<ScanMethod>('photogrammetry');
  const [showLidarExplainer, setShowLidarExplainer] = useState(false);

  // Camera state
  const videoRef = useRef<HTMLVideoElement>(null);
  const simCamCanvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [useSimulatedCamera, setUseSimulatedCamera] = useState(false);

  // Guided Turntable Angle Step State: 0 (0° Front), 1 (90° Right), 2 (180° Back), 3 (270° Left)
  const [guidedAngleStep, setGuidedAngleStep] = useState<number>(0);

  // Video upload / demo state
  const uploadedVideoRef = useRef<HTMLVideoElement>(null);
  const demoVideoCanvasRef = useRef<HTMLCanvasElement>(null);
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState<string | null>(null);
  const [usingDemoVideo, setUsingDemoVideo] = useState<'botanical_vase' | 'retro_robot' | null>(
    null
  );
  const [isScanningVideo, setIsScanningVideo] = useState(false);

  // Captured frames & CV result state
  const rawCaptureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [multiAngleThumbs, setMultiAngleThumbs] = useState<string[]>([]);
  const [bgThreshold, setBgThreshold] = useState<number>(38);
  const [cvResult, setCvResult] = useState<CVAnalysisResult | null>(null);

  // AI Monocular Depth Estimation State
  const [isAiEstimating, setIsAiEstimating] = useState(false);
  const [aiLidarNote, setAiLidarNote] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  // Object customization state
  const [objectName, setObjectName] = useState('Scanned Desk Object');
  const [category, setCategory] =
    useState<ScannedObjectAsset['category']>('Decor');
  const [shapeMode, setShapeMode] = useState<ScanShapeMode>('lathe');
  const [sizePreset, setSizePreset] = useState<'small' | 'medium' | 'large'>(
    'medium'
  );
  const [depthScaleRatio, setDepthScaleRatio] = useState<number>(1.0);
  const [interactionBehavior, setInteractionBehavior] =
    useState<InteractionBehavior>('inspect');
  const [surfaceFinish, setSurfaceFinish] = useState<
    'matte' | 'ceramic' | 'metallic'
  >('ceramic');

  // 3D Preview Viewport Ref
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const previewGroupRef = useRef<THREE.Group | null>(null);

  // Start or switch Chromebook camera when modal opens in 'camera' tab
  useEffect(() => {
    if (!isOpen) return;

    let currentStream: MediaStream | null = null;
    let simAnimId = 0;

    const startCamera = async () => {
      if (activeTab !== 'camera') return;
      if (useSimulatedCamera) {
        setCameraActive(true);
        setCameraError(null);
        let t = 0;
        const loopSim = () => {
          t += 0.012;
          if (simCamCanvasRef.current) {
            renderDemoTurntableFrame(
              simCamCanvasRef.current,
              t % 1,
              'botanical_vase'
            );
          }
          simAnimId = requestAnimationFrame(loopSim);
        };
        simAnimId = requestAnimationFrame(loopSim);
        return;
      }

      try {
        setCameraError(null);
        const constraints: MediaStreamConstraints = {
          video: selectedDeviceId
            ? { deviceId: { exact: selectedDeviceId }, width: { ideal: 640 }, height: { ideal: 640 } }
            : { facingMode, width: { ideal: 640 }, height: { ideal: 640 } },
          audio: false,
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        currentStream = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setCameraActive(true);

        const devices = await navigator.mediaDevices.enumerateDevices();
        setCameraDevices(devices.filter((d) => d.kind === 'videoinput'));
      } catch {
        setCameraActive(false);
        setCameraError(
          'Chromebook camera access unavailable in this preview sandbox. You can use Simulated Camera Feed or upload a video.'
        );
      }
    };

    startCamera();

    return () => {
      cancelAnimationFrame(simAnimId);
      if (currentStream) {
        currentStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [isOpen, activeTab, selectedDeviceId, facingMode, useSimulatedCamera]);

  // Animate Demo Turntable Video if selected in Video tab
  useEffect(() => {
    if (!isOpen || activeTab !== 'video' || !usingDemoVideo) return;
    let animId = 0;
    let t = 0;
    const renderLoop = () => {
      t += 0.008;
      if (demoVideoCanvasRef.current) {
        renderDemoTurntableFrame(
          demoVideoCanvasRef.current,
          t % 1,
          usingDemoVideo
        );
      }
      animId = requestAnimationFrame(renderLoop);
    };
    animId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(animId);
  }, [isOpen, activeTab, usingDemoVideo]);

  // Re-run CV segmentation whenever bgThreshold changes on existing raw frame
  useEffect(() => {
    if (!rawCaptureCanvasRef.current) return;
    const updated = analyzeFrameTo3DData(
      rawCaptureCanvasRef.current,
      bgThreshold
    );
    setCvResult(updated);
  }, [bgThreshold]);

  // Initialize Three.js 360° 3D Object Preview Viewport
  useEffect(() => {
    if (!isOpen || !previewContainerRef.current) return;
    const container = previewContainerRef.current;
    const w = container.clientWidth || 320;
    const h = container.clientHeight || 260;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x090d16);

    const camera = new THREE.PerspectiveCamera(42, w / h, 0.05, 25);
    camera.position.set(0, 0.45, 1.15);
    camera.lookAt(0, 0.22, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Three-Point Studio Lighting
    const keyLight = new THREE.DirectionalLight(0xfffbeb, 2.2);
    keyLight.position.set(2, 3, 2);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.9);
    fillLight.position.set(-2, 1.5, 1);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xf59e0b, 1.1);
    rimLight.position.set(0, 2, -2);
    scene.add(rimLight);

    scene.add(new THREE.AmbientLight(0xffffff, 0.6));

    // Studio Turntable Platter
    const platter = new THREE.Mesh(
      new THREE.CylinderGeometry(0.36, 0.38, 0.02, 32),
      new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        roughness: 0.4,
        metalness: 0.3,
      })
    );
    platter.position.y = -0.01;
    scene.add(platter);

    const objGroup = new THREE.Group();
    scene.add(objGroup);
    previewGroupRef.current = objGroup;

    let animId = 0;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      objGroup.rotation.y += 0.014;
      renderer.render(scene, camera);
    };
    animId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animId);
      renderer.dispose();
    };
  }, [isOpen]);

  // Update 3D mesh inside preview whenever `cvResult`, `shapeMode`, `sizePreset`, `depthScaleRatio`, or `surfaceFinish` changes
  useEffect(() => {
    const group = previewGroupRef.current;
    if (!group || !cvResult) return;

    while (group.children.length > 0) {
      group.remove(group.children[0]);
    }

    const baseDims =
      sizePreset === 'small'
        ? { width: 0.26, height: 0.28, depth: 0.26 }
        : sizePreset === 'large'
        ? { width: 0.48, height: 0.56, depth: 0.48 }
        : { width: 0.36, height: 0.42, depth: 0.36 };

    const dims = {
      width: baseDims.width,
      height: baseDims.height,
      depth: baseDims.depth * depthScaleRatio,
    };

    const roughness =
      surfaceFinish === 'ceramic'
        ? 0.16
        : surfaceFinish === 'metallic'
        ? 0.22
        : 0.65;
    const metalness =
      surfaceFinish === 'metallic'
        ? 0.75
        : surfaceFinish === 'ceramic'
        ? 0.12
        : 0.05;

    const previewAsset: ScannedObjectAsset = {
      id: 'preview-temp',
      name: objectName,
      category,
      sourceType: activeTab,
      scannedAt: 'Just now',
      textureDataUrl: cvResult.textureDataUrl,
      silhouetteProfile: cvResult.silhouetteProfile,
      voxelGrid: cvResult.voxelGrid,
      dominantColor: cvResult.dominantColor,
      secondaryColor: cvResult.secondaryColor,
      shapeMode,
      dimensions: dims,
      roughness,
      metalness,
      interactionBehavior,
      interactionNote: '',
    };

    const mesh = buildScannedObjectMesh(
      previewAsset,
      interactionBehavior === 'toggle_light',
      false
    );
    group.add(mesh);
  }, [
    cvResult,
    shapeMode,
    sizePreset,
    depthScaleRatio,
    surfaceFinish,
    interactionBehavior,
    objectName,
    category,
    activeTab,
  ]);

  if (!isOpen) return null;

  // Capture a frame from live Chromebook camera or simulated camera
  const handleCaptureCameraFrame = async (appendAngle: boolean = false) => {
    const captureCanvas = document.createElement('canvas');
    captureCanvas.width = 320;
    captureCanvas.height = 320;
    const ctx = captureCanvas.getContext('2d')!;

    if (useSimulatedCamera && simCamCanvasRef.current) {
      ctx.drawImage(simCamCanvasRef.current, 0, 0, 320, 320);
    } else if (videoRef.current && videoRef.current.videoWidth > 0) {
      const vw = videoRef.current.videoWidth;
      const vh = videoRef.current.videoHeight;
      const minDim = Math.min(vw, vh);
      ctx.drawImage(
        videoRef.current,
        (vw - minDim) / 2,
        (vh - minDim) / 2,
        minDim,
        minDim,
        0,
        0,
        320,
        320
      );
    } else {
      return;
    }

    soundFX.playShutter();
    rawCaptureCanvasRef.current = captureCanvas;
    const result = analyzeFrameTo3DData(captureCanvas, bgThreshold);
    setCvResult(result);
    setShapeMode(result.suggestedShapeMode);

    if (appendAngle) {
      setMultiAngleThumbs((prev) => [...prev.slice(-3), result.textureDataUrl]);
      setGuidedAngleStep((prev) => (prev + 1) % 4);
    } else {
      setMultiAngleThumbs([result.textureDataUrl]);
      setGuidedAngleStep(1);
    }

    // If AI depth estimation is selected as default, trigger AI analysis immediately
    if (scanMethod === 'ai_depth') {
      runAiDepthEstimation(result.textureDataUrl);
    }
  };

  // Run Server-Side AI Monocular Depth Estimation using Gemini 3.8 Flash
  const runAiDepthEstimation = async (imageDataUrl?: string) => {
    const targetImage = imageDataUrl || cvResult?.textureDataUrl;
    if (!targetImage) return;

    setIsAiEstimating(true);
    setAiError(null);

    try {
      const res = await fetch('/api/ai-scan-depth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: targetImage,
          currentName: objectName,
          currentCategory: category,
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        const d = json.data;
        if (d.objectName) setObjectName(d.objectName);
        if (d.category) setCategory(d.category);
        if (d.shapeMode) setShapeMode(d.shapeMode);
        if (Array.isArray(d.silhouetteProfile) && d.silhouetteProfile.length >= 8) {
          setCvResult((prev) => (prev ? { ...prev, silhouetteProfile: d.silhouetteProfile } : prev));
        }
        if (d.roughness !== undefined && d.metalness !== undefined) {
          if (d.metalness > 0.5) setSurfaceFinish('metallic');
          else if (d.roughness < 0.25) setSurfaceFinish('ceramic');
          else setSurfaceFinish('matte');
        }
        if (d.interactionBehavior) setInteractionBehavior(d.interactionBehavior);
        if (d.lidarCompensationExplanation) {
          setAiLidarNote(d.lidarCompensationExplanation);
        }
        soundFX.playScanComplete();
      } else {
        setAiError(json.error || 'AI service unavailable; photogrammetry mesh preserved.');
      }
    } catch {
      setAiError('Network error connecting to AI depth estimator; client photogrammetry active.');
    } finally {
      setIsAiEstimating(false);
    }
  };

  // Handle video file upload from Chromebook storage
  const handleVideoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUsingDemoVideo(null);
    const url = URL.createObjectURL(file);
    setUploadedVideoUrl(url);
    const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
    setObjectName(
      cleanName.charAt(0).toUpperCase() + cleanName.slice(1) || 'Video Scanned Object'
    );
  };

  // Multi-frame Video Keyframe Extraction & 3D Reconstruction
  const handleScanFromVideo = async () => {
    setIsScanningVideo(true);
    soundFX.playShutter();

    const frameCanvases: HTMLCanvasElement[] = [];
    const thumbs: string[] = [];

    if (usingDemoVideo && demoVideoCanvasRef.current) {
      // Extract 4 turntable angles (0°, 90°, 180°, 270°)
      for (const angleNorm of [0.0, 0.25, 0.5, 0.75]) {
        const c = document.createElement('canvas');
        c.width = 320;
        c.height = 320;
        renderDemoTurntableFrame(c, angleNorm, usingDemoVideo);
        frameCanvases.push(c);
        thumbs.push(c.toDataURL('image/png'));
      }
    } else if (uploadedVideoRef.current) {
      const vid = uploadedVideoRef.current;
      const dur = Number.isFinite(vid.duration) && vid.duration > 0 ? vid.duration : 2.0;
      const sampleTimes = [0.1, dur * 0.35, dur * 0.65, dur * 0.9];

      for (const t of sampleTimes) {
        vid.currentTime = t;
        await new Promise<void>((resolve) => {
          const onSeeked = () => {
            vid.removeEventListener('seeked', onSeeked);
            resolve();
          };
          vid.addEventListener('seeked', onSeeked);
          setTimeout(resolve, 250);
        });
        const c = document.createElement('canvas');
        c.width = 320;
        c.height = 320;
        const ctx = c.getContext('2d')!;
        const vw = vid.videoWidth || 320;
        const vh = vid.videoHeight || 320;
        const minDim = Math.min(vw, vh);
        ctx.drawImage(
          vid,
          (vw - minDim) / 2,
          (vh - minDim) / 2,
          minDim,
          minDim,
          0,
          0,
          320,
          320
        );
        frameCanvases.push(c);
        thumbs.push(c.toDataURL('image/png'));
      }
    }

    if (frameCanvases.length > 0) {
      rawCaptureCanvasRef.current = frameCanvases[0];
      const analyses = frameCanvases.map((c) =>
        analyzeFrameTo3DData(c, bgThreshold)
      );

      // Combine multi-angle silhouette profiles for genuine multi-view 3D reconstruction
      const avgProfile = analyses[0].silhouetteProfile.map((_, sliceIdx) => {
        const sum = analyses.reduce(
          (acc, cur) => acc + cur.silhouetteProfile[sliceIdx],
          0
        );
        return Number((sum / analyses.length).toFixed(3));
      });

      const combined: CVAnalysisResult = {
        ...analyses[0],
        silhouetteProfile: avgProfile,
      };
      setCvResult(combined);
      setShapeMode(combined.suggestedShapeMode);
      setMultiAngleThumbs(thumbs);
      soundFX.playScanComplete();

      if (scanMethod === 'ai_depth') {
        runAiDepthEstimation(combined.textureDataUrl);
      }
    }

    setIsScanningVideo(false);
  };

  // Finalize & save the 3D scanned asset
  const handleSave = (placeImmediately: boolean) => {
    if (!cvResult) return;

    const baseDims =
      sizePreset === 'small'
        ? { width: 0.25, height: 0.28, depth: 0.25 }
        : sizePreset === 'large'
        ? { width: 0.5, height: 0.58, depth: 0.5 }
        : { width: 0.36, height: 0.42, depth: 0.36 };

    const dims = {
      width: baseDims.width,
      height: baseDims.height,
      depth: baseDims.depth * depthScaleRatio,
    };

    const roughness =
      surfaceFinish === 'ceramic'
        ? 0.16
        : surfaceFinish === 'metallic'
        ? 0.22
        : 0.65;
    const metalness =
      surfaceFinish === 'metallic'
        ? 0.75
        : surfaceFinish === 'ceramic'
        ? 0.12
        : 0.05;

    const newAsset: ScannedObjectAsset = {
      id: `scan-${Date.now()}`,
      name: objectName.trim() || 'Scanned Object',
      category,
      sourceType: activeTab,
      scannedAt:
        activeTab === 'camera'
          ? 'Scanned via Chromebook Camera'
          : 'Scanned via Object Video',
      textureDataUrl: cvResult.textureDataUrl,
      multiAngleFrames: multiAngleThumbs,
      silhouetteProfile: cvResult.silhouetteProfile,
      voxelGrid: cvResult.voxelGrid,
      dominantColor: cvResult.dominantColor,
      secondaryColor: cvResult.secondaryColor,
      shapeMode,
      dimensions: dims,
      roughness,
      metalness,
      interactionBehavior,
      interactionNote: aiLidarNote
        ? `AI Monocular Depth: ${aiLidarNote}`
        : `Reconstructed via Multi-Angle Photogrammetry (${shapeMode.toUpperCase()}) across ${multiAngleThumbs.length} view(s).`,
      lidarCompensationMethod: scanMethod === 'ai_depth' ? 'ai_monocular_depth' : 'photogrammetry',
      lidarExplanation: aiLidarNote || 'Reconstructed without LiDAR using multi-angle parallax and silhouette contour extrusion.',
    };

    soundFX.playScanComplete();
    onSaveScannedAsset(newAsset, placeImmediately);
    onClose();
  };

  const angleLabels = ['Front (0°)', 'Right (90°)', 'Back (180°)', 'Left (270°)'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4">
      <div className="w-full max-w-5xl bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
        {/* Modal Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-white/10 bg-slate-950/70">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-white font-display">
                3D Object Scanner Studio
              </h2>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                LiDAR-Free Photogrammetry
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Turn standard 2D Chromebook webcam photos or video clips into full 3D spatial meshes
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Mode Switcher Tabs */}
            <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-lg border border-white/10">
              <button
                onClick={() => setActiveTab('camera')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                  activeTab === 'camera'
                    ? 'bg-amber-500 text-slate-950 font-semibold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                Chromebook Camera
              </button>
              <button
                onClick={() => setActiveTab('video')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                  activeTab === 'video'
                    ? 'bg-amber-500 text-slate-950 font-semibold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Video className="w-3.5 h-3.5" />
                Scan from Video
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Close scanner"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* LiDAR Compensation & Technology Callout Bar */}
        <div className="bg-slate-950/90 border-b border-amber-500/20 px-5 py-2.5">
          <div className="flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-200">
              <Cpu className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong>No LiDAR needed:</strong> HouseSim uses{' '}
                <strong className="text-amber-300">Photogrammetry</strong> &{' '}
                <strong className="text-amber-300">AI Monocular Depth</strong> to calculate 3D volume on Chromebooks.
              </span>
            </div>
            <button
              onClick={() => setShowLidarExplainer((p) => !p)}
              className="text-amber-400 hover:text-amber-300 flex items-center gap-1 font-medium whitespace-nowrap"
            >
              <Info className="w-3.5 h-3.5" />
              {showLidarExplainer ? 'Hide Details' : 'How it works'}
              {showLidarExplainer ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Expandable Educational Explanation */}
          {showLidarExplainer && (
            <div className="mt-2.5 pt-2.5 border-t border-white/10 grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px] text-slate-300">
              <div className="bg-slate-900/80 p-2.5 rounded-lg border border-white/5">
                <span className="font-semibold text-white block mb-1">1. Multi-View Photogrammetry</span>
                Rotating an object 360° lets the computer compare silhouette outlines across angles (visual hull) to calculate width, height, and depth without lasers.
              </div>
              <div className="bg-slate-900/80 p-2.5 rounded-lg border border-white/5">
                <span className="font-semibold text-white block mb-1">2. Shape-from-Shading (SfS)</span>
                Surface specular highlights and light falloff on standard 2D pixels provide mathematical surface normal vectors for depth relief.
              </div>
              <div className="bg-slate-900/80 p-2.5 rounded-lg border border-white/5">
                <span className="font-semibold text-white block mb-1">3. Gemini 3.8 Flash AI Depth</span>
                Neural vision models recognize real-world objects and infer realistic 3D volumetric proportions and material finishes instantly.
              </div>
            </div>
          )}
        </div>

        {/* Main 2-Column Body */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 p-5 overflow-y-auto">
          {/* LEFT COLUMN: Camera / Video Viewfinder + Turntable Guidance */}
          <div className="lg:col-span-6 flex flex-col gap-3.5">
            {/* Reconstruction Method Selector (Photogrammetry vs AI Depth) */}
            <div className="flex items-center gap-2 p-1 bg-slate-950 rounded-xl border border-white/10 text-xs">
              <button
                onClick={() => setScanMethod('photogrammetry')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg font-medium transition-colors ${
                  scanMethod === 'photogrammetry'
                    ? 'bg-amber-500 text-slate-950 font-semibold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <RotateCw className="w-3.5 h-3.5" />
                Multi-Angle Photogrammetry
              </button>
              <button
                onClick={() => setScanMethod('ai_depth')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg font-medium transition-colors ${
                  scanMethod === 'ai_depth'
                    ? 'bg-amber-500 text-slate-950 font-semibold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                AI 3D Depth Engine (Gemini)
              </button>
            </div>

            {activeTab === 'camera' ? (
              <>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {cameraDevices.length > 1 && !useSimulatedCamera && (
                      <select
                        value={selectedDeviceId}
                        onChange={(e) => setSelectedDeviceId(e.target.value)}
                        className="bg-slate-950 border border-white/15 rounded-lg px-2.5 py-1 text-xs text-slate-200"
                      >
                        <option value="">Default Chromebook Cam</option>
                        {cameraDevices.map((d, idx) => (
                          <option key={d.deviceId} value={d.deviceId}>
                            {d.label || `Camera ${idx + 1}`}
                          </option>
                        ))}
                      </select>
                    )}
                    {!useSimulatedCamera && (
                      <button
                        onClick={() =>
                          setFacingMode((prev) =>
                            prev === 'environment' ? 'user' : 'environment'
                          )
                        }
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 transition-colors whitespace-nowrap"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Flip Lens
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => setUseSimulatedCamera((prev) => !prev)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                      useSimulatedCamera
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {useSimulatedCamera ? 'Using Simulated Object' : 'Simulate Camera'}
                  </button>
                </div>

                {/* Viewport with Alignment Target & Angle Compass */}
                <div className="relative aspect-square w-full max-h-[300px] mx-auto rounded-xl overflow-hidden bg-slate-950 border border-white/15 flex items-center justify-center">
                  {useSimulatedCamera ? (
                    <canvas
                      ref={simCamCanvasRef}
                      width={320}
                      height={320}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <video
                      ref={videoRef}
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                  )}

                  {/* Scanning Alignment Guide Overlay */}
                  <div className="pointer-events-none absolute inset-5 border-2 border-dashed border-amber-400/60 rounded-2xl flex flex-col justify-between p-2.5">
                    <div className="flex items-center justify-between">
                      <div className="text-[11px] font-mono text-amber-300 bg-slate-950/80 px-2 py-0.5 rounded">
                        TARGET: {angleLabels[guidedAngleStep]}
                      </div>
                      <div className="text-[11px] text-emerald-400 bg-slate-950/80 px-2 py-0.5 rounded font-mono">
                        {multiAngleThumbs.length}/4 angles captured
                      </div>
                    </div>
                    <div className="text-[11px] text-slate-300 bg-slate-950/80 px-2.5 py-0.5 rounded self-center text-center">
                      Align object in center · Rotate 90° between clicks
                    </div>
                  </div>

                  {cameraError && !useSimulatedCamera && (
                    <div className="absolute inset-0 bg-slate-950/95 p-6 flex flex-col items-center justify-center text-center">
                      <Camera className="w-8 h-8 text-amber-400 mb-2" />
                      <p className="text-xs text-slate-300 mb-3 max-w-xs leading-relaxed">
                        {cameraError}
                      </p>
                      <button
                        onClick={() => setUseSimulatedCamera(true)}
                        className="px-4 py-2 rounded-lg bg-amber-500 text-slate-950 text-xs font-semibold hover:bg-amber-400 transition-colors"
                      >
                        Activate Simulated Object Feed
                      </button>
                    </div>
                  )}
                </div>

                {/* Guided 4-Angle Step Visualizer */}
                <div className="bg-slate-950/80 border border-white/10 rounded-xl p-2.5 flex items-center justify-between gap-1 text-[11px]">
                  {angleLabels.map((lbl, idx) => {
                    const isDone = multiAngleThumbs.length > idx;
                    const isCurrent = guidedAngleStep === idx && !isDone;
                    return (
                      <button
                        key={idx}
                        onClick={() => setGuidedAngleStep(idx)}
                        className={`flex-1 py-1 px-1.5 rounded-lg text-center transition-colors truncate ${
                          isDone
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold'
                            : isCurrent
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold'
                            : 'bg-slate-900 text-slate-400'
                        }`}
                      >
                        {isDone && '✓ '}
                        {lbl}
                      </button>
                    );
                  })}
                </div>

                {/* Camera Capture Buttons */}
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    onClick={() => handleCaptureCameraFrame(false)}
                    disabled={!cameraActive && !useSimulatedCamera}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-semibold text-xs transition-colors whitespace-nowrap"
                  >
                    <Camera className="w-4 h-4" />
                    Instant 1-Shot 3D Scan
                  </button>
                  <button
                    onClick={() => handleCaptureCameraFrame(true)}
                    disabled={!cameraActive && !useSimulatedCamera}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white font-medium text-xs border border-white/10 transition-colors whitespace-nowrap"
                  >
                    <RotateCw className="w-4 h-4 text-amber-400" />
                    Capture Next Angle ({multiAngleThumbs.length}/4)
                  </button>
                </div>
              </>
            ) : (
              /* VIDEO OBJECT SCANNER TAB */
              <>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs cursor-pointer transition-colors whitespace-nowrap">
                    <Upload className="w-3.5 h-3.5" />
                    Upload Object Video (.mp4)
                    <input
                      type="file"
                      accept="video/*"
                      onChange={handleVideoFileUpload}
                      className="hidden"
                    />
                  </label>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        setUploadedVideoUrl(null);
                        setUsingDemoVideo('botanical_vase');
                        setObjectName('Terracotta Ribbed Vase');
                        setCategory('Decor');
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                        usingDemoVideo === 'botanical_vase'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      Demo Vase
                    </button>
                    <button
                      onClick={() => {
                        setUploadedVideoUrl(null);
                        setUsingDemoVideo('retro_robot');
                        setObjectName('Retro Tin Robot');
                        setCategory('Collectible');
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                        usingDemoVideo === 'retro_robot'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      Demo Robot
                    </button>
                  </div>
                </div>

                {/* Video Player Viewport */}
                <div className="relative aspect-square w-full max-h-[300px] mx-auto rounded-xl overflow-hidden bg-slate-950 border border-white/15 flex items-center justify-center">
                  {usingDemoVideo ? (
                    <canvas
                      ref={demoVideoCanvasRef}
                      width={320}
                      height={320}
                      className="w-full h-full object-cover"
                    />
                  ) : uploadedVideoUrl ? (
                    <video
                      ref={uploadedVideoRef}
                      src={uploadedVideoUrl}
                      controls
                      playsInline
                      muted
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="p-5 text-center flex flex-col items-center">
                      <Video className="w-9 h-9 text-slate-500 mb-2" />
                      <p className="text-sm font-medium text-slate-300 mb-1">
                        Upload Any Orbiting Video
                      </p>
                      <p className="text-xs text-slate-400 max-w-xs mb-3">
                        Walk around an object or spin it on a table. HouseSim extracts multi-angle keyframes to build your 3D mesh without LiDAR.
                      </p>
                      <button
                        onClick={() => {
                          setUsingDemoVideo('botanical_vase');
                          setObjectName('Terracotta Ribbed Vase');
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-amber-300 border border-amber-500/30 transition-colors"
                      >
                        <Play className="w-3.5 h-3.5" />
                        Load Sample Turntable Video
                      </button>
                    </div>
                  )}
                </div>

                <button
                  onClick={handleScanFromVideo}
                  disabled={(!uploadedVideoUrl && !usingDemoVideo) || isScanningVideo}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-semibold text-xs transition-colors whitespace-nowrap"
                >
                  <Sparkles className="w-4 h-4" />
                  {isScanningVideo
                    ? 'Extracting Keyframes & Reconstructing 3D Mesh...'
                    : 'Extract Video Keyframes & Reconstruct 3D Object'}
                </button>
              </>
            )}

            {/* Multi-Angle Captured Keyframes Strip */}
            {multiAngleThumbs.length > 0 && (
              <div className="bg-slate-950/70 border border-white/10 rounded-xl p-2.5">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                  <span className="font-medium text-slate-300">Multi-Angle Keyframe Filmstrip</span>
                  <span className="font-mono text-[11px]">{multiAngleThumbs.length} angle(s)</span>
                </div>
                <div className="flex items-center gap-2 overflow-x-auto">
                  {multiAngleThumbs.map((thumb, i) => (
                    <div
                      key={i}
                      className="w-12 h-12 rounded-lg bg-slate-900 border border-white/15 p-1 shrink-0 relative"
                    >
                      <img
                        src={thumb}
                        alt={`Angle ${i + 1}`}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-contain"
                      />
                      <span className="absolute bottom-0.5 right-1 text-[9px] font-mono text-amber-400 bg-slate-950/80 px-1 rounded">
                        {i * 90}°
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Live 360° 3D Preview & Depth Customizer */}
          <div className="lg:col-span-6 flex flex-col gap-3.5">
            {/* 3D Turntable Preview Viewport */}
            <div className="relative h-56 w-full rounded-xl overflow-hidden bg-slate-950 border border-white/15">
              <div ref={previewContainerRef} className="w-full h-full" />
              <div className="pointer-events-none absolute top-2.5 left-2.5 text-xs text-slate-300 bg-slate-950/80 px-2.5 py-1 rounded border border-white/10 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-amber-400" />
                360° Reconstructed 3D Mesh
              </div>
              {!cvResult && (
                <div className="absolute inset-0 bg-slate-950/85 flex flex-col items-center justify-center p-5 text-center">
                  <Layers className="w-8 h-8 text-amber-400 mb-2" />
                  <p className="text-xs text-slate-300 max-w-xs">
                    Click <strong className="text-white">Instant 1-Shot 3D Scan</strong> or capture angles on the left to synthesize the 3D model.
                  </p>
                </div>
              )}
            </div>

            {/* AI Depth Analysis Banner / Trigger */}
            <div className="bg-slate-950/80 border border-white/10 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-semibold text-white">AI Vision Depth Enhancement</span>
                </div>
                <button
                  onClick={() => runAiDepthEstimation()}
                  disabled={!cvResult || isAiEstimating}
                  className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-semibold text-[11px] transition-colors whitespace-nowrap"
                >
                  {isAiEstimating ? 'Analyzing Depth...' : 'Run Gemini Depth AI'}
                </button>
              </div>

              {aiLidarNote && (
                <div className="text-[11px] text-emerald-300 bg-emerald-950/40 border border-emerald-500/30 rounded-lg p-2 leading-relaxed flex items-start gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white">LiDAR Compensation:</strong> {aiLidarNote}
                  </div>
                </div>
              )}

              {aiError && (
                <div className="text-[11px] text-amber-300 bg-amber-950/40 border border-amber-500/30 rounded-lg p-2 leading-relaxed">
                  {aiError}
                </div>
              )}
            </div>

            {/* Customization Sliders & Controls */}
            <div className="space-y-2.5 bg-slate-950/60 border border-white/10 rounded-xl p-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-slate-400 mb-1">Object Name</label>
                  <input
                    type="text"
                    value={objectName}
                    onChange={(e) => setObjectName(e.target.value)}
                    className="w-full bg-slate-900 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
                    placeholder="e.g., Ceramic Mug"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ScannedObjectAsset['category'])}
                    className="w-full bg-slate-900 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  >
                    <option value="Decor">Decor</option>
                    <option value="Kitchenware">Kitchenware</option>
                    <option value="Electronics">Electronics</option>
                    <option value="Lighting">Lighting</option>
                    <option value="Collectible">Collectible</option>
                  </select>
                </div>
              </div>

              {/* 3D Geometry Topology */}
              <div>
                <label className="block text-slate-400 mb-1">3D Mesh Reconstruction Topology</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(
                    [
                      { id: 'lathe', label: 'Lathe 360°' },
                      { id: 'extrude', label: 'Contour 3D' },
                      { id: 'voxel', label: 'Voxel Relief' },
                      { id: 'box', label: 'Prism Box' },
                    ] as { id: ScanShapeMode; label: string }[]
                  ).map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setShapeMode(m.id)}
                      className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                        shapeMode === m.id
                          ? 'bg-amber-500 text-slate-950 font-semibold'
                          : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-white/10'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Depth Extrusion (Thickness) Slider - Compensates for single-view lack of depth */}
              <div>
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-amber-400" />
                    3D Front-to-Back Thickness Ratio
                  </span>
                  <span className="font-mono text-slate-200">{depthScaleRatio.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min={0.3}
                  max={2.2}
                  step={0.05}
                  value={depthScaleRatio}
                  onChange={(e) => setDepthScaleRatio(Number(e.target.value))}
                  className="w-full accent-amber-500"
                />
              </div>

              {/* Background Cutout Sensitivity */}
              <div>
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span>Background Cutout Threshold</span>
                  <span className="font-mono text-slate-200">{bgThreshold}</span>
                </div>
                <input
                  type="range"
                  min={12}
                  max={85}
                  value={bgThreshold}
                  onChange={(e) => setBgThreshold(Number(e.target.value))}
                  className="w-full accent-amber-500"
                />
              </div>

              {/* Physical Size & Material Finish & E-Key Interaction */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1">Size</label>
                  <select
                    value={sizePreset}
                    onChange={(e) => setSizePreset(e.target.value as 'small' | 'medium' | 'large')}
                    className="w-full bg-slate-900 border border-white/15 rounded-lg px-2 py-1.5 text-xs text-white"
                  >
                    <option value="small">Small (25 cm)</option>
                    <option value="medium">Medium (40 cm)</option>
                    <option value="large">Large (55 cm)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Surface Finish</label>
                  <select
                    value={surfaceFinish}
                    onChange={(e) => setSurfaceFinish(e.target.value as 'matte' | 'ceramic' | 'metallic')}
                    className="w-full bg-slate-900 border border-white/15 rounded-lg px-2 py-1.5 text-xs text-white"
                  >
                    <option value="ceramic">Glazed Ceramic</option>
                    <option value="matte">Soft Matte</option>
                    <option value="metallic">Brushed Metal</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">[E] Interaction</label>
                  <select
                    value={interactionBehavior}
                    onChange={(e) => setInteractionBehavior(e.target.value as InteractionBehavior)}
                    className="w-full bg-slate-900 border border-white/15 rounded-lg px-2 py-1.5 text-xs text-white"
                  >
                    <option value="inspect">Close-up Inspect</option>
                    <option value="toggle_light">Emit Room Light</option>
                    <option value="play_sound">Play Sound Chime</option>
                    <option value="spin_animate">360° Spin</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Save & Place Buttons */}
            <div className="flex items-center gap-2.5 mt-auto pt-1">
              <button
                onClick={() => handleSave(true)}
                disabled={!cvResult}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-semibold text-xs transition-colors whitespace-nowrap"
              >
                <Check className="w-4 h-4" />
                Save & Place in House
              </button>
              <button
                onClick={() => handleSave(false)}
                disabled={!cvResult}
                className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 font-medium text-xs border border-white/10 transition-colors whitespace-nowrap"
              >
                Save to Library
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
