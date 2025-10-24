import { Timestamp } from "firebase/firestore";
import { describe, expect, it } from "vitest";
import {
	deserializeGeneratedImageAsset,
	deserializePublicAccessToken,
	deserializeVisitorSession,
	serializeGeneratedImageAsset,
	serializePublicAccessToken,
	serializeVisitorSession,
	FirestoreConverterError,
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
		const sessionBase = createVisitorSession({
			id: "session-1",
			anonymousUid: "anon-1",
			now: createdAt,
		});
		const captured = captureOriginalImage(sessionBase, {
			storagePath: "originals/session-1.jpg",
			capturedAt: makeDate("2025-10-21T00:05:00.000Z"),
		});
		const themed = selectTheme(captured, {
			themeId: "theme-neon",
			selectedAt: makeDate("2025-10-21T00:06:00.000Z"),
		});
		const generating = startGeneration(themed, {
			requestedAt: makeDate("2025-10-21T00:07:00.000Z"),
		});
		const session = completeGeneration(generating, {
			completedAt: makeDate("2025-10-21T00:08:00.000Z"),
			generatedImageRef: "generated/session-1.png",
			publicTokenId: "token-1",
			aquariumEventId: "event-1",
		});
		const record = serializeVisitorSession(session);
		expect(record).toStrictEqual({
			anonymousUid: "anon-1",
			status: "completed",
			themeId: "theme-neon",
			originalImageRef: "originals/session-1.jpg",
			generatedImageRef: "generated/session-1.png",
			publicTokenId: "token-1",
			aquariumEventId: "event-1",
			failureReason: null,
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
		expect(parsed).toStrictEqual(session);
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
		try {
			deserializeVisitorSession({
				id: "session-2",
				data: invalidRecord,
			});
			throw new Error("expected deserializeVisitorSession to throw");
		} catch (error) {
			const typed = error as FirestoreConverterError;
			expect(typed.type).toBe("invalid-record");
			expect(typed.message).toBe("Invalid visitor session status for status");
		}
	});

	it("round-trips generated image assets and fails on inconsistent timestamps", () => {
		const createdAt = makeDate("2025-10-21T01:00:00.000Z");
		const expiresAt = makeDate("2025-10-23T01:00:00.000Z");
		const pendingAsset = createGeneratedImageAsset({
			id: "asset-1",
			sessionId: "session-1",
			storagePath: "generated/session-1.png",
			previewUrl: "https://example.com/session-1.png",
			createdAt,
			expiresAt,
		});
		const syncedAsset = updateAquariumSyncStatus(pendingAsset, {
			status: "sent",
			lastError: null,
			updatedAt: makeDate("2025-10-21T01:10:00.000Z"),
			attempts: 1,
		});
		const serialized = serializeGeneratedImageAsset(syncedAsset);
		expect(serialized).toStrictEqual({
			sessionId: "session-1",
			storagePath: "generated/session-1.png",
			previewUrl: "https://example.com/session-1.png",
			aquariumSyncStatus: "sent",
			lastError: null,
			attempts: 1,
			lastAttemptAt: Timestamp.fromDate(syncedAsset.lastAttemptAt!),
			createdAt: Timestamp.fromDate(createdAt),
			expiresAt: Timestamp.fromDate(expiresAt),
		});
		const parsed = deserializeGeneratedImageAsset({
			id: "asset-1",
			data: serialized,
		});
		expect(parsed).toStrictEqual(syncedAsset);

		try {
			deserializeGeneratedImageAsset({
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
			throw new Error("expected deserializeGeneratedImageAsset to throw");
		} catch (error) {
			const typed = error as FirestoreConverterError;
			expect(typed.type).toBe("invalid-record");
			expect(typed.message).toBe("expiresAt must be after createdAt");
			expect(typed.details).toContain("expiresAt=");
		}
	});

	it("serializes and deserializes public access tokens and validates consumption windows", () => {
		const createdAt = makeDate("2025-10-21T02:00:00.000Z");
		const expiresAt = makeDate("2025-10-23T02:00:00.000Z");
		const token = createPublicAccessToken({
			id: "token-1",
			sessionId: "session-1",
			expiresAt,
			now: createdAt,
		});
		const consumedToken = consumePublicAccessToken(token, {
			now: makeDate("2025-10-21T04:00:00.000Z"),
		});
		const serialized = serializePublicAccessToken(consumedToken);
		expect(serialized).toStrictEqual({
			sessionId: "session-1",
			isConsumed: true,
			expiresAt: Timestamp.fromDate(expiresAt),
			createdAt: Timestamp.fromDate(createdAt),
			consumedAt: Timestamp.fromDate(consumedToken.consumedAt!),
		});
		const parsed = deserializePublicAccessToken({
			id: "token-1",
			data: serialized,
		});
		expect(parsed).toStrictEqual(consumedToken);

		try {
			deserializePublicAccessToken({
				id: "token-expired",
				data: {
					sessionId: "session-1",
					isConsumed: false,
					expiresAt: Timestamp.fromMillis(1),
					createdAt: Timestamp.fromMillis(5),
					consumedAt: null,
				},
			});
			throw new Error("expected deserializePublicAccessToken to throw");
		} catch (error) {
			const typed = error as FirestoreConverterError;
			expect(typed.type).toBe("invalid-record");
			expect(typed.message).toBe("createdAt must be before expiresAt");
			expect(typed.details).toContain("expiresAt=");
		}
	});
});
