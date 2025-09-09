"use client";

import PlanetInfoCard from "@/components/PlanetInfoCard";
import { useState } from "react";

export default function DebugCardPage() {
  const [open, setOpen] = useState(true);
  const planet = { name: "Earth", color: 0x3b82f6, orbitRadiusPx: 120, orbitalPeriodDays: 365 };
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4">
      <h1 className="text-lg font-semibold mb-3">PlanetInfoCard Debug</h1>
      <button className="px-2 py-1 text-xs rounded bg-slate-700 hover:bg-slate-600" onClick={() => setOpen((v) => !v)}>
        {open ? "Hide" : "Show"} Card
      </button>
      <div className="relative mt-4 h-[70vh] border border-slate-700 rounded">
        {open && (
          <div className="absolute left-4 bottom-4">
            <PlanetInfoCard planet={planet} onClose={() => setOpen(false)} />
          </div>
        )}
      </div>
    </div>
  );
}


