"use client";

import { useEffect, useMemo, useState } from "react";
import VantaBg from "@/components/VantaBg";
import CosmicMap from "@/components/CosmicMap";
import { Settings, Calendar, Eye } from "react-feather";

type Event = {
  id: string;
  title: string;
  type: "moon" | "meteor" | "eclipse" | "launch" | "other";
  startAt: string;
};

export default function HomePage() {
  const [nextEvent, setNextEvent] = useState<Event | null>(null);

  useEffect(() => {
    fetch("/api/events/next")
      .then((r) => r.json())
      .then(setNextEvent)
      .catch(() => setNextEvent(null));
  }, []);

  const countdown = useMemo(() => {
    if (!nextEvent) return null;
    const target = new Date(nextEvent.startAt).getTime();
    const now = Date.now();
    const diff = Math.max(0, target - now);
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    return { days, hours, minutes };
  }, [nextEvent]);

  return (
    <div className="bg-slate-900 text-white overflow-hidden h-screen">
      <div className="absolute inset-0 z-0">
        <VantaBg />
      </div>

      <div className="relative z-10 h-screen flex flex-col">
        <header className="p-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-500">
            Cosmic Events Explorer
          </h1>
          <div className="flex space-x-4">
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

        <div className="absolute bottom-6 left-6 right-6 bg-slate-800/80 rounded-xl p-4 backdrop-blur-sm border border-slate-700/50">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-lg">{nextEvent ? `Next: ${nextEvent.title}` : "Next Event"}</h3>
              <p className="text-sm opacity-80">
                {nextEvent ? new Date(nextEvent.startAt).toLocaleString() : "—"}
              </p>
            </div>
            <div className="text-xl font-mono">
              {countdown ? (
                <>
                  <span>{String(countdown.days).padStart(2, "0")}</span>d 
                  <span>{String(countdown.hours).padStart(2, "0")}</span>h 
                  <span>{String(countdown.minutes).padStart(2, "0")}</span>m
                </>
              ) : (
                <span>--d --h --m</span>
              )}
            </div>
            <button className="px-4 py-2 bg-purple-600 rounded-lg hover:bg-purple-500 transition flex items-center">
              <Eye size={16} className="mr-2" /> View Details
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
