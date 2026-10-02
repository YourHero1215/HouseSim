import React, { useCallback, useEffect, useState } from 'react';
import {
  Camera,
  RotateCw,
  Trash2,
  Hand,
  Sparkles,
  Copy,
  Sun,
  Moon,
  Sunset,
  Eye,
  Compass,
  Box,
  Volume2,
  VolumeX,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  MapPin,
  Plus,
} from 'lucide-react';
import {
  BuiltinFixture,
  CameraViewMode,
  HumanTelemetry,
  NearbyInteractable,
  PlacedHouseObject,
  ScannedObjectAsset,
  TimeOfDay,
  WallCutawayMode,
} from './types/housesim';
import {
  generateStarterScannedAssets,
  getInitialPlacedObjects,
} from './utils/scannerCV';
import { VirtualHouseCanvas } from './components/VirtualHouseCanvas';
import { ScannerModal } from './components/ScannerModal';
import { ObjectInspectModal } from './components/ObjectInspectModal';
import { CloudflareModal } from './components/CloudflareModal';
import { soundFX } from './utils/soundEffects';

const STORAGE_KEY_ASSETS = 'housesim_scanned_assets_v1';
const STORAGE_KEY_PLACED = 'housesim_placed_objects_v1';

const INITIAL_FIXTURES: BuiltinFixture[] = [
  {
    id: 'fixture-tv',
    name: 'Living Room 65" OLED TV',
    room: 'Living Room',
    position: [-4.5, 1.2, 5.2],
    interactionPrompt: 'Toggle Smart TV Display',
    isActive: true,
    description: 'Ambient wave shader display toggled ON.',
  },
  {
    id: 'fixture-floor-lamp',
    name: 'Brass Arc Floor Lamp',
    room: 'Living Room',
    position: [-7.4, 1.0, 4.8],
    interactionPrompt: 'Toggle Warm Floor Lamp',
    isActive: true,
    description: '2700K warm living room illumination.',
  },
  {
    id: 'fixture-espresso',
    name: 'Island Espresso Bar',
    room: 'Kitchen & Dining',
    position: [3.8, 1.1, 1.7],
    interactionPrompt: 'Brew Fresh Espresso',
    isActive: false,
    description: 'Dual-boiler stainless espresso machine.',
  },
  {
    id: 'fixture-fridge',
    name: 'Smart Stainless Refrigerator',
    room: 'Kitchen & Dining',
    position: [7.8, 1.0, 0.95],
    interactionPrompt: 'Open / Close Refrigerator Door',
    isActive: false,
    description: 'French-door stainless steel refrigerator.',
  },
  {
    id: 'fixture-patio-door',
    name: 'Glass Patio Sliding Door',
    room: 'Kitchen & Dining',
    position: [4.6, 1.0, 0.0],
    interactionPrompt: 'Slide Patio Door Open / Closed',
    isActive: true,
    description: 'Connects Kitchen & Dining to the Sunlit Redwood Deck.',
  },
  {
    id: 'fixture-chromebook',
    name: 'Study Desk Chromebook',
    room: 'Bedroom & Studio',
    position: [-5.3, 0.8, -5.3],
    interactionPrompt: 'Open / Close Chromebook Lid',
    isActive: true,
    description: 'ChromeOS workstation running HouseSim.',
  },
  {
    id: 'fixture-bed-lamp',
    name: 'Nightstand Reading Lamp',
    room: 'Bedroom & Studio',
    position: [-8.2, 0.8, -3.6],
    interactionPrompt: 'Toggle Bedside Lamp',
    isActive: true,
    description: 'Soft amber bedroom reading light.',
  },
];

export default function App() {
  // Scanned 3D Object Assets & Placed Instances
  const [assets, setAssets] = useState<ScannedObjectAsset[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ASSETS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Fallback to starter assets
    }
    return generateStarterScannedAssets();
  });

  const [placedObjects, setPlacedObjects] = useState<PlacedHouseObject[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PLACED);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Fallback to starter placements
    }
    return getInitialPlacedObjects();
  });

  const [fixtures, setFixtures] = useState<BuiltinFixture[]>(INITIAL_FIXTURES);

  // Simulation & Camera View States
  const [cameraMode, setCameraMode] = useState<CameraViewMode>('follow');
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('day');
  const [wallCutaway, setWallCutaway] = useState<WallCutawayMode>('auto');
  const [lowPowerChromebookMode, setLowPowerChromebookMode] = useState(false);
  const [muted, setMuted] = useState(false);
  const [showTouchPad, setShowTouchPad] = useState(false);

  // Interaction, Selection, Placement & Carry States
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(
    null
  );
  const [placingAssetId, setPlacingAssetId] = useState<string | null>(null);
  const [carriedInstanceId, setCarriedInstanceId] = useState<string | null>(
    null
  );
  const [inspectInstanceId, setInspectInstanceId] = useState<string | null>(
    null
  );

  // Modals
  const [scannerOpen, setScannerOpen] = useState(false);
  const [cloudflareOpen, setCloudflareOpen] = useState(false);

  // Human Telemetry & Nearby Prompt
  const [telemetry, setTelemetry] = useState<HumanTelemetry>({
    x: -2.2,
    z: 2.5,
    rotationY: 0,
    currentRoom: 'Living Room',
    isMoving: false,
    carriedInstanceId: null,
  });
  const [nearbyInteractable, setNearbyInteractable] =
    useState<NearbyInteractable | null>(null);
  const [interactionToast, setInteractionToast] = useState<string | null>(null);
  const [virtualMoveInput, setVirtualMoveInput] = useState<{
    x: number;
    z: number;
  }>({ x: 0, z: 0 });

  // Persist assets & placed objects to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_ASSETS, JSON.stringify(assets));
    } catch {
      // Ignore quota errors
    }
  }, [assets]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PLACED, JSON.stringify(placedObjects));
    } catch {
      // Ignore quota errors
    }
  }, [placedObjects]);

  const showToast = useCallback((msg: string) => {
    setInteractionToast(msg);
  }, []);

  useEffect(() => {
    if (!interactionToast) return;
    const timer = setTimeout(() => setInteractionToast(null), 3200);
    return () => clearTimeout(timer);
  }, [interactionToast]);

  // Handle saving a newly scanned 3D object from Chromebook Camera or Video
  const handleSaveScannedAsset = (
    newAsset: ScannedObjectAsset,
    placeImmediately: boolean
  ) => {
    setAssets((prev) => [newAsset, ...prev]);
    if (placeImmediately) {
      setPlacingAssetId(newAsset.id);
      showToast(
        `Scanned "${newAsset.name}"! Click any floor, table, counter, or desk in the house to place it.`
      );
    } else {
      showToast(`Saved "${newAsset.name}" to your Scanned Object Library.`);
    }
  };

  // Place a scanned object onto a raycasted 3D house surface
  const handlePlaceNewObject = useCallback(
    (
      assetId: string,
      position: [number, number, number],
      room: string,
      surfaceName: string
    ) => {
      const asset = assets.find((a) => a.id === assetId);
      if (!asset) return;
      const newPlaced: PlacedHouseObject = {
        instanceId: `placed-${Date.now()}`,
        assetId: asset.id,
        name: asset.name,
        room,
        position,
        rotationY: 0,
        scale: 1.0,
        isActiveState: asset.interactionBehavior === 'toggle_light',
        surfaceName,
      };
      setPlacedObjects((prev) => [...prev, newPlaced]);
      setSelectedInstanceId(newPlaced.instanceId);
      setPlacingAssetId(null);
      showToast(`Placed "${asset.name}" on ${surfaceName} in ${room}.`);
    },
    [assets, showToast]
  );

  // Instant placement right in front of the human character
  const handlePlaceAtHuman = (assetId: string) => {
    const asset = assets.find((a) => a.id === assetId);
    if (!asset) return;
    const dropX = Number(
      (telemetry.x + Math.sin(telemetry.rotationY) * 0.9).toFixed(2)
    );
    const dropZ = Number(
      (telemetry.z + Math.cos(telemetry.rotationY) * 0.9).toFixed(2)
    );
    handlePlaceNewObject(
      assetId,
      [dropX, 0, dropZ],
      telemetry.currentRoom,
      `${telemetry.currentRoom} Floor`
    );
    soundFX.playPlaceObject();
  };

  const handleUpdatePlacedObject = useCallback(
    (instanceId: string, patch: Partial<PlacedHouseObject>) => {
      setPlacedObjects((prev) =>
        prev.map((obj) =>
          obj.instanceId === instanceId ? { ...obj, ...patch } : obj
        )
      );
    },
    []
  );

  const handleDeletePlacedObject = (instanceId: string) => {
    setPlacedObjects((prev) =>
      prev.filter((obj) => obj.instanceId !== instanceId)
    );
    if (selectedInstanceId === instanceId) setSelectedInstanceId(null);
    if (carriedInstanceId === instanceId) setCarriedInstanceId(null);
  };

  const handleDuplicatePlacedObject = (instanceId: string) => {
    const orig = placedObjects.find((p) => p.instanceId === instanceId);
    if (!orig) return;
    const copy: PlacedHouseObject = {
      ...orig,
      instanceId: `placed-${Date.now()}`,
      position: [
        Number((orig.position[0] + 0.45).toFixed(2)),
        orig.position[1],
        Number((orig.position[2] + 0.35).toFixed(2)),
      ],
    };
    setPlacedObjects((prev) => [...prev, copy]);
    setSelectedInstanceId(copy.instanceId);
    soundFX.playPlaceObject();
    showToast(`Duplicated "${orig.name}".`);
  };

  // Trigger 'E' Interaction on either a Scanned 3D Object or a Built-in House Fixture
  const handleTriggerInteraction = useCallback(
    (target: NearbyInteractable) => {
      if (target.type === 'fixture') {
        setFixtures((prev) =>
          prev.map((f) => {
            if (f.id !== target.id) return f;
            const nextState = !f.isActive;
            if (f.id === 'fixture-espresso') {
              soundFX.playInteractChime();
              showToast(
                'Brewed a hot double-shot espresso at the Kitchen Island!'
              );
            } else {
              soundFX.playSwitchToggle(nextState);
              showToast(
                `${f.name}: ${nextState ? 'Activated / Opened' : 'Turned Off / Closed'}`
              );
            }
            return { ...f, isActive: nextState };
          })
        );
      } else {
        // Scanned 3D Object interaction
        const placed = placedObjects.find((p) => p.instanceId === target.id);
        if (!placed) return;
        const asset = assets.find((a) => a.id === placed.assetId);
        if (!asset) return;

        if (asset.interactionBehavior === 'play_sound') {
          soundFX.playMelodyBox();
          handleUpdatePlacedObject(placed.instanceId, {
            isActiveState: !placed.isActiveState,
          });
          showToast(`Played interactive audio on "${placed.name}"!`);
        } else if (asset.interactionBehavior === 'toggle_light') {
          const next = !placed.isActiveState;
          soundFX.playSwitchToggle(next);
          handleUpdatePlacedObject(placed.instanceId, { isActiveState: next });
          showToast(
            `${placed.name} illumination ${next ? 'turned ON' : 'turned OFF'}.`
          );
        } else if (asset.interactionBehavior === 'spin_animate') {
          const next = !placed.isActiveState;
          soundFX.playInteractChime();
          handleUpdatePlacedObject(placed.instanceId, { isActiveState: next });
          showToast(
            `${placed.name} 360° turntable motion ${
              next ? 'started' : 'stopped'
            }.`
          );
        } else {
          soundFX.playInteractChime();
          setInspectInstanceId(placed.instanceId);
        }
      }
    },
    [assets, placedObjects, handleUpdatePlacedObject, showToast]
  );

  const handleTelemetryChange = useCallback(
    (newTel: HumanTelemetry, nearby: NearbyInteractable | null) => {
      setTelemetry(newTel);
      setNearbyInteractable(nearby);
    },
    []
  );

  const selectedPlaced = placedObjects.find(
    (p) => p.instanceId === selectedInstanceId
  );
  const selectedAsset = selectedPlaced
    ? assets.find((a) => a.id === selectedPlaced.assetId) || null
    : null;

  const inspectPlaced = placedObjects.find(
    (p) => p.instanceId === inspectInstanceId
  );
  const inspectAsset = inspectPlaced
    ? assets.find((a) => a.id === inspectPlaced.assetId) || null
    : null;

  return (
    <div className="relative w-screen h-screen overflow-hidden flex flex-col bg-slate-950 select-none">
      {/* =====================================================================
          TOP BAR CONTRACT (Single-Row, 3 Zones: Brand — Nav Controls — Actions)
          ===================================================================== */}
      <header className="z-30 flex items-center justify-between px-5 py-3 bg-slate-950/90 backdrop-blur-md border-b border-white/10 shrink-0">
        {/* Zone 1: Single Text Element Wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setCameraMode('follow');
          }}
          className="text-lg font-bold tracking-tight text-white font-display whitespace-nowrap"
        >
          HouseSim
        </a>

        {/* Zone 2: Clean Text Navigation Links (View & Environment Controls) */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-300">
          <button
            onClick={() => setCameraMode('follow')}
            className={`hover:text-white transition-colors whitespace-nowrap ${
              cameraMode === 'follow'
                ? 'text-amber-400 underline underline-offset-4'
                : ''
            }`}
          >
            Follow Human
          </button>
          <button
            onClick={() => setCameraMode('first_person')}
            className={`hover:text-white transition-colors whitespace-nowrap ${
              cameraMode === 'first_person'
                ? 'text-amber-400 underline underline-offset-4'
                : ''
            }`}
          >
            First-Person View
          </button>
          <button
            onClick={() => setCameraMode('orbit')}
            className={`hover:text-white transition-colors whitespace-nowrap ${
              cameraMode === 'orbit'
                ? 'text-amber-400 underline underline-offset-4'
                : ''
            }`}
          >
            Dollhouse Orbit
          </button>
          <button
            onClick={() =>
              setWallCutaway((prev) =>
                prev === 'auto' ? 'down' : prev === 'down' ? 'full' : 'auto'
              )
            }
            className="hover:text-white transition-colors whitespace-nowrap"
          >
            Walls: {wallCutaway === 'auto' ? 'Smart Cutaway' : wallCutaway === 'down' ? 'Lowered' : 'Full Height'}
          </button>
          <button
            onClick={() =>
              setTimeOfDay((prev) =>
                prev === 'day' ? 'sunset' : prev === 'sunset' ? 'night' : 'day'
              )
            }
            className="hover:text-white transition-colors whitespace-nowrap"
          >
            Lighting: {timeOfDay === 'day' ? 'Daylight' : timeOfDay === 'sunset' ? 'Sunset' : 'Night'}
          </button>
        </nav>

        {/* Zone 3: 2 Primary Actions */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setScannerOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-500 rounded-lg hover:bg-amber-400 transition-colors whitespace-nowrap shadow-sm"
          >
            <Camera className="w-3.5 h-3.5" />
            Scan Object (Cam / Video)
          </button>
          <button
            onClick={() => setCloudflareOpen(true)}
            className="px-3.5 py-2 text-xs font-medium text-slate-200 bg-slate-900 border border-white/15 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap"
          >
            Cloudflare & Chromebook
          </button>
        </div>
      </header>

      {/* =====================================================================
          MAIN 3D VIEWPORT & SEMANTIC DOM OVERLAY HUD
          ===================================================================== */}
      <main className="relative flex-1 w-full h-full overflow-hidden">
        <VirtualHouseCanvas
          assets={assets}
          placedObjects={placedObjects}
          fixtures={fixtures}
          selectedInstanceId={selectedInstanceId}
          placingAssetId={placingAssetId}
          carriedInstanceId={carriedInstanceId}
          cameraMode={cameraMode}
          timeOfDay={timeOfDay}
          wallCutaway={wallCutaway}
          lowPowerChromebookMode={lowPowerChromebookMode}
          virtualMoveInput={virtualMoveInput}
          onSelectInstance={setSelectedInstanceId}
          onPlaceNewObject={handlePlaceNewObject}
          onUpdatePlacedObject={handleUpdatePlacedObject}
          onTriggerInteraction={handleTriggerInteraction}
          onToggleCarry={setCarriedInstanceId}
          onTelemetryChange={handleTelemetryChange}
        />

        {/* TOP-LEFT HUD: Current Room Location & Quick Environment Toggles */}
        <div className="pointer-events-auto absolute top-4 left-4 z-10 flex flex-col gap-2">
          <div className="bg-slate-950/75 backdrop-blur-md border border-white/10 rounded-xl px-4 py-2.5 shadow-lg">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="font-semibold text-white">
                {telemetry.currentRoom}
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono text-slate-300">
                X:{telemetry.x.toFixed(1)}m Z:{telemetry.z.toFixed(1)}m
              </span>
              <span aria-hidden="true">·</span>
              <span>{placedObjects.length} objects in house</span>
            </div>
          </div>

          {/* Placement Mode Active Notice */}
          {placingAssetId && (
            <div className="bg-amber-500/95 text-slate-950 rounded-xl px-4 py-2.5 shadow-xl flex items-center justify-between gap-3">
              <div className="text-xs font-semibold">
                Placement Mode: Click any floor, table, desk, or counter in the
                3D house
              </div>
              <button
                onClick={() => setPlacingAssetId(null)}
                className="px-2.5 py-1 rounded bg-slate-950/20 hover:bg-slate-950/30 text-xs font-bold whitespace-nowrap"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* TOP-RIGHT HUD: Audio Mute & Touch D-Pad Toggle for Convertible Chromebooks */}
        <div className="pointer-events-auto absolute top-4 right-4 z-10 flex items-center gap-2">
          <button
            onClick={() => setShowTouchPad((p) => !p)}
            className={`px-3 py-2 rounded-xl text-xs font-medium border transition-colors whitespace-nowrap ${
              showTouchPad
                ? 'bg-amber-500 text-slate-950 border-amber-400 font-semibold'
                : 'bg-slate-950/75 backdrop-blur-md text-slate-200 border-white/10 hover:bg-slate-900'
            }`}
          >
            Touch D-Pad
          </button>
          <button
            onClick={() => {
              const next = !muted;
              setMuted(next);
              soundFX.muted = next;
            }}
            className="p-2 rounded-xl bg-slate-950/75 backdrop-blur-md border border-white/10 text-slate-200 hover:text-white transition-colors"
            aria-label="Toggle sound"
          >
            {muted ? (
              <VolumeX className="w-4 h-4 text-slate-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-amber-400" />
            )}
          </button>
        </div>

        {/* TOAST FEEDBACK BANNER */}
        {interactionToast && (
          <div className="pointer-events-none absolute top-16 left-1/2 -translate-x-1/2 z-20 bg-slate-950/90 backdrop-blur-md border border-amber-500/40 text-amber-200 px-4 py-2 rounded-xl text-xs font-medium shadow-xl">
            {interactionToast}
          </div>
        )}

        {/* ===================================================================
            PROXIMITY [E] INTERACTION & [G] CARRY PROMPT HUD
            =================================================================== */}
        {(nearbyInteractable || carriedInstanceId) && (
          <div className="pointer-events-auto absolute bottom-40 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2.5 bg-slate-950/85 backdrop-blur-md border border-emerald-500/40 px-4 py-2.5 rounded-2xl shadow-2xl">
            {carriedInstanceId ? (
              <>
                <span className="text-xs text-slate-200">
                  Carrying object in hands · Walk anywhere and press{' '}
                  <kbd className="px-1.5 py-0.5 bg-amber-500 text-slate-950 font-mono font-bold rounded">
                    E
                  </kbd>{' '}
                  to place down
                </span>
                <button
                  onClick={() => {
                    const dropX = Number(
                      (
                        telemetry.x +
                        Math.sin(telemetry.rotationY) * 0.85
                      ).toFixed(2)
                    );
                    const dropZ = Number(
                      (
                        telemetry.z +
                        Math.cos(telemetry.rotationY) * 0.85
                      ).toFixed(2)
                    );
                    handleUpdatePlacedObject(carriedInstanceId, {
                      position: [dropX, 0, dropZ],
                      room: telemetry.currentRoom,
                      surfaceName: `${telemetry.currentRoom} Floor`,
                    });
                    setCarriedInstanceId(null);
                    soundFX.playPlaceObject();
                  }}
                  className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs whitespace-nowrap"
                >
                  Drop Here [E]
                </button>
              </>
            ) : (
              nearbyInteractable && (
                <>
                  <div className="flex flex-col pr-2">
                    <span className="text-xs font-semibold text-white">
                      {nearbyInteractable.name}
                    </span>
                    <span className="text-[11px] text-emerald-300">
                      {nearbyInteractable.prompt} ({nearbyInteractable.distance}m)
                    </span>
                  </div>

                  <button
                    onClick={() => handleTriggerInteraction(nearbyInteractable)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs transition-colors whitespace-nowrap"
                  >
                    <kbd className="px-1.5 py-0.5 bg-slate-950/20 rounded font-mono font-bold">
                      E
                    </kbd>
                    Interact
                  </button>

                  {nearbyInteractable.canPickUp && (
                    <button
                      onClick={() => {
                        setCarriedInstanceId(nearbyInteractable.id);
                        soundFX.playPlaceObject();
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs border border-white/10 transition-colors whitespace-nowrap"
                    >
                      <kbd className="px-1.5 py-0.5 bg-slate-950 rounded font-mono text-amber-400">
                        G
                      </kbd>
                      Carry
                    </button>
                  )}
                </>
              )
            )}
          </div>
        )}

        {/* ===================================================================
            SELECTED PLACED OBJECT TRANSFORM INSPECTOR (Right Floating Card)
            =================================================================== */}
        {selectedPlaced && selectedAsset && (
          <div className="pointer-events-auto absolute top-16 right-4 z-20 w-72 bg-slate-950/85 backdrop-blur-md border border-white/15 rounded-2xl p-4 shadow-2xl space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-white font-display">
                  {selectedPlaced.name}
                </h3>
                <div className="text-[11px] text-slate-400">
                  {selectedPlaced.surfaceName} · {selectedPlaced.room}
                </div>
              </div>
              <button
                onClick={() => setSelectedInstanceId(null)}
                className="text-xs text-slate-400 hover:text-white px-1.5 py-0.5"
              >
                Close
              </button>
            </div>

            {/* Rotation & Scale Sliders */}
            <div className="space-y-2 pt-1 border-t border-white/10 text-xs">
              <div>
                <div className="flex justify-between text-slate-400 mb-1">
                  <span>Rotation [R]</span>
                  <span className="font-mono">
                    {Math.round((selectedPlaced.rotationY * 180) / Math.PI)}°
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={6.28}
                  step={0.15}
                  value={selectedPlaced.rotationY}
                  onChange={(e) =>
                    handleUpdatePlacedObject(selectedPlaced.instanceId, {
                      rotationY: Number(e.target.value),
                    })
                  }
                  className="w-full accent-amber-500"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-400 mb-1">
                  <span>3D Scale</span>
                  <span className="font-mono">
                    {selectedPlaced.scale.toFixed(2)}x
                  </span>
                </div>
                <input
                  type="range"
                  min={0.5}
                  max={2.2}
                  step={0.05}
                  value={selectedPlaced.scale}
                  onChange={(e) =>
                    handleUpdatePlacedObject(selectedPlaced.instanceId, {
                      scale: Number(e.target.value),
                    })
                  }
                  className="w-full accent-amber-500"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() =>
                  setInspectInstanceId(selectedPlaced.instanceId)
                }
                className="flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 transition-colors whitespace-nowrap"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Inspect 3D
              </button>
              <button
                onClick={() => {
                  setCarriedInstanceId(selectedPlaced.instanceId);
                  soundFX.playPlaceObject();
                }}
                className="flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 transition-colors whitespace-nowrap"
              >
                <Hand className="w-3.5 h-3.5 text-emerald-400" />
                Carry [G]
              </button>
              <button
                onClick={() =>
                  handleDuplicatePlacedObject(selectedPlaced.instanceId)
                }
                className="flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 transition-colors whitespace-nowrap"
              >
                <Copy className="w-3.5 h-3.5" />
                Duplicate
              </button>
              <button
                onClick={() =>
                  handleDeletePlacedObject(selectedPlaced.instanceId)
                }
                className="flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-xs text-rose-300 border border-rose-500/30 transition-colors whitespace-nowrap"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Remove
              </button>
            </div>
          </div>
        )}

        {/* OPTIONAL ON-SCREEN TOUCH D-PAD FOR CONVERTIBLE CHROMEBOOKS */}
        {showTouchPad && (
          <div className="pointer-events-auto absolute bottom-40 right-6 z-20 bg-slate-950/80 backdrop-blur-md border border-white/15 p-3 rounded-2xl flex flex-col items-center gap-1.5 shadow-xl">
            <button
              onPointerDown={() => setVirtualMoveInput({ x: 0, z: 1 })}
              onPointerUp={() => setVirtualMoveInput({ x: 0, z: 0 })}
              onPointerLeave={() => setVirtualMoveInput({ x: 0, z: 0 })}
              className="w-11 h-11 rounded-xl bg-slate-800 active:bg-amber-500 active:text-slate-950 flex items-center justify-center text-white"
            >
              <ArrowUp className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-1.5">
              <button
                onPointerDown={() => setVirtualMoveInput({ x: -1, z: 0 })}
                onPointerUp={() => setVirtualMoveInput({ x: 0, z: 0 })}
                onPointerLeave={() => setVirtualMoveInput({ x: 0, z: 0 })}
                className="w-11 h-11 rounded-xl bg-slate-800 active:bg-amber-500 active:text-slate-950 flex items-center justify-center text-white"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => {
                  if (nearbyInteractable) {
                    handleTriggerInteraction(nearbyInteractable);
                  }
                }}
                className="w-11 h-11 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs flex items-center justify-center"
              >
                E
              </button>
              <button
                onPointerDown={() => setVirtualMoveInput({ x: 1, z: 0 })}
                onPointerUp={() => setVirtualMoveInput({ x: 0, z: 0 })}
                onPointerLeave={() => setVirtualMoveInput({ x: 0, z: 0 })}
                className="w-11 h-11 rounded-xl bg-slate-800 active:bg-amber-500 active:text-slate-950 flex items-center justify-center text-white"
              >
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
            <button
              onPointerDown={() => setVirtualMoveInput({ x: 0, z: -1 })}
              onPointerUp={() => setVirtualMoveInput({ x: 0, z: 0 })}
              onPointerLeave={() => setVirtualMoveInput({ x: 0, z: 0 })}
              className="w-11 h-11 rounded-xl bg-slate-800 active:bg-amber-500 active:text-slate-950 flex items-center justify-center text-white"
            >
              <ArrowDown className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* ===================================================================
            BOTTOM DOCK: SCANNED 3D OBJECTS LIBRARY & CONTROLS HELPER
            =================================================================== */}
        <div className="pointer-events-auto absolute bottom-4 left-4 right-4 z-10 flex flex-col lg:flex-row items-stretch lg:items-end justify-between gap-3">
          {/* Scanned Objects Dock */}
          <div className="bg-slate-950/80 backdrop-blur-md border border-white/10 rounded-2xl p-3 shadow-2xl flex-1 max-w-4xl overflow-hidden">
            <div className="flex items-center justify-between mb-2 px-1">
              <div className="flex items-center gap-2 text-xs">
                <span className="font-semibold text-white">
                  Scanned 3D Object Library
                </span>
                <span aria-hidden="true" className="text-slate-500">
                  ·
                </span>
                <span className="text-slate-400">
                  Click any scanned item to freely place it on floors, tables,
                  counters, or shelves
                </span>
              </div>
              <button
                onClick={() => setScannerOpen(true)}
                className="flex items-center gap-1 text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                Scan New Object
              </button>
            </div>

            <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
              {assets.map((asset) => {
                const isPlacing = placingAssetId === asset.id;
                return (
                  <div
                    key={asset.id}
                    className={`flex items-center gap-2.5 p-2 rounded-xl border transition-colors shrink-0 ${
                      isPlacing
                        ? 'bg-amber-500/20 border-amber-400'
                        : 'bg-slate-900/90 border-white/10 hover:border-white/25'
                    }`}
                  >
                    <div className="w-11 h-11 rounded-lg bg-slate-950 border border-white/10 p-1 shrink-0 flex items-center justify-center">
                      <img
                        src={asset.textureDataUrl}
                        alt={asset.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="min-w-[115px] max-w-[140px]">
                      <div className="text-xs font-semibold text-white truncate">
                        {asset.name}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">
                        {asset.category} · {asset.shapeMode}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <button
                          onClick={() =>
                            setPlacingAssetId(isPlacing ? null : asset.id)
                          }
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors whitespace-nowrap ${
                            isPlacing
                              ? 'bg-amber-500 text-slate-950'
                              : 'bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-200'
                          }`}
                        >
                          {isPlacing ? 'Placing...' : 'Place Cursor'}
                        </button>
                        <button
                          onClick={() => handlePlaceAtHuman(asset.id)}
                          className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-amber-300 transition-colors whitespace-nowrap"
                          title="Drop directly in front of the human character"
                        >
                          At Human
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Discreet Controls Helper Card */}
          <div className="hidden xl:flex flex-col justify-center bg-slate-950/80 backdrop-blur-md border border-white/10 rounded-2xl px-4 py-3 text-xs text-slate-300 shrink-0 space-y-1">
            <div className="flex items-center gap-2">
              <kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono text-[11px] text-white">
                W A S D
              </kbd>
              <span>or</span>
              <kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono text-[11px] text-white">
                Arrows
              </kbd>
              <span className="text-slate-400">Move Human</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-1.5 py-0.5 bg-emerald-500/20 border border-emerald-500/40 rounded font-mono text-[11px] text-emerald-300">
                E
              </kbd>
              <span className="text-slate-400">Interact with Object</span>
              <span aria-hidden="true">·</span>
              <kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono text-[11px] text-amber-300">
                G
              </kbd>
              <span className="text-slate-400">Carry</span>
            </div>
            <div className="text-[11px] text-slate-400">
              Drag mouse/trackpad to orbit · Scroll to zoom
            </div>
          </div>
        </div>
      </main>

      {/* =====================================================================
          MODALS: 3D SCANNER STUDIO, OBJECT INSPECTOR, CLOUDFLARE & CHROMEBOOK
          ===================================================================== */}
      <ScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onSaveScannedAsset={handleSaveScannedAsset}
      />

      <ObjectInspectModal
        placed={inspectPlaced || null}
        asset={inspectAsset}
        onClose={() => setInspectInstanceId(null)}
        onPickUp={(id) => {
          setCarriedInstanceId(id);
          soundFX.playPlaceObject();
        }}
        onToggleState={(id) => {
          const obj = placedObjects.find((p) => p.instanceId === id);
          if (obj) {
            handleUpdatePlacedObject(id, { isActiveState: !obj.isActiveState });
            soundFX.playSwitchToggle(!obj.isActiveState);
          }
        }}
      />

      <CloudflareModal
        isOpen={cloudflareOpen}
        onClose={() => setCloudflareOpen(false)}
        lowPowerChromebookMode={lowPowerChromebookMode}
        onToggleLowPowerMode={() => setLowPowerChromebookMode((p) => !p)}
        assets={assets}
        placedObjects={placedObjects}
        onImportScene={(importedAssets, importedPlaced) => {
          setAssets(importedAssets);
          setPlacedObjects(importedPlaced);
          showToast('Imported HouseSim 3D scene and scanned object library!');
        }}
      />
    </div>
  );
}
