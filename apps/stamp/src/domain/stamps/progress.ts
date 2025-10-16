import type { ResultAsync } from "neverthrow";
import { errorBuilder, type InferError } from "obj-err";
import { z } from "zod";

export const STAMP_IDS = [
	"reception",
	"photobooth",
	"art",
	"robot",
	"survey",
] as const;

export type StampId = (typeof STAMP_IDS)[number];

export type StampProgress = {
	stamps: Partial<Record<StampId, Date>>;
	lastSignedInAt: Date | null;
	giftReceivedAt: Date | null;
	language: "ja" | "en";
	rewardQr: string | null;
};

export const emptyStampProgress = (): StampProgress => ({
	stamps: {},
	lastSignedInAt: null,
	giftReceivedAt: null,
	language: "ja",
	rewardQr: null,
});

export type StampProgressSnapshot = {
	stamps?: Partial<Record<StampId, unknown>>;
	lastSignedInAt?: unknown;
	giftReceivedAt?: unknown;
	language?: unknown;
	rewardQr?: unknown;
};

type TimestampLike = {
	toDate: () => Date;
};

export const parseTimestamp = (value: unknown): Date | null => {
	if (value instanceof Date) {
		return value;
	}
	if (
		value !== null &&
		typeof value === "object" &&
		"toDate" in (value as TimestampLike) &&
		typeof (value as TimestampLike).toDate === "function"
	) {
		try {
			return (value as TimestampLike).toDate();
		} catch {
			return null;
		}
	}
	return null;
};

export const normalizeStampProgress = (
	snapshot?: StampProgressSnapshot | null,
): StampProgress => {
	if (!snapshot) {
		return emptyStampProgress();
	}

	const resolvedStamps: Partial<Record<StampId, Date>> = {};
	for (const stampId of STAMP_IDS) {
		const parsed = parseTimestamp(snapshot.stamps?.[stampId]);
		if (parsed) {
			resolvedStamps[stampId] = parsed;
		}
	}

	const language =
		snapshot.language === "en" || snapshot.language === "ja"
			? snapshot.language
			: "ja";

	return {
		stamps: resolvedStamps,
		lastSignedInAt: parseTimestamp(snapshot.lastSignedInAt),
		giftReceivedAt: parseTimestamp(snapshot.giftReceivedAt),
		language,
		rewardQr:
			typeof snapshot.rewardQr === "string" && snapshot.rewardQr.length > 0
				? snapshot.rewardQr
				: null,
	};
};

export const StampProgressError = errorBuilder(
	"StampProgressError",
	z.object({
		reason: z.enum(["unauthorized", "not_found", "unknown"]),
		cause: z.string().optional(),
	}),
);

export type StampProgressError = InferError<typeof StampProgressError>;

export type StampProgressResult = ResultAsync<
	StampProgress,
	StampProgressError
>;

export interface StampProgressRepository {
	getByUserId(userId: string): StampProgressResult;
}
