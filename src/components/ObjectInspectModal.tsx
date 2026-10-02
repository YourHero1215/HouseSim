import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { X, Hand, RotateCw, Sparkles } from 'lucide-react';
import { PlacedHouseObject, ScannedObjectAsset } from '../types/housesim';
import { buildScannedObjectMesh } from '../utils/meshBuilder';

interface ObjectInspectModalProps {
  placed: PlacedHouseObject | null;
  asset: ScannedObjectAsset | null;
  onClose: () => void;
  onPickUp: (instanceId: string) => void;
  onToggleState: (instanceId: string) => void;
}

export const ObjectInspectModal: React.FC<ObjectInspectModalProps> = ({
  placed,
  asset,
  onClose,
  onPickUp,
  onToggleState,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!placed || !asset || !mountRef.current) return;
    const container = mountRef.current;
    const w = container.clientWidth || 340;
    const h = container.clientHeight || 260;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x090d16);

    const camera = new THREE.PerspectiveCamera(42, w / h, 0.05, 20);
    camera.position.set(0, 0.45, 1.15);
    camera.lookAt(0, 0.22, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const key = new THREE.DirectionalLight(0xfffbeb, 2.2);
    key.position.set(2, 3, 2);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0x38bdf8, 0.9);
    fill.position.set(-2, 1.5, 1);
    scene.add(fill);
    scene.add(new THREE.AmbientLight(0xffffff, 0.65));

    const meshGroup = buildScannedObjectMesh(asset, placed.isActiveState, false);
    scene.add(meshGroup);

    let animId = 0;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      meshGroup.rotation.y += 0.015;
      renderer.render(scene, camera);
    };
    animId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animId);
      renderer.dispose();
    };
  }, [placed, asset]);

  if (!placed || !asset) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-slate-900 border border-white/15 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-slate-950/60">
          <div>
            <h3 className="text-base font-bold text-white font-display">
              {placed.name}
            </h3>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>{asset.category}</span>
              <span aria-hidden="true">·</span>
              <span>{placed.surfaceName}</span>
              <span aria-hidden="true">·</span>
              <span>{placed.room}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="relative h-60 w-full rounded-xl overflow-hidden bg-slate-950 border border-white/10">
            <div ref={mountRef} className="w-full h-full" />
            <div className="absolute bottom-3 left-3 text-xs text-slate-400 bg-slate-950/80 px-2.5 py-1 rounded border border-white/10 font-mono">
              {Math.round(asset.dimensions.width * 100)} ×{' '}
              {Math.round(asset.dimensions.height * 100)} ×{' '}
              {Math.round(asset.dimensions.depth * 100)} cm ·{' '}
              {asset.shapeMode.toUpperCase()}
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            {asset.interactionNote ||
              'Scanned 3D object reconstructed from camera/video frames.'}
          </p>

          {/* LiDAR Compensation & Photogrammetry Metadata */}
          <div className="bg-slate-950/70 border border-white/10 rounded-xl p-3 text-xs space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="font-semibold text-slate-200">3D Scanning Technique:</span>
              <span className="text-amber-400 font-mono text-[11px]">
                {asset.lidarCompensationMethod === 'ai_monocular_depth'
                  ? 'AI Monocular Depth (Gemini)'
                  : 'Multi-View Photogrammetry'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed pt-1 border-t border-white/5">
              {asset.lidarExplanation ||
                'Reconstructed without hardware LiDAR using multi-angle visual parallax, silhouette contour profiling, and shape-from-shading.'}
            </p>
          </div>

          <div className="flex items-center gap-2.5 pt-1">
            <button
              onClick={() => {
                onPickUp(placed.instanceId);
                onClose();
              }}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs transition-colors whitespace-nowrap"
            >
              <Hand className="w-4 h-4" />
              Pick Up & Carry [G]
            </button>
            <button
              onClick={() => onToggleState(placed.instanceId)}
              className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs border border-white/10 transition-colors whitespace-nowrap"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              Toggle Action
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
