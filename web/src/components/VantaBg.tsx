"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import NET from "vanta/dist/vanta.net.min";

export default function VantaBg() {
  const ref = useRef<HTMLDivElement | null>(null);
  const vantaRef = useRef<any>(null);

  useEffect(() => {
    if (!ref.current) return;
    vantaRef.current = NET({
      el: ref.current,
      THREE,
      mouseControls: true,
      touchControls: true,
      gyroControls: false,
      minHeight: 200.0,
      minWidth: 200.0,
      scale: 1.0,
      scaleMobile: 1.0,
      color: 0x3b82f6,
      backgroundColor: 0x020617,
      points: 12.0,
      maxDistance: 22.0,
      spacing: 18.0,
    });
    return () => {
      try { vantaRef.current?.destroy?.(); } catch {}
      vantaRef.current = null;
    };
  }, []);

  return <div ref={ref} className="absolute inset-0 z-0" aria-hidden />;
}


