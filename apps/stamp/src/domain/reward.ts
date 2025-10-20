import { errorBuilder, type InferError } from "obj-err";
import { z } from "zod";

const rewardRecordSchema = z.object({
	attendeeId: z.string().min(1),
	qrPayload: z.string().min(1),
	issuedAt: z.number().int().nonnegative(),
	redeemedAt: z.number().int().nonnegative().nullable(),
});

type RewardRecord = z.infer<typeof rewardRecordSchema>;

const RewardRepositoryError = errorBuilder(
	"RewardRepositoryError",
	z.object({
		operation: z.union([z.literal("find"), z.literal("save")]),
	}),
);

type RewardRepositoryError = InferError<typeof RewardRepositoryError>;

type RewardRepository = {
	findByAttendeeId: (attendeeId: string) => Promise<RewardRecord | null>;
	save: (record: RewardRecord) => Promise<void>;
};

const RewardStatus = z.union([
	z.literal("pending"),
	z.literal("issued"),
	z.literal("redeemed"),
]);

type RewardStatus = z.infer<typeof RewardStatus>;

type RewardSnapshot = {
	status: RewardStatus;
	qrPayload: string | null;
	issuedAt: number | null;
	redeemedAt: number | null;
};

const resolveRewardStatus = (record: RewardRecord): RewardStatus =>
	record.redeemedAt === null ? "issued" : "redeemed";

const createRewardSnapshot = (record: RewardRecord | null): RewardSnapshot => {
	if (record === null) {
		return {
			status: "pending",
			qrPayload: null,
			issuedAt: null,
			redeemedAt: null,
		};
	}

	return {
		status: resolveRewardStatus(record),
		qrPayload: record.qrPayload,
		issuedAt: record.issuedAt,
		redeemedAt: record.redeemedAt,
	};
};

const attendeeIdSchema = z.string().min(1);
const issuedAtSchema = z.number().int().nonnegative();

const toBase64Url = (value: string): string => {
	if (typeof Buffer !== "undefined") {
		return Buffer.from(value, "utf-8").toString("base64url");
	}

	if (typeof globalThis.btoa === "function") {
		return globalThis
			.btoa(value)
			.replaceAll("+", "-")
			.replaceAll("/", "_")
			.replace(/=+$/u, "");
	}

	throw new Error("Unable to encode reward payload for the current runtime.");
};

const randomHexSegment = (length: number): string =>
	Array.from({ length }, () =>
		Math.floor(Math.random() * 256)
			.toString(16)
			.padStart(2, "0"),
	).join("");

const defaultRandomUuid = (): string => {
	if (
		typeof globalThis.crypto !== "undefined" &&
		"randomUUID" in globalThis.crypto
	) {
		return globalThis.crypto.randomUUID();
	}

	const segments = [
		randomHexSegment(4),
		randomHexSegment(2),
		randomHexSegment(2),
		randomHexSegment(2),
		randomHexSegment(6),
	];

	return [
		segments[0],
		segments[1],
		segments[2],
		segments[3],
		segments[4],
	].join("-");
};

type CreateRewardQrPayloadGeneratorOptions = {
	random?: () => string;
	encode?: (value: string) => string;
};

const createRewardQrPayloadGenerator = ({
	random = defaultRandomUuid,
	encode = toBase64Url,
}: CreateRewardQrPayloadGeneratorOptions = {}) => {
	const generate = (attendeeId: string, issuedAt: number): string => {
		const parsedAttendeeId = attendeeIdSchema.parse(attendeeId);
		const parsedIssuedAt = issuedAtSchema.parse(issuedAt);
		const payload = {
			v: "1",
			id: parsedAttendeeId,
			issuedAt: parsedIssuedAt,
			nonce: random(),
		};

		return encode(JSON.stringify(payload));
	};

	return generate;
};

export {
	createRewardQrPayloadGenerator,
	createRewardSnapshot,
	rewardRecordSchema,
	RewardRepositoryError,
	RewardStatus,
};
export type {
	RewardRecord,
	RewardRepository,
	RewardRepositoryError,
	RewardSnapshot,
};
