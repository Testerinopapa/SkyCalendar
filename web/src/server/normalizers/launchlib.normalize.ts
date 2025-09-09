import type { Event } from "@/types/domain";

export function normalizeLaunchLibraryEvents(input: any): Event[] {
	const results: Event[] = [];
	for (const item of input?.results ?? []) {
		results.push({
			id: `ll2:${item.id}`,
			title: item.name,
			description: item.mission?.description ?? undefined,
			type: "launch",
			startAt: item.net,
			endAt: item.window_end ?? undefined,
			source: "launchlibrary",
			positionX: undefined,
			positionY: undefined,
		});
	}
	return results;
}
