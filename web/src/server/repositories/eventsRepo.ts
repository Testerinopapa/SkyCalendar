import type { Event } from "@/types/domain";
import { prisma } from "@/lib/prisma";

export async function upsertEvents(events: Event[]): Promise<void> {
	try {
		for (const e of events) {
			const updateData: any = {
				title: e.title,
				description: e.description,
				type: e.type as any,
				startAt: new Date(e.startAt),
				endAt: e.endAt ? new Date(e.endAt) : null,
			};
			if (e.source) {
				updateData.source = {
					connectOrCreate: {
						where: { name: e.source },
						create: { name: e.source },
					},
				};
			} else {
				updateData.source = { disconnect: true };
			}

			const createData: any = {
				id: e.id,
				title: e.title,
				description: e.description,
				type: e.type as any,
				startAt: new Date(e.startAt),
				endAt: e.endAt ? new Date(e.endAt) : null,
			};
			if (e.source) {
				createData.source = {
					connectOrCreate: {
						where: { name: e.source },
						create: { name: e.source },
					},
				};
			}

			await prisma.event.upsert({
				where: { id: e.id },
				update: updateData,
				create: createData,
			});
		}
	} catch (e) {
		// ignore if prisma not configured
	}
}
