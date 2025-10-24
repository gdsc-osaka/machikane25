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
} from "@/domain/visitorSession";

const addMinutes = (value: Date, minutes: number) =>
	new Date(value.getTime() + minutes * 60_000);

const addHours = (value: Date, hours: number) =>
	new Date(value.getTime() + hours * 3_600_000);

describe("VisitorSession domain", () => {
	it("creates a session in capturing status with a 48 hour expiry window", () => {
		const now = new Date("2025-10-21T00:00:00.000Z");
		const result = createVisitorSession({
			id: "session-1",
			anonymousUid: "anon-uid",
			now,
		});
		if (result.isErr()) {
			throw result.error;
		}
		const session = result.value;
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
		const sessionResult = createVisitorSession({
			id: "session-2",
			anonymousUid: "anon-uid",
			now: createdAt,
		});
		if (sessionResult.isErr()) {
			throw sessionResult.error;
		}
		const selectingResult = captureOriginalImage(sessionResult.value, {
			storagePath: "originals/session-2.jpg",
			capturedAt: captureAt,
		});
		if (selectingResult.isErr()) {
			throw selectingResult.error;
		}
		expect(selectingResult.value.status).toBe("selecting-theme");
		expect(selectingResult.value.originalImageRetentionDeadline).toEqual(
			addMinutes(captureAt, 5),
		);

		const themedResult = selectTheme(selectingResult.value, {
			themeId: "theme-fireworks",
			selectedAt: themeSelectedAt,
		});
		if (themedResult.isErr()) {
			throw themedResult.error;
		}
		expect(themedResult.value.themeId).toBe("theme-fireworks");
		expect(themedResult.value.status).toBe("selecting-theme");

		const generatingResult = startGeneration(themedResult.value, {
			requestedAt: generationStartedAt,
		});
		if (generatingResult.isErr()) {
			throw generatingResult.error;
		}
		expect(generatingResult.value.status).toBe("generating");

		const completedResult = completeGeneration(generatingResult.value, {
			completedAt,
			generatedImageRef: "generated/session-2.png",
			publicTokenId: "token-123",
			aquariumEventId: "sync-abc",
		});
		if (completedResult.isErr()) {
			throw completedResult.error;
		}
		expect(completedResult.value.status).toBe("completed");
		expect(completedResult.value.generatedImageRef).toBe(
			"generated/session-2.png",
		);
		expect(completedResult.value.publicTokenId).toBe("token-123");
		expect(completedResult.value.aquariumEventId).toBe("sync-abc");
	});

	it("marks generation failure and preserves original retention for cleanup", () => {
		const now = new Date("2025-10-21T00:00:00.000Z");
		const sessionResult = createVisitorSession({
			id: "session-3",
			anonymousUid: "anon-uid",
			now,
		});
		if (sessionResult.isErr()) {
			throw sessionResult.error;
		}
		const capturedResult = captureOriginalImage(sessionResult.value, {
			storagePath: "originals/session-3.jpg",
			capturedAt: addMinutes(now, 1),
		});
		if (capturedResult.isErr()) {
			throw capturedResult.error;
		}
		const themedResult = selectTheme(capturedResult.value, {
			themeId: "theme-neon",
			selectedAt: addMinutes(now, 2),
		});
		if (themedResult.isErr()) {
			throw themedResult.error;
		}
		const generatingResult = startGeneration(themedResult.value, {
			requestedAt: addMinutes(now, 3),
		});
		if (generatingResult.isErr()) {
			throw generatingResult.error;
		}
		const failedResult = failGeneration(generatingResult.value, {
			failedAt: addMinutes(now, 6),
			reason: "timeout",
		});
		if (failedResult.isErr()) {
			throw failedResult.error;
		}
		expect(failedResult.value.status).toBe("failed");
		expect(failedResult.value.originalImageRetentionDeadline).toEqual(
			addMinutes(addMinutes(now, 1), 5),
		);
	});

	it("rejects generation without mandatory theme and original image context", () => {
		const now = new Date("2025-10-21T00:00:00.000Z");
		const sessionResult = createVisitorSession({
			id: "session-4",
			anonymousUid: "anon-uid",
			now,
		});
		if (sessionResult.isErr()) {
			throw sessionResult.error;
		}
		const generationResult = startGeneration(sessionResult.value, {
			requestedAt: addMinutes(now, 1),
		});
		expect(generationResult.isErr()).toBe(true);
		if (generationResult.isErr()) {
			expect(generationResult.error.type).toBe("invalid-transition");
		}
	});

	it("expires when the expiry timestamp is reached and signals original purge", () => {
		const createdAt = new Date("2025-10-21T00:00:00.000Z");
		const sessionResult = createVisitorSession({
			id: "session-5",
			anonymousUid: "anon-uid",
			now: createdAt,
		});
		if (sessionResult.isErr()) {
			throw sessionResult.error;
		}
		const capturedResult = captureOriginalImage(sessionResult.value, {
			storagePath: "originals/session-5.jpg",
			capturedAt: addMinutes(createdAt, 2),
		});
		if (capturedResult.isErr()) {
			throw capturedResult.error;
		}
		const expiryInstant = addHours(createdAt, 48);
		const expiredResult = expireSession(capturedResult.value, {
			expiredAt: expiryInstant,
		});
		if (expiredResult.isErr()) {
			throw expiredResult.error;
		}
		expect(expiredResult.value.status).toBe("expired");
		expect(
			needsOriginalImageDeletion(
				expiredResult.value,
				addMinutes(addMinutes(createdAt, 2), 5),
			),
		).toBe(true);
		expect(
			needsOriginalImageDeletion(expiredResult.value, addMinutes(createdAt, 2)),
		).toBe(false);
	});
});
