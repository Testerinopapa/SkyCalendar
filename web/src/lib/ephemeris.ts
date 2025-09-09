export type PlanetName = "Mercury" | "Venus" | "Earth" | "Mars" | "Jupiter" | "Saturn" | "Uranus" | "Neptune";

export type OrbitalElements = {
	name: PlanetName;
	aAU: number; // semi-major axis in AU
	e: number; // eccentricity
	periodDays: number; // sidereal period
	meanAnomalyAtEpochDeg?: number; // optional phase offset at t0 (J2000)
};

export const ELEMENTS: Record<PlanetName, OrbitalElements> = {
	Mercury: { name: "Mercury", aAU: 0.387098, e: 0.205630, periodDays: 87.969, meanAnomalyAtEpochDeg: 174.796 },
	Venus:   { name: "Venus",   aAU: 0.723332, e: 0.006772, periodDays: 224.701, meanAnomalyAtEpochDeg: 50.115 },
	Earth:   { name: "Earth",   aAU: 1.000000, e: 0.016710, periodDays: 365.256, meanAnomalyAtEpochDeg: 358.617 },
	Mars:    { name: "Mars",    aAU: 1.523679, e: 0.093400, periodDays: 686.980, meanAnomalyAtEpochDeg: 19.373 },
	Jupiter: { name: "Jupiter", aAU: 5.20260,  e: 0.048498, periodDays: 4332.589, meanAnomalyAtEpochDeg: 20.020 },
	Saturn:  { name: "Saturn",  aAU: 9.55491,  e: 0.055508, periodDays: 10759.22, meanAnomalyAtEpochDeg: 317.020 },
	Uranus:  { name: "Uranus",  aAU: 19.2184,  e: 0.046295, periodDays: 30688.5, meanAnomalyAtEpochDeg: 142.238 },
	Neptune: { name: "Neptune", aAU: 30.1104,  e: 0.008988, periodDays: 60182.0, meanAnomalyAtEpochDeg: 256.228 },
};

// Newton-Raphson to solve Kepler's equation: M = E - e sin E
function solveEccentricAnomaly(meanAnomalyRad: number, eccentricity: number): number {
	let E = meanAnomalyRad;
	for (let i = 0; i < 8; i++) {
		const f = E - eccentricity * Math.sin(E) - meanAnomalyRad;
		const fp = 1 - eccentricity * Math.cos(E);
		E = E - f / fp;
	}
	return E;
}

// Get heliocentric position in AU in the ecliptic plane (2D: x,y)
export function getPlanetPositionAU(name: PlanetName, tDaysSinceEpoch: number): { x: number; y: number; r: number } {
	const el = ELEMENTS[name];
	const M0 = ((el.meanAnomalyAtEpochDeg ?? 0) * Math.PI) / 180; // at t=0 (J2000)
	const n = (2 * Math.PI) / el.periodDays; // rad/day
	const M = M0 + n * tDaysSinceEpoch; // mean anomaly
	const E = solveEccentricAnomaly(M % (2 * Math.PI), el.e);
	const cosE = Math.cos(E);
	const sinE = Math.sin(E);
	const r = el.aAU * (1 - el.e * cosE);
	const x = el.aAU * (cosE - el.e);
	const y = el.aAU * Math.sqrt(1 - el.e * el.e) * sinE;
	// Currently ignoring inclination and node; returns position in orbital plane ~ ecliptic for this simplified model
	return { x, y, r };
}

// Utility: Unix ms -> JD days since J2000 epoch
export function daysSinceJ2000(unixMs: number): number {
	// JD from Unix epoch: JD = ms/86400000 + 2440587.5; J2000 JD = 2451545.0
	const jd = unixMs / 86400000 + 2440587.5;
	return jd - 2451545.0;
}
