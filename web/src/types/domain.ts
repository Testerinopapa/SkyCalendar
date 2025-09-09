export type EventType = "moon" | "meteor" | "eclipse" | "launch" | "other";

export type Event = {
	id: string;
	title: string;
	description?: string;
	type: EventType;
	startAt: string; // ISO
	endAt?: string; // ISO
	source?: string; // provider id
	positionX?: number;
	positionY?: number;
};

export type SpaceWeatherEvent = {
	id: string;
	kind: "flare" | "cme" | "geomagnetic" | "radiation";
	title?: string;
	startAt: string; // ISO
	endAt?: string; // ISO
	source: string; // provider id
	severity?: string;
	link?: string;
};

export type PlanetDetail = {
	name: string;
	meanRadiusKm?: number;
	massKg?: number;
	gravity?: number; // m/s^2
	density?: number; // g/cm^3
	sideralRotationHours?: number;
	sideralOrbitDays?: number;
	perihelionKm?: number;
	aphelionKm?: number;
	discoveredBy?: string;
	discoveryDate?: string;
	source: string;
};
