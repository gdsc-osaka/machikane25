type StampCheckpoint =
	| "reception"
	| "photobooth"
	| "art"
	| "robot"
	| "survey";

type StampLedger = Record<StampCheckpoint, number | null>;

type StampProgress = {
	collected: ReadonlyArray<StampCheckpoint>;
	remaining: ReadonlyArray<StampCheckpoint>;
	ledger: StampLedger;
};

type ClaimStampPayload = {
	checkpoint: StampCheckpoint;
	collectedAt: number;
};

type ClaimStampSuccess = {
	outcome: "claimed";
	ledger: StampLedger;
	progress: StampProgress;
};

type ClaimStampDuplicate = {
	outcome: "duplicate";
	ledger: StampLedger;
	progress: StampProgress;
};

type ClaimStampResult = ClaimStampSuccess | ClaimStampDuplicate;

const STAMP_ORDER: ReadonlyArray<StampCheckpoint> = [
	"reception",
	"photobooth",
	"art",
	"robot",
	"survey",
];

const createEmptyLedger = (): StampLedger => ({
	reception: null,
	photobooth: null,
	art: null,
	robot: null,
	survey: null,
});

const isStampCheckpoint = (value: unknown): value is StampCheckpoint =>
	typeof value === "string" && STAMP_ORDER.includes(value as StampCheckpoint);

const isMillis = (value: unknown): value is number =>
	typeof value === "number" && Number.isFinite(value);

const toProgress = (ledger: StampLedger): StampProgress => {
	const collected = STAMP_ORDER.filter((checkpoint) => ledger[checkpoint] !== null);
	const remaining = STAMP_ORDER.filter(
		(checkpoint) => ledger[checkpoint] === null,
	);
	return {
		collected,
		remaining,
		ledger,
	};
};

const claimStamp = (
	ledger: StampLedger,
	payload: ClaimStampPayload,
): ClaimStampResult => {
	const current = ledger[payload.checkpoint];
	if (current !== null) {
		return {
			outcome: "duplicate",
			ledger,
			progress: toProgress(ledger),
		};
	}

	const nextLedger: StampLedger = {
		...ledger,
		[payload.checkpoint]: payload.collectedAt,
	};

	return {
		outcome: "claimed",
		ledger: nextLedger,
		progress: toProgress(nextLedger),
	};
};

const mergeLedger = (
	source: StampLedger | null | undefined,
): StampLedger => {
	if (!source) {
		return createEmptyLedger();
	}
	return {
		reception: isMillis(source.reception) ? source.reception : null,
		photobooth: isMillis(source.photobooth) ? source.photobooth : null,
		art: isMillis(source.art) ? source.art : null,
		robot: isMillis(source.robot) ? source.robot : null,
		survey: isMillis(source.survey) ? source.survey : null,
	};
};

export {
	STAMP_ORDER,
	claimStamp,
	createEmptyLedger,
	isStampCheckpoint,
	mergeLedger,
	toProgress,
};

export type {
	ClaimStampDuplicate,
	ClaimStampPayload,
	ClaimStampResult,
	ClaimStampSuccess,
	StampCheckpoint,
	StampLedger,
	StampProgress,
};
