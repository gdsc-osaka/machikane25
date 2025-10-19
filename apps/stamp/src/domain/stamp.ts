type StampCheckpoint =
	| "reception"
	| "photobooth"
	| "art"
	| "robot"
	| "survey";

const STAMP_SEQUENCE: ReadonlyArray<StampCheckpoint> = [
	"reception",
	"photobooth",
	"art",
	"robot",
	"survey",
];

type StampLedger = Record<StampCheckpoint, number | null>;

type StampProgress = {
	collected: ReadonlyArray<StampCheckpoint>;
	remaining: ReadonlyArray<StampCheckpoint>;
	lastCollectedAt: number | null;
	isComplete: boolean;
};

type StampTokenResolution =
	| {
			outcome: "found";
			checkpoint: StampCheckpoint;
	  }
	| {
			outcome: "invalid-token";
	  };

const ENV_TOKEN_MAP: Record<StampCheckpoint, string> = {
	reception:
		process.env.NEXT_PUBLIC_STAMP_TOKEN_RECEPTION ?? "token-reception",
	photobooth:
		process.env.NEXT_PUBLIC_STAMP_TOKEN_PHOTOBOOTH ?? "token-photobooth",
	art: process.env.NEXT_PUBLIC_STAMP_TOKEN_ART ?? "token-art",
	robot: process.env.NEXT_PUBLIC_STAMP_TOKEN_ROBOT ?? "token-robot",
	survey: process.env.NEXT_PUBLIC_STAMP_TOKEN_SURVEY ?? "token-survey",
};

const createEmptyLedger = (): StampLedger => ({
	reception: null,
	photobooth: null,
	art: null,
	robot: null,
	survey: null,
});

const isStampCollected = (
	ledger: StampLedger,
	checkpoint: StampCheckpoint,
): boolean => ledger[checkpoint] !== null;

const markStampCollected = ({
	ledger,
	checkpoint,
	collectedAt,
}: {
	ledger: StampLedger;
	checkpoint: StampCheckpoint;
	collectedAt: number;
}): StampLedger => ({
	...ledger,
	[checkpoint]: collectedAt,
});

const createStampProgress = (ledger: StampLedger): StampProgress => {
	const collected = STAMP_SEQUENCE.filter((checkpoint) =>
		isStampCollected(ledger, checkpoint),
	);
	const remaining = STAMP_SEQUENCE.filter(
		(checkpoint) => !isStampCollected(ledger, checkpoint),
	);
	const lastCollectedAt = collected.reduce<number | null>(
		(latest, checkpoint) => {
			const timestamp = ledger[checkpoint];
			if (timestamp === null) {
				return latest;
			}
			if (latest === null) {
				return timestamp;
			}
			return timestamp > latest ? timestamp : latest;
		},
		null,
	);

	return {
		collected,
		remaining,
		lastCollectedAt,
		isComplete: remaining.length === 0,
	};
};

const resolveStampToken = (token: string): StampCheckpoint | null =>
	STAMP_SEQUENCE.find((checkpoint) => ENV_TOKEN_MAP[checkpoint] === token) ??
	null;

const resolveStampTokenResult = (token: string): StampTokenResolution => {
	const checkpoint = resolveStampToken(token);
	if (checkpoint === null) {
		return { outcome: "invalid-token" };
	}
	return {
		outcome: "found",
		checkpoint,
	};
};

export {
	createEmptyLedger,
	createStampProgress,
	isStampCollected,
	markStampCollected,
	resolveStampToken,
	resolveStampTokenResult,
	STAMP_SEQUENCE,
	ENV_TOKEN_MAP,
};

export type { StampCheckpoint, StampLedger, StampProgress, StampTokenResolution };
