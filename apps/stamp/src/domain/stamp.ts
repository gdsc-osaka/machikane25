import { Timestamp } from "firebase/firestore";

type StampCheckpointKey =
	| "reception"
	| "photobooth"
	| "art"
	| "robot"
	| "survey";

type StampLedger = {
	reception: Timestamp | null;
	photobooth: Timestamp | null;
	art: Timestamp | null;
	robot: Timestamp | null;
	survey: Timestamp | null;
};

type StampEntry = {
	checkpoint: StampCheckpointKey;
	collectedAt: Timestamp;
};

type StampProgress = {
	collected: ReadonlyArray<StampCheckpointKey>;
	ledger: StampLedger;
};

const ALL_STAMP_CHECKPOINTS: ReadonlyArray<StampCheckpointKey> = [
	"reception",
	"photobooth",
	"art",
	"robot",
	"survey",
];

const emptyLedger: StampLedger = {
	reception: null,
	photobooth: null,
	art: null,
	robot: null,
	survey: null,
};

const isTimestamp = (value: unknown): value is Timestamp =>
	value instanceof Timestamp;

const isStampCheckpointKey = (value: unknown): value is StampCheckpointKey =>
	typeof value === "string" &&
	ALL_STAMP_CHECKPOINTS.some((checkpoint) => checkpoint === value);

const createLedgerFromEntries = (
	entries: ReadonlyArray<StampEntry>,
): StampLedger =>
	ALL_STAMP_CHECKPOINTS.reduce<StampLedger>(
		(ledger, checkpoint) => {
			const collected = entries.find(
				(entry) => entry.checkpoint === checkpoint,
			);
			return {
				...ledger,
				[checkpoint]: collected ? collected.collectedAt : null,
			};
		},
		emptyLedger,
	);

const buildStampProgress = ({
	entries,
	order,
}: {
	entries: ReadonlyArray<StampEntry>;
	order: ReadonlyArray<StampCheckpointKey>;
}): StampProgress => {
	const ledger = createLedgerFromEntries(entries);
	const collected = order.filter(
		(checkpoint) => ledger[checkpoint] !== null,
	);
	return { collected, ledger };
};

export {
	ALL_STAMP_CHECKPOINTS,
	buildStampProgress,
	isStampCheckpointKey,
	isTimestamp,
};

export type { StampCheckpointKey, StampEntry, StampLedger, StampProgress };
