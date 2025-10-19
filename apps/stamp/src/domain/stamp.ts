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
