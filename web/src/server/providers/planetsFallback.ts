import type { PlanetDetail } from "@/types/domain";

const fallback: Record<string, PlanetDetail> = {
	mercury: { name: "Mercury", meanRadiusKm: 2439.7, massKg: 3.3011e23, gravity: 3.7, density: 5.43, sideralRotationHours: 1407.5, sideralOrbitDays: 87.969, perihelionKm: 46001200, aphelionKm: 69816900, source: "fallback" },
	venus:   { name: "Venus",   meanRadiusKm: 6051.8, massKg: 4.8675e24, gravity: 8.87, density: 5.24, sideralRotationHours: -5832.5, sideralOrbitDays: 224.701, perihelionKm: 107477000, aphelionKm: 108939000, source: "fallback" },
	earth:   { name: "Earth",   meanRadiusKm: 6371.0, massKg: 5.97237e24, gravity: 9.80665, density: 5.514, sideralRotationHours: 23.934, sideralOrbitDays: 365.256, perihelionKm: 147098074, aphelionKm: 152097701, source: "fallback" },
	mars:    { name: "Mars",    meanRadiusKm: 3389.5, massKg: 6.4171e23, gravity: 3.721, density: 3.93, sideralRotationHours: 24.623, sideralOrbitDays: 686.98, perihelionKm: 206650000, aphelionKm: 249200000, source: "fallback" },
	jupiter: { name: "Jupiter", meanRadiusKm: 69911, massKg: 1.8982e27, gravity: 24.79, density: 1.33, sideralRotationHours: 9.925, sideralOrbitDays: 4332.59, perihelionKm: 740573600, aphelionKm: 816520800, source: "fallback" },
	saturn:  { name: "Saturn",  meanRadiusKm: 58232, massKg: 5.6834e26, gravity: 10.44, density: 0.687, sideralRotationHours: 10.656, sideralOrbitDays: 10759.22, perihelionKm: 1352550000, aphelionKm: 1514500000, source: "fallback" },
	uranus:  { name: "Uranus",  meanRadiusKm: 25362, massKg: 8.6810e25, gravity: 8.69, density: 1.27, sideralRotationHours: -17.24, sideralOrbitDays: 30688.5, perihelionKm: 2742000000, aphelionKm: 3006000000, source: "fallback" },
	neptune: { name: "Neptune", meanRadiusKm: 24622, massKg: 1.02413e26, gravity: 11.15, density: 1.64, sideralRotationHours: 16.11, sideralOrbitDays: 60182.0, perihelionKm: 4459000000, aphelionKm: 4537000000, source: "fallback" },
};

export function getFallbackPlanet(name: string): PlanetDetail | null {
	const key = name.toLowerCase();
	return fallback[key] ?? null;
}
