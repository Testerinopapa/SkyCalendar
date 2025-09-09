"use client";

type PlanetInfo = {
  name: string;
  color: number;
  orbitRadiusPx: number;
  orbitalPeriodDays: number;
};

export default function PlanetInfoCard({ planet, onClose }: { planet: PlanetInfo; onClose: () => void }) {
  const colorHex = `#${planet.color.toString(16).padStart(6, "0")}`;
  return (
    <div
      className="absolute bottom-6 left-6 bg-slate-900/90 border border-slate-700/60 rounded-xl p-4 text-sm text-slate-200 max-w-sm z-30 shadow-lg backdrop-blur-sm"
      role="dialog"
      aria-labelledby="planet-title"
      aria-modal="false"
    >
      <div className="flex items-center justify-between mb-2">
        <div id="planet-title" className="font-semibold text-base flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: colorHex }} />
          {planet.name}
        </div>
        <button
          onClick={onClose}
          className="px-2 py-1 text-xs rounded bg-slate-700 hover:bg-slate-600 text-slate-100"
          aria-label="Close info"
        >
          Close
        </button>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        <div className="opacity-80">Orbit radius</div>
        <div>{planet.orbitRadiusPx} px</div>
        <div className="opacity-80">Orbital period</div>
        <div>{planet.orbitalPeriodDays} days</div>
      </div>
    </div>
  );
}


