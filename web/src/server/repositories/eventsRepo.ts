import type { Event } from "@/types/domain";
import { prisma } from "@/lib/prisma";

export async function upsertEvents(events: Event[]): Promise<void> {
	try {
		for (const e of events) {
			await prisma.event.upsert({
				where: { id: e.id },
				update: {
					title: e.title,
					description: e.description,
					type: e.type as any,
					startAt: new Date(e.startAt),
					endAt: e.endAt ? new Date(e.endAt) : null,
					source: e.source ?? null,
				},
				create: {
					id: e.id,
					title: e.title,
					description: e.description,
					type: e.type as any,
					startAt: new Date(e.startAt),
					endAt: e.endAt ? new Date(e.endAt) : null,
					source: e.source ?? null,
				},
			});
		}
	} catch (e) {
		// ignore if prisma not configured
	}
}
