import {
	doc,
	runTransaction,
	type Firestore,
	type Timestamp,
} from "firebase/firestore";
import {
	ALL_STAMP_CHECKPOINTS,
	isStampCheckpointKey,
	isTimestamp,
	type StampCheckpointKey,
	type StampEntry,
} from "@/domain/stamp";

type ClaimStampInput = {
	userId: string;
	checkpoint: StampCheckpointKey;
	collectedAt: Timestamp;
};

type StampDocument = {
	entries: ReadonlyArray<StampEntry>;
	createdAt: Timestamp;
	lastSignedInAt: Timestamp;
	giftReceivedAt: Timestamp | null;
};

type ClaimOutcome =
	| { kind: "duplicate"; document: StampDocument }
	| { kind: "claimed"; document: StampDocument };

type StampRepository = {
	claim: (input: ClaimStampInput) => Promise<ClaimOutcome>;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const parseEntries = (value: unknown): ReadonlyArray<StampEntry> => {
	if (!isRecord(value)) {
		return [];
	}

	return Object.entries(value).flatMap(([checkpoint, collectedAt]) => {
		const resolvedCheckpoint = isStampCheckpointKey(checkpoint)
			? checkpoint
			: null;
		if (!resolvedCheckpoint || !isTimestamp(collectedAt)) {
			return [];
		}
		return [
			{
				checkpoint: resolvedCheckpoint,
				collectedAt,
			},
		];
	});
};

const parseStampDocument = (value: unknown): StampDocument | null => {
	if (!isRecord(value)) {
		return null;
	}
	const createdAtRaw = value.createdAt;
	const lastSignedInAtRaw = value.lastSignedInAt;
	if (!isTimestamp(createdAtRaw) || !isTimestamp(lastSignedInAtRaw)) {
		return null;
	}
	const giftReceivedAtRaw = value.giftReceivedAt;
	const giftReceivedAt = isTimestamp(giftReceivedAtRaw)
		? giftReceivedAtRaw
		: null;
	const entries = parseEntries(value.stamps);
	return {
		entries,
		createdAt: createdAtRaw,
		lastSignedInAt: lastSignedInAtRaw,
		giftReceivedAt,
	};
};

const createEmptyDocument = (collectedAt: Timestamp): StampDocument => ({
	entries: [],
	createdAt: collectedAt,
	lastSignedInAt: collectedAt,
	giftReceivedAt: null,
});

const documentToFirestorePayload = (document: StampDocument) => ({
	stamps: Object.fromEntries(
		document.entries.map((entry) => [entry.checkpoint, entry.collectedAt]),
	),
	createdAt: document.createdAt,
	lastSignedInAt: document.lastSignedInAt,
	giftReceivedAt: document.giftReceivedAt,
});

const buildNextDocument = ({
	document,
	entry,
}: {
	document: StampDocument;
	entry: StampEntry;
}): StampDocument => ({
	entries: [...document.entries, entry],
	createdAt: document.createdAt,
	lastSignedInAt: entry.collectedAt,
	giftReceivedAt: document.giftReceivedAt,
});

const withUniqueEntries = (
	entries: ReadonlyArray<StampEntry>,
): ReadonlyArray<StampEntry> => {
	const seen = new Set<StampCheckpointKey>();
	return entries.filter((entry) => {
		if (seen.has(entry.checkpoint)) {
			return false;
		}
		seen.add(entry.checkpoint);
		return true;
	});
};

const sortEntriesByOrder = (
	entries: ReadonlyArray<StampEntry>,
): ReadonlyArray<StampEntry> =>
	ALL_STAMP_CHECKPOINTS.reduce<ReadonlyArray<StampEntry>>(
		(sorted, checkpoint) => [
			...sorted,
			...entries.filter((entry) => entry.checkpoint === checkpoint),
		],
		[],
	);

const normalizeDocument = (document: StampDocument): StampDocument => {
	const uniqueEntries = withUniqueEntries(document.entries);
	const sortedEntries = sortEntriesByOrder(uniqueEntries);
	return {
		entries: sortedEntries,
		createdAt: document.createdAt,
		lastSignedInAt: document.lastSignedInAt,
		giftReceivedAt: document.giftReceivedAt,
	};
};

const createStampRepository = ({
	firestore,
	collectionPath,
}: {
	firestore: Firestore;
	collectionPath: string;
}): StampRepository => {
	const claim = async ({
		userId,
		checkpoint,
		collectedAt,
	}: ClaimStampInput): Promise<ClaimOutcome> => {
		const reference = doc(firestore, collectionPath, userId);
		return runTransaction(firestore, async (transaction) => {
			const snapshot = await transaction.get(reference);
			const parsedDocument = snapshot.exists()
				? parseStampDocument(snapshot.data())
				: null;
			const baseDocument =
				parsedDocument ?? createEmptyDocument(collectedAt);
			const alreadyCollected = baseDocument.entries.some(
				(entry) => entry.checkpoint === checkpoint,
			);
			if (alreadyCollected) {
				return { kind: "duplicate", document: baseDocument };
			}
			const nextDocument = normalizeDocument(
				buildNextDocument({
					document: baseDocument,
					entry: { checkpoint, collectedAt },
				}),
			);
			transaction.set(reference, documentToFirestorePayload(nextDocument), {
				merge: true,
			});
			return { kind: "claimed", document: nextDocument };
		});
	};

	return { claim };
};

export { createStampRepository };
export type { ClaimOutcome, ClaimStampInput, StampRepository };
