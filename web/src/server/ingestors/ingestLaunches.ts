import { llGet } from "@/server/providers/launchlibrary";
import { normalizeLaunchLibraryEvents } from "@/server/normalizers/launchlib.normalize";
import type { Event } from "@/types/domain";

export async function ingestUpcomingLaunches(): Promise<Event[]> {
	const data = await llGet<any>("/launch/upcoming/", { limit: 20, ordering: "net" });
	return normalizeLaunchLibraryEvents(data);
}
