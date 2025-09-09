"use client";

import { useEffect, useState } from "react";
import SolarSystemBg from "@/components/SolarSystemBg";
import CosmicMap from "@/components/CosmicMap";
import { Settings, Calendar } from "react-feather";

export default function HomePage() {
  useEffect(() => {
    // page init side-effects can go here if needed
  }, []);

  return (
    <div className="bg-slate-900 text-white overflow-hidden h-screen">
      <div className="absolute inset-0 z-0">
        <SolarSystemBg />
      </div>

      <div className="relative z-10 h-screen flex flex-col">
        <header className="p-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-500">
            Cosmic Events Explorer
          </h1>
          <div className="flex space-x-4 items-center">
            <button aria-label="Calendar" className="px-4 py-2 rounded-full bg-slate-800 hover:bg-slate-700 transition">
              <Calendar size={18} />
            </button>
            <button aria-label="Settings" className="px-4 py-2 rounded-full bg-slate-800 hover:bg-slate-700 transition">
              <Settings size={18} />
            </button>
      </div>
        </header>

        <main className="flex-1 relative overflow-hidden">
          <CosmicMap />
        </main>
      </div>
    </div>
  );
}
