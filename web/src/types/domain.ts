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
