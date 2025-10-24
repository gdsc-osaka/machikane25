import { Timestamp } from "firebase/firestore";
import { describe, expect, it } from "vitest";
import {
	deserializeGeneratedImageAsset,
	deserializePublicAccessToken,
	deserializeVisitorSession,
	serializeGeneratedImageAsset,
	serializePublicAccessToken,
	serializeVisitorSession,
} from "@/infra/firestore/converters";
import {
	captureOriginalImage,
	completeGeneration,
	createVisitorSession,
	failGeneration,
	selectTheme,
	startGeneration,
} from "@/domain/visitorSession";
import {
	GeneratedImageAsset,
	createGeneratedImageAsset,
	updateAquariumSyncStatus,
} from "@/domain/generatedImageAsset";
import {
	PublicAccessToken,
	createPublicAccessToken,
	consumePublicAccessToken,
} from "@/domain/publicAccessToken";

const makeDate = (value: string) => new Date(value);

describe("Firestore converters", () => {
	it("round-trips a visitor session between domain and Firestore formats", () => {
		const createdAt = makeDate("2025-10-21T00:00:00.000Z");
		const sessionResult = createVisitorSession({
			id: "session-1",
			anonymousUid: "anon-1",
			now: createdAt,
		});
		if (sessionResult.isErr()) {
			throw sessionResult.error;
		}
		const capturedResult = captureOriginalImage(sessionResult.value, {
			storagePath: "originals/session-1.jpg",
			capturedAt: makeDate("2025-10-21T00:05:00.000Z"),
		});
		if (capturedResult.isErr()) {
			throw capturedResult.error;
		}
		const themedResult = selectTheme(capturedResult.value, {
			themeId: "theme-neon",
			selectedAt: makeDate("2025-10-21T00:06:00.000Z"),
		});
		if (themedResult.isErr()) {
			throw themedResult.error;
		}
		const generatingResult = startGeneration(themedResult.value, {
			requestedAt: makeDate("2025-10-21T00:07:00.000Z"),
		});
		if (generatingResult.isErr()) {
			throw generatingResult.error;
		}
		const completedResult = completeGeneration(generatingResult.value, {
			completedAt: makeDate("2025-10-21T00:08:00.000Z"),
			generatedImageRef: "generated/session-1.png",
			publicTokenId: "token-1",
			aquariumEventId: "event-1",
		});
		if (completedResult.isErr()) {
			throw completedResult.error;
		}
		const session = completedResult.value;
		const record = serializeVisitorSession(session);
		expect(record).toStrictEqual({
			anonymousUid: "anon-1",
			status: "completed",
			themeId: "theme-neon",
			originalImageRef: "originals/session-1.jpg",
			generatedImageRef: "generated/session-1.png",
			publicTokenId: "token-1",
			aquariumEventId: "event-1",
			createdAt: Timestamp.fromDate(session.createdAt),
			updatedAt: Timestamp.fromDate(session.updatedAt),
			expiresAt: Timestamp.fromDate(session.expiresAt),
			originalImageRetentionDeadline: Timestamp.fromDate(
				session.originalImageRetentionDeadline!,
			),
			statusHistory: session.statusHistory.map((entry) => ({
				status: entry.status,
				occurredAt: Timestamp.fromDate(entry.occurredAt),
			})),
		});
		const parsed = deserializeVisitorSession({
			id: "session-1",
			data: record,
		});
		if (parsed.isErr()) {
			throw parsed.error;
		}
		expect(parsed.value).toStrictEqual(session);
	});

	it("flags invalid visitor session payloads", () => {
		const invalidRecord = {
			anonymousUid: "anon-2",
			status: "unknown",
			themeId: null,
			originalImageRef: null,
			generatedImageRef: null,
			publicTokenId: null,
			aquariumEventId: null,
			createdAt: Timestamp.fromMillis(0),
			updatedAt: Timestamp.fromMillis(0),
			expiresAt: Timestamp.fromMillis(1000),
			originalImageRetentionDeadline: null,
			statusHistory: [],
		};
		const result = deserializeVisitorSession({
			id: "session-2",
			data: invalidRecord,
		});
		expect(result.isErr()).toBe(true);
		if (result.isErr()) {
			expect(result.error.type).toBe("invalid-record");
		}
	});

	it("round-trips generated image assets and fails on inconsistent timestamps", () => {
		const createdAt = makeDate("2025-10-21T01:00:00.000Z");
		const expiresAt = makeDate("2025-10-23T01:00:00.000Z");
		const assetResult = createGeneratedImageAsset({
			id: "asset-1",
			sessionId: "session-1",
			storagePath: "generated/session-1.png",
			previewUrl: "https://example.com/session-1.png",
			createdAt,
			expiresAt,
		});
		if (assetResult.isErr()) {
			throw assetResult.error;
		}
		const pendingAsset = assetResult.value;
		const syncedResult = updateAquariumSyncStatus(pendingAsset, {
			status: "sent",
			lastError: null,
			updatedAt: makeDate("2025-10-21T01:10:00.000Z"),
			attempts: 1,
		});
		if (syncedResult.isErr()) {
			throw syncedResult.error;
		}
		const serialized = serializeGeneratedImageAsset(syncedResult.value);
		expect(serialized).toStrictEqual({
			sessionId: "session-1",
			storagePath: "generated/session-1.png",
			previewUrl: "https://example.com/session-1.png",
			aquariumSyncStatus: "sent",
			lastError: null,
			attempts: 1,
			lastAttemptAt: Timestamp.fromDate(syncedResult.value.lastAttemptAt!),
			createdAt: Timestamp.fromDate(createdAt),
			expiresAt: Timestamp.fromDate(expiresAt),
		});
		const parsed = deserializeGeneratedImageAsset({
			id: "asset-1",
			data: serialized,
		});
		if (parsed.isErr()) {
			throw parsed.error;
		}
		expect(parsed.value).toStrictEqual(syncedResult.value);

		const invalid = deserializeGeneratedImageAsset({
			id: "asset-err",
			data: {
				sessionId: "session-1",
				storagePath: "generated/session-1.png",
				previewUrl: "https://example.com/session-1.png",
				aquariumSyncStatus: "sent",
				lastError: null,
				attempts: 1,
				lastAttemptAt: null,
				createdAt: Timestamp.fromDate(expiresAt),
				expiresAt: Timestamp.fromDate(createdAt),
			},
		});
		expect(invalid.isErr()).toBe(true);
		if (invalid.isErr()) {
			expect(invalid.error.details).toContain("expiresAt");
		}
	});

	it("serializes and deserializes public access tokens and validates consumption windows", () => {
		const createdAt = makeDate("2025-10-21T02:00:00.000Z");
		const expiresAt = makeDate("2025-10-23T02:00:00.000Z");
		const tokenResult = createPublicAccessToken({
			id: "token-1",
			sessionId: "session-1",
			expiresAt,
			now: createdAt,
		});
		if (tokenResult.isErr()) {
			throw tokenResult.error;
		}
		const consumedResult = consumePublicAccessToken(tokenResult.value, {
			now: makeDate("2025-10-21T04:00:00.000Z"),
		});
		if (consumedResult.isErr()) {
			throw consumedResult.error;
		}
		const serialized = serializePublicAccessToken(consumedResult.value);
		expect(serialized).toStrictEqual({
			sessionId: "session-1",
			isConsumed: true,
			expiresAt: Timestamp.fromDate(expiresAt),
			createdAt: Timestamp.fromDate(createdAt),
			consumedAt: Timestamp.fromDate(consumedResult.value.consumedAt!),
		});
		const parsed = deserializePublicAccessToken({
			id: "token-1",
			data: serialized,
		});
		if (parsed.isErr()) {
			throw parsed.error;
		}
		expect(parsed.value).toStrictEqual(consumedResult.value);

		const expired = deserializePublicAccessToken({
			id: "token-expired",
			data: {
				sessionId: "session-1",
				isConsumed: false,
				expiresAt: Timestamp.fromMillis(1),
				createdAt: Timestamp.fromMillis(5),
				consumedAt: null,
			},
		});
		expect(expired.isErr()).toBe(true);
		if (expired.isErr()) {
			expect(expired.error.details).toContain("createdAt must be before expiresAt");
		}
	});
});
