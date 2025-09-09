import type { Event } from "@/types/domain";
import { ingestUpcomingLaunches } from "@/server/ingestors/ingestLaunches";
import { upsertEvents } from "@/server/repositories/eventsRepo";

export async function loadUpcomingEvents(): Promise<Event[]> {
	const launches = await ingestUpcomingLaunches();
	await upsertEvents(launches);
	return launches;
}
