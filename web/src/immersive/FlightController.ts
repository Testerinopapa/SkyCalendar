import * as THREE from "three";

export type PlanetInfo = { center: THREE.Vector3; radius: number };
export type FlightOutputs = {
  mode: 'system' | 'toImmersive' | 'immersive' | 'toSystem';
  desiredPosition: THREE.Vector3;
  desiredTarget: THREE.Vector3;
  starOpacity: number; // 0..1
  groundOcclusion: number; // 0..1
};

type GetPlanetInfo = (planetName: string) => PlanetInfo | null;

export default class FlightController {
  private readonly getPlanetInfo: GetPlanetInfo;
  private readonly worldUp: THREE.Vector3;

  private mode: 'system' | 'toImmersive' | 'immersive' | 'toSystem' = 'system';
  private planetName: string | null = null;
  private t = 0;
  private durationSec = 1.4;

  private startPos = new THREE.Vector3();
  private startTarget = new THREE.Vector3();
  private midPos = new THREE.Vector3();
  private midTarget = new THREE.Vector3();
  private endPos = new THREE.Vector3();
  private endTarget = new THREE.Vector3();

  private savedSystemPos = new THREE.Vector3();
  private savedSystemTarget = new THREE.Vector3();
  private planetCenter = new THREE.Vector3();
  private planetRadius = 5;

  constructor(getPlanetInfo: GetPlanetInfo, worldUp: THREE.Vector3 = new THREE.Vector3(0, 1, 0)) {
    this.getPlanetInfo = getPlanetInfo;
    this.worldUp = worldUp.clone();
  }

  public getMode() { return this.mode; }
  public isActive() { return this.mode === 'toImmersive' || this.mode === 'immersive' || this.mode === 'toSystem'; }

  public enterImmersive(planetName: string, cameraPos: THREE.Vector3, cameraTarget: THREE.Vector3) {
    const info = this.getPlanetInfo(planetName);
    if (!info) return;
    this.planetName = planetName;
    this.savedSystemPos.copy(cameraPos);
    this.savedSystemTarget.copy(cameraTarget);
    this.computePath(info);
    this.startPos.copy(cameraPos);
    this.startTarget.copy(cameraTarget);
    const dist = this.startPos.distanceTo(this.midPos) + this.midPos.distanceTo(this.endPos);
    this.durationSec = THREE.MathUtils.clamp(dist * 0.004, 0.9, 2.2);
    this.t = 0;
    this.mode = 'toImmersive';
  }

  public exitImmersive(cameraPos: THREE.Vector3, cameraTarget: THREE.Vector3) {
    this.startPos.copy(cameraPos);
    this.startTarget.copy(cameraTarget);
    this.endPos.copy(this.savedSystemPos);
    this.endTarget.copy(this.savedSystemTarget);
    const dist = this.startPos.distanceTo(this.endPos);
    this.durationSec = THREE.MathUtils.clamp(dist * 0.004, 0.8, 2.0);
    this.t = 0;
    this.mode = 'toSystem';
  }

  public update(deltaSec: number): FlightOutputs | null {
    if (this.mode === 'system') return null;

    const info = this.planetName ? this.getPlanetInfo(this.planetName) : null;
    if (!info) return null;
    this.planetCenter.copy(info.center);
    this.planetRadius = info.radius;

    this.t = Math.min(1, this.t + (deltaSec / this.durationSec));
    const k = this.easeInOutCubic(this.t);

    const desiredPosition = new THREE.Vector3();
    const desiredTarget = new THREE.Vector3();

    if (this.mode === 'toImmersive') {
      const split = 0.6;
      if (k < split) {
        const k1 = this.easeInOutCubic(k / split);
        desiredPosition.copy(this.startPos).lerp(this.midPos, k1);
        desiredTarget.copy(this.startTarget).lerp(this.midTarget, k1);
      } else {
        const k2 = this.easeInOutCubic((k - split) / (1 - split));
        desiredPosition.copy(this.midPos).lerp(this.endPos, k2);
        desiredTarget.copy(this.midTarget).lerp(this.endTarget, k2);
      }
      if (this.t >= 1) this.mode = 'immersive';
    } else if (this.mode === 'immersive') {
      // Recompute end in case the planet moved (low drift)
      if (this.planetName && info) {
        this.computePath(info);
      }
      desiredPosition.copy(this.endPos);
      desiredTarget.copy(this.endTarget);
    } else if (this.mode === 'toSystem') {
      desiredPosition.copy(this.startPos).lerp(this.endPos, k);
      desiredTarget.copy(this.startTarget).lerp(this.endTarget, k);
      if (this.t >= 1) {
        this.mode = 'system';
        this.planetName = null;
      }
    }

    const altitude = desiredPosition.distanceTo(this.planetCenter) - this.planetRadius;
    const starOpacity = THREE.MathUtils.smoothstep(altitude, 0, this.planetRadius * 4) * 0.95;
    const groundOcclusion = 1 - THREE.MathUtils.smoothstep(altitude, 0, this.planetRadius * 1.2);

    return { mode: this.mode, desiredPosition, desiredTarget, starOpacity, groundOcclusion };
  }

  private computePath(info: PlanetInfo) {
    const { center, radius } = info;
    this.planetCenter.copy(center);
    this.planetRadius = radius;

    const poleUp = this.worldUp.clone().normalize();
    let east = new THREE.Vector3().crossVectors(poleUp, center.clone().normalize());
    if (east.lengthSq() < 1e-6) east.set(1, 0, 0);
    east.normalize();

    const nearHeight = Math.max(radius * 0.015, 0.2);
    const nearLook = radius * 2.2;
    const endHeight = Math.max(radius * 8, 28);
    const endSide = radius * 0.8;
    const endLook = radius * 7.0;

    this.midPos.copy(center).addScaledVector(poleUp, nearHeight);
    this.midTarget.copy(this.midPos).addScaledVector(east, nearLook).addScaledVector(poleUp, -radius * 0.25);

    this.endPos.copy(center).addScaledVector(poleUp, endHeight).addScaledVector(east, -endSide);
    this.endTarget.copy(this.endPos).addScaledVector(east, endLook * 0.6).addScaledVector(poleUp, radius * 0.3);
  }

  private easeInOutCubic(x: number) {
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  }
}

import * as THREE from "three";

export type CameraMode = 'system' | 'toImmersive' | 'immersive' | 'toSystem';

export type PlanetInfo = {
  worldPos: THREE.Vector3;
  radiusPx: number;
};

export type GetPlanetInfo = (name: string) => PlanetInfo | null;

export class FlightController {
  private getPlanetInfo: GetPlanetInfo;
  private mode: CameraMode = 'system';
  private planetName: string | null = null;
  private t = 0;
  private duration = 1.6;

  private startPos = new THREE.Vector3();
  private startTarget = new THREE.Vector3();
  private savedSystemPos = new THREE.Vector3();
  private savedSystemTarget = new THREE.Vector3();

  private midPos = new THREE.Vector3();
  private midTarget = new THREE.Vector3();
  private endPos = new THREE.Vector3();
  private endTarget = new THREE.Vector3();

  private desiredPos = new THREE.Vector3();
  private desiredTarget = new THREE.Vector3();

  private planetCenter = new THREE.Vector3();
  private planetRadius = 5;

  private starFade = 1;
  private groundOcclusion = 0;

  constructor(getPlanetInfo: GetPlanetInfo) {
    this.getPlanetInfo = getPlanetInfo;
  }

  public isActive(): boolean {
    return this.mode === 'toImmersive' || this.mode === 'immersive';
  }

  public getMode(): CameraMode {
    return this.mode;
  }

  public getOutputs() {
    return {
      desiredPos: this.desiredPos,
      desiredTarget: this.desiredTarget,
      starFade: this.starFade,
      groundOcclusion: this.groundOcclusion,
      mode: this.mode as CameraMode,
    };
  }

  public enter(planetName: string, currentPos: THREE.Vector3, currentTarget: THREE.Vector3) {
    const info = this.getPlanetInfo(planetName);
    if (!info) return;
    this.planetName = planetName;
    this.mode = 'toImmersive';
    this.t = 0;
    this.startPos.copy(currentPos);
    this.startTarget.copy(currentTarget);
    this.savedSystemPos.copy(currentPos);
    this.savedSystemTarget.copy(currentTarget);

    this.planetCenter.copy(info.worldPos);
    this.planetRadius = info.radiusPx;
    this.buildPath(info.worldPos, info.radiusPx);

    const dist = this.startPos.distanceTo(this.midPos) + this.midPos.distanceTo(this.endPos);
    this.duration = THREE.MathUtils.clamp(dist * 0.004, 0.9, 2.2);
  }

  public exit(currentPos: THREE.Vector3, currentTarget: THREE.Vector3) {
    this.mode = 'toSystem';
    this.t = 0;
    this.startPos.copy(currentPos);
    this.startTarget.copy(currentTarget);
    this.endPos.copy(this.savedSystemPos);
    this.endTarget.copy(this.savedSystemTarget);
    const dist = this.startPos.distanceTo(this.endPos);
    this.duration = THREE.MathUtils.clamp(dist * 0.004, 0.8, 2.0);
  }

  public update(deltaSec: number) {
    if (this.mode === 'system') {
      this.starFade = 1;
      this.groundOcclusion = 0;
      return;
    }

    if (this.mode === 'toImmersive') {
      this.t = Math.min(1, this.t + (deltaSec / this.duration));
      const k = easeInOutCubic(this.t);
      const split = 0.6;
      if (k < split) {
        const k1 = k / split;
        const e = easeInOutCubic(k1);
        this.desiredPos.copy(this.startPos).lerp(this.midPos, e);
        this.desiredTarget.copy(this.startTarget).lerp(this.midTarget, e);
      } else {
        const k2 = (k - split) / (1 - split);
        const e = easeInOutCubic(k2);
        this.desiredPos.copy(this.midPos).lerp(this.endPos, e);
        this.desiredTarget.copy(this.midTarget).lerp(this.endTarget, e);
      }
      if (this.t >= 1) this.mode = 'immersive';
    } else if (this.mode === 'immersive') {
      if (this.planetName) {
        // Follow planet: rebuild end point (center may move)
        const info = this.getPlanetInfo(this.planetName);
        if (info) {
          this.planetCenter.copy(info.worldPos);
          this.planetRadius = info.radiusPx;
          this.buildPath(info.worldPos, info.radiusPx);
        }
      }
      this.desiredPos.copy(this.endPos);
      this.desiredTarget.copy(this.endTarget);
    } else if (this.mode === 'toSystem') {
      this.t = Math.min(1, this.t + (deltaSec / this.duration));
      const k = easeInOutCubic(this.t);
      this.desiredPos.copy(this.startPos).lerp(this.endPos, k);
      this.desiredTarget.copy(this.startTarget).lerp(this.endTarget, k);
      if (this.t >= 1) this.mode = 'system';
    }

    // Atmosphere-driven effects
    const altitude = this.desiredPos.distanceTo(this.planetCenter) - this.planetRadius;
    const fade = THREE.MathUtils.smoothstep(altitude, 0, this.planetRadius * 4);
    this.starFade = THREE.MathUtils.clamp(fade * 0.95, 0.05, 1);
    this.groundOcclusion = 1 - THREE.MathUtils.smoothstep(altitude, 0, this.planetRadius * 1.2);
  }

  private buildPath(center: THREE.Vector3, radiusPx: number) {
    const poleUp = new THREE.Vector3(0, 1, 0);
    let east = new THREE.Vector3().crossVectors(poleUp, center.clone().normalize());
    if (east.lengthSq() < 1e-6) east.set(1, 0, 0);
    east.normalize();

    const nearHeight = Math.max(radiusPx * 0.015, 0.2);
    const nearLook = radiusPx * 2.2;
    const endHeight = Math.max(radiusPx * 8, 28);
    const endSide = radiusPx * 0.8;
    const endLook = radiusPx * 7.0;

    this.midPos.copy(center).addScaledVector(poleUp, nearHeight);
    this.midTarget.copy(this.midPos).addScaledVector(east, nearLook).addScaledVector(poleUp, -radiusPx * 0.25);

    this.endPos.copy(center).addScaledVector(poleUp, endHeight).addScaledVector(east, -endSide);
    this.endTarget.copy(this.endPos).addScaledVector(east, endLook * 0.6).addScaledVector(poleUp, radiusPx * 0.3);
  }
}

function easeInOutCubic(x: number) {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}


