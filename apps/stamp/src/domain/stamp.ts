import { err, ok, type Result, type ResultAsync } from "neverthrow";
import { errorBuilder, type InferError } from "obj-err";
import { z } from "zod";

const StampCheckpoint = z.union([
	z.literal("reception"),
	z.literal("photobooth"),
	z.literal("art"),
	z.literal("robot"),
	z.literal("survey"),
]);

export type StampCheckpoint = z.infer<typeof StampCheckpoint>;

export const STAMP_SEQUENCE: ReadonlyArray<StampCheckpoint> = [
	"reception",
	"photobooth",
	"art",
	"robot",
	"survey",
];

const timestampSchema = z.number().int().nonnegative();

const stampLedgerSchema = z.object({
	reception: timestampSchema.nullable(),
	photobooth: timestampSchema.nullable(),
	art: timestampSchema.nullable(),
	robot: timestampSchema.nullable(),
	survey: timestampSchema.nullable(),
});

export type StampLedger = z.infer<typeof stampLedgerSchema>;

export type StampProgress = {
	collected: ReadonlyArray<StampCheckpoint>;
	remaining: ReadonlyArray<StampCheckpoint>;
	lastCollectedAt: number | null;
	isComplete: boolean;
};

type MarkStampCollectedInput = {
	ledger: StampLedger;
	checkpoint: StampCheckpoint;
	collectedAt: number;
};

const STAMP_TOKEN_PREFIX = "token-";

const isTimestamp = (value: number | null): value is number => value !== null;

export const createEmptyLedger = (): StampLedger =>
	stampLedgerSchema.parse({
		reception: null,
		photobooth: null,
		art: null,
		robot: null,
		survey: null,
	});

export const isStampCollected = (
	ledger: StampLedger,
	checkpoint: StampCheckpoint,
): boolean => ledger[checkpoint] !== null;

export const markStampCollected = ({
	ledger,
	checkpoint,
	collectedAt,
}: MarkStampCollectedInput): StampLedger =>
	stampLedgerSchema.parse({
		...ledger,
		[checkpoint]: timestampSchema.parse(collectedAt),
	});

export const createStampProgress = (ledger: StampLedger): StampProgress => {
	const collected: ReadonlyArray<StampCheckpoint> = STAMP_SEQUENCE.filter(
		(checkpoint) => isStampCollected(ledger, checkpoint),
	);
	const remaining: ReadonlyArray<StampCheckpoint> = STAMP_SEQUENCE.filter(
		(checkpoint) => !isStampCollected(ledger, checkpoint),
	);
	const lastCollectedAt = STAMP_SEQUENCE.map((checkpoint) => ledger[checkpoint])
		.filter(isTimestamp)
		.reduce<number | null>(
			(latest, current) =>
				latest === null || current > latest ? current : latest,
			null,
		);

	return {
		collected,
		remaining,
		lastCollectedAt,
		isComplete: remaining.length === 0,
	};
};

export const resolveStampToken = (token: string): StampCheckpoint | null => {
	const candidate = token.startsWith(STAMP_TOKEN_PREFIX)
		? token.slice(STAMP_TOKEN_PREFIX.length)
		: null;
	if (candidate === null) {
		return null;
	}

	return STAMP_SEQUENCE.find((checkpoint) => checkpoint === candidate) ?? null;
};

export const InvalidStampTokenError = errorBuilder(
	"InvalidStampTokenError",
	z.object({ token: z.string() }),
);
export type InvalidStampTokenError = InferError<typeof InvalidStampTokenError>;

export const DuplicateStampError = errorBuilder(
	"DuplicateStampError",
	z.object({ checkpoint: StampCheckpoint }),
);
export type DuplicateStampError = InferError<typeof DuplicateStampError>;

export const StampRepositoryError = errorBuilder(
	"StampRepositoryError",
	z.object({
		operation: z.union([z.literal("get"), z.literal("save")]),
	}),
);
export type StampRepositoryError = InferError<typeof StampRepositoryError>;

export type StampLedgerSnapshot = {
	userId: string;
	ledger: StampLedger;
	createdAt: number;
	lastCollectedAt: number | null;
};

export type PersistStampLedgerInput = {
	userId: string;
	ledger: StampLedger;
	collectedAt: number | null;
	createdAt?: number;
	lastCollectedAt?: number | null;
};

export type StampRepository = {
	getByUserId: (
		userId: string,
	) => ResultAsync<StampLedgerSnapshot | null, StampRepositoryError>;
	save: (
		input: PersistStampLedgerInput,
	) => ResultAsync<void, StampRepositoryError>;
};

type CollectStampInput = {
	ledger: StampLedger;
	checkpoint: StampCheckpoint;
	collectedAt: number;
};

export type CollectStampSuccess = {
	ledger: StampLedger;
	progress: StampProgress;
};

export const resolveStampTokenResult = (
	token: string,
): Result<StampCheckpoint, InvalidStampTokenError> => {
	const checkpoint = resolveStampToken(token);
	if (checkpoint === null) {
		return err(
			InvalidStampTokenError("Unknown stamp token provided.", {
				extra: { token },
			}),
		);
	}
	return ok(checkpoint);
};

export const collectStamp = ({
	ledger,
	checkpoint,
	collectedAt,
}: CollectStampInput): Result<CollectStampSuccess, DuplicateStampError> => {
	if (isStampCollected(ledger, checkpoint)) {
		return err(
			DuplicateStampError("Stamp already collected for this attendee.", {
				extra: { checkpoint },
			}),
		);
	}

	const updatedLedger = markStampCollected({
		ledger,
		checkpoint,
		collectedAt,
	});
	const progress = createStampProgress(updatedLedger);

	return ok({
		ledger: updatedLedger,
		progress,
	});
};
