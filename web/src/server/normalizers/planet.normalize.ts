import type { PlanetDetail } from "@/types/domain";

export function normalizeLssPlanet(input: any): PlanetDetail {
	return {
		name: input.englishName || input.name,
		meanRadiusKm: input.meanRadius ?? undefined,
		massKg: input.mass?.massValue !== undefined && input.mass?.massExponent !== undefined ? input.mass.massValue * Math.pow(10, input.mass.massExponent) : undefined,
		gravity: input.gravity ?? undefined,
		density: input.density ?? undefined,
		sideralRotationHours: input.sideralRotation ?? undefined,
		sideralOrbitDays: input.sideralOrbit ?? undefined,
		perihelionKm: input.perihelion ?? undefined,
		aphelionKm: input.aphelion ?? undefined,
		discoveredBy: input.discoveredBy || undefined,
		discoveryDate: input.discoveryDate || undefined,
		source: "le-systeme-solaire",
	};
}
