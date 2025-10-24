import { describe, expect, it } from "vitest";
import {
	createVisitorSession,
	captureOriginalImage,
	selectTheme,
	startGeneration,
	completeGeneration,
	failGeneration,
	expireSession,
	needsOriginalImageDeletion,
	VisitorSessionError,
} from "@/domain/visitorSession";

const addMinutes = (value: Date, minutes: number) =>
	new Date(value.getTime() + minutes * 60_000);

const addHours = (value: Date, hours: number) =>
	new Date(value.getTime() + hours * 3_600_000);

describe("VisitorSession domain", () => {
	it("creates a session in capturing status with a 48 hour expiry window", () => {
		const now = new Date("2025-10-21T00:00:00.000Z");
		const session = createVisitorSession({
			id: "session-1",
			anonymousUid: "anon-uid",
			now,
		});
		expect(session.status).toBe("capturing");
		expect(session.createdAt).toEqual(now);
		expect(session.updatedAt).toEqual(now);
		expect(session.expiresAt).toEqual(addHours(now, 48));
		expect(session.originalImageRef).toBeNull();
		expect(session.originalImageRetentionDeadline).toBeNull();
	});

	it("flows through capturing → selecting-theme → generating → completed", () => {
		const createdAt = new Date("2025-10-21T00:00:00.000Z");
		const captureAt = addMinutes(createdAt, 1);
		const themeSelectedAt = addMinutes(createdAt, 2);
		const generationStartedAt = addMinutes(createdAt, 3);
		const completedAt = addMinutes(createdAt, 4);
		const session = createVisitorSession({
			id: "session-2",
			anonymousUid: "anon-uid",
			now: createdAt,
		});
		const selecting = captureOriginalImage(session, {
			storagePath: "originals/session-2.jpg",
			capturedAt: captureAt,
		});
		expect(selecting.status).toBe("selecting-theme");
		expect(selecting.originalImageRetentionDeadline).toEqual(
			addMinutes(captureAt, 5),
		);

		const themed = selectTheme(selecting, {
			themeId: "theme-fireworks",
			selectedAt: themeSelectedAt,
		});
		expect(themed.themeId).toBe("theme-fireworks");
		expect(themed.status).toBe("selecting-theme");

		const generating = startGeneration(themed, {
			requestedAt: generationStartedAt,
		});
		expect(generating.status).toBe("generating");

		const completed = completeGeneration(generating, {
			completedAt,
			generatedImageRef: "generated/session-2.png",
			publicTokenId: "token-123",
			aquariumEventId: "sync-abc",
		});
		expect(completed.status).toBe("completed");
		expect(completed.generatedImageRef).toBe(
			"generated/session-2.png",
		);
		expect(completed.publicTokenId).toBe("token-123");
		expect(completed.aquariumEventId).toBe("sync-abc");
		expect(completed.originalImageRetentionDeadline).toEqual(
			addMinutes(captureAt, 5),
		);
		expect(completed.failureReason).toBeNull();
		expect(
			needsOriginalImageDeletion(completed, addMinutes(captureAt, 4)),
		).toBe(false);
		expect(
			needsOriginalImageDeletion(completed, addMinutes(captureAt, 5)),
		).toBe(true);
	});

	it("marks generation failure and preserves original retention for cleanup", () => {
		const now = new Date("2025-10-21T00:00:00.000Z");
		const session = createVisitorSession({
			id: "session-3",
			anonymousUid: "anon-uid",
			now,
		});
		const captured = captureOriginalImage(session, {
			storagePath: "originals/session-3.jpg",
			capturedAt: addMinutes(now, 1),
		});
		const themed = selectTheme(captured, {
			themeId: "theme-neon",
			selectedAt: addMinutes(now, 2),
		});
		const generating = startGeneration(themed, {
			requestedAt: addMinutes(now, 3),
		});
		const failed = failGeneration(generating, {
			failedAt: addMinutes(now, 6),
			reason: "timeout",
		});
		expect(failed.status).toBe("failed");
		expect(failed.failureReason).toBe("timeout");
		expect(failed.originalImageRetentionDeadline).toEqual(
			addMinutes(addMinutes(now, 1), 5),
		);
	});

	it("rejects generation without mandatory theme and original image context", () => {
		const now = new Date("2025-10-21T00:00:00.000Z");
		const session = createVisitorSession({
			id: "session-4",
			anonymousUid: "anon-uid",
			now,
		});
		try {
			startGeneration(session, {
				requestedAt: addMinutes(now, 1),
			});
			throw new Error("expected startGeneration to throw");
		} catch (error) {
			const typed = error as VisitorSessionError;
			expect(typed.type).toBe("invalid-transition");
		}
	});

	it("expires when the expiry timestamp is reached and signals original purge", () => {
		const createdAt = new Date("2025-10-21T00:00:00.000Z");
		const session = createVisitorSession({
			id: "session-5",
			anonymousUid: "anon-uid",
			now: createdAt,
		});
		const captured = captureOriginalImage(session, {
			storagePath: "originals/session-5.jpg",
			capturedAt: addMinutes(createdAt, 2),
		});
		const expiryInstant = addHours(createdAt, 48);
		const expired = expireSession(captured, {
			expiredAt: expiryInstant,
		});
		expect(expired.status).toBe("expired");
		expect(
			needsOriginalImageDeletion(
				expired,
				addMinutes(addMinutes(createdAt, 2), 5),
			),
		).toBe(true);
		expect(
			needsOriginalImageDeletion(expired, addMinutes(createdAt, 2)),
		).toBe(false);
	});
});
