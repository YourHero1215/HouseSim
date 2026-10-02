import React, { useState } from 'react';
import {
  X,
  Cloud,
  Laptop,
  Download,
  Upload,
  Check,
  Copy,
  Cpu,
} from 'lucide-react';
import { PlacedHouseObject, ScannedObjectAsset } from '../types/housesim';

interface CloudflareModalProps {
  isOpen: boolean;
  onClose: () => void;
  lowPowerChromebookMode: boolean;
  onToggleLowPowerMode: () => void;
  assets: ScannedObjectAsset[];
  placedObjects: PlacedHouseObject[];
  onImportScene: (
    assets: ScannedObjectAsset[],
    placedObjects: PlacedHouseObject[]
  ) => void;
}

export const CloudflareModal: React.FC<CloudflareModalProps> = ({
  isOpen,
  onClose,
  lowPowerChromebookMode,
  onToggleLowPowerMode,
  assets,
  placedObjects,
  onImportScene,
}) => {
  const [copiedCmd, setCopiedCmd] = useState(false);

  if (!isOpen) return null;

  const handleCopyCommand = () => {
    navigator.clipboard.writeText('npm run deploy:cf');
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  const handleExportScene = () => {
    const payload = JSON.stringify(
      {
        app: 'HouseSim',
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        assets,
        placedObjects,
      },
      null,
      2
    );
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `housesim-scene-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportSceneFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        if (
          Array.isArray(parsed.assets) &&
          Array.isArray(parsed.placedObjects)
        ) {
          onImportScene(parsed.assets, parsed.placedObjects);
          onClose();
        }
      } catch {
        // Ignore invalid JSON
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="w-full max-w-2xl bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <Cloud className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold text-white font-display">
              Cloudflare Workers & Chromebook Settings
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Chromebook Optimization Section */}
          <div className="bg-slate-950/70 border border-white/10 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Laptop className="w-4 h-4 text-emerald-400" />
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    Chromebook Hardware Optimization
                  </h3>
                  <p className="text-xs text-slate-400">
                    100% client-side WebGL & Canvas CV pipeline with zero server
                    GPU dependency
                  </p>
                </div>
              </div>
              <button
                onClick={onToggleLowPowerMode}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                  lowPowerChromebookMode
                    ? 'bg-emerald-500 text-slate-950'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {lowPowerChromebookMode
                  ? 'Chromebook Eco FPS: ON'
                  : 'Enable Eco FPS Mode'}
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-2 border-t border-white/5 text-xs">
              <div>
                <span className="text-slate-400 block">Camera Pipeline</span>
                <span className="text-slate-200 font-medium">
                  Front / World Webcam + Video
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Input Controls</span>
                <span className="text-slate-200 font-medium">
                  WASD / Arrows / Touch D-Pad
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Storage</span>
                <span className="text-slate-200 font-medium">
                  Local Browser + JSON Bundle
                </span>
              </div>
            </div>
          </div>

          {/* Cloudflare Workers Deployment Section */}
          <div className="bg-slate-950/70 border border-white/10 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-semibold text-white">
                  Ready to Publish on Cloudflare Workers
                </h3>
              </div>
              <span className="text-xs font-mono text-emerald-400">
                wrangler.jsonc + worker.ts configured
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              HouseSim includes a pre-configured{' '}
              <code className="text-amber-300 font-mono">wrangler.jsonc</code>{' '}
              and edge{' '}
              <code className="text-amber-300 font-mono">worker.ts</code> entry
              point with SPA asset bindings and camera permissions headers. Run
              the command below to build and publish directly to Cloudflare
              Workers:
            </p>

            <div className="flex items-center justify-between bg-slate-900 border border-white/10 rounded-lg px-3.5 py-2.5 font-mono text-xs text-amber-300">
              <span>npm run deploy:cf</span>
              <button
                onClick={handleCopyCommand}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs transition-colors"
              >
                {copiedCmd ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copy
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Export / Import House Scene Bundle */}
          <div className="bg-slate-950/70 border border-white/10 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-white">
                Scene & Scanned Objects Backup (.json)
              </h3>
              <p className="text-xs text-slate-400">
                Export your scanned 3D objects and room layout or load a saved
                house file
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportScene}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-white border border-white/10 transition-colors whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5 text-amber-400" />
                Export House
              </button>
              <label className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-white border border-white/10 cursor-pointer transition-colors whitespace-nowrap">
                <Upload className="w-3.5 h-3.5 text-emerald-400" />
                Import House
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportSceneFile}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
