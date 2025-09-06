"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Event = {
  id: string;
  title: string;
  type: "moon" | "meteor" | "eclipse" | "launch" | "other";
  startAt: string;
  visibility?: string | null;
  positionX?: number | null;
  positionY?: number | null;
};

const typeToColor: Record<Event["type"], string> = {
  moon: "text-blue-300",
  meteor: "text-yellow-300",
  eclipse: "text-orange-400",
  launch: "text-red-400",
  other: "text-slate-300",
};

export default function CosmicMap() {
  const [events, setEvents] = useState<Event[]>([]);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetch("/api/events")
      .then((r) => r.json())
      .then((data) => setEvents(data))
      .catch(() => setEvents([]));
  }, []);

  const center = useMemo(() => {
    const el = containerRef.current;
    if (!el) return { x: 0, y: 0 };
    const rect = el.getBoundingClientRect();
    return { x: rect.width / 2, y: rect.height / 2 };
  }, []);

  return (
    <div ref={containerRef} id="cosmic-map" className="w-full h-full relative">
      {events.map((event) => {
        const color = typeToColor[event.type] || "text-slate-300";
        const left = center.x + (event.positionX ?? 0);
        const top = center.y + (event.positionY ?? 0);
        return (
          <div
            key={event.id}
            className={`event-node absolute cursor-pointer ${color}`}
            style={{ left: `${left}px`, top: `${top}px` }}
          >
            <div className="w-4 h-4 rounded-full bg-current" />
            <div className="event-tooltip absolute left-full ml-2 p-4 rounded-lg w-64 hidden">
              <h3 className="font-bold text-lg">{event.title}</h3>
              <p className="text-sm opacity-80">
                {new Date(event.startAt).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
              {event.visibility ? (
                <p className="text-xs mt-2">Visible: {event.visibility}</p>
              ) : null}
              <button className={`mt-3 px-3 py-1 rounded text-xs hover:opacity-80 transition ${color.replace("text", "bg")}`}>
                Set Reminder
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}


