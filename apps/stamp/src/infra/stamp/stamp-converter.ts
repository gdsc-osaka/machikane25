import {
	type FirestoreDataConverter,
	type QueryDocumentSnapshot,
	type SnapshotOptions,
	Timestamp,
} from "firebase/firestore";
import {
	createEmptyLedger,
	STAMP_SEQUENCE,
	type StampCheckpoint,
	type StampLedger,
} from "@/domain/stamp";

type FirestoreLedgerField = Record<StampCheckpoint, Timestamp | null>;

type FirestoreStampDocument = {
	createdAt: Timestamp;
	lastCollectedAt?: Timestamp | null;
	ledger?: Partial<FirestoreLedgerField>;
};

type StampRecord = {
	userId: string;
	ledger: StampLedger;
	createdAt: number;
	lastCollectedAt: number | null;
};

const isTimestamp = (value: unknown): value is Timestamp =>
	value instanceof Timestamp;

const toMillis = (value: Timestamp | null | undefined): number | null => {
	if (value === null || value === undefined) {
		return null;
	}
	return value.toMillis();
};

const createEmptyTimestampLedger = (): FirestoreLedgerField => ({
	reception: null,
	photobooth: null,
	art: null,
	robot: null,
	survey: null,
});

const mapLedgerFromFirestore = (
	ledger: Partial<FirestoreLedgerField> | undefined,
): StampLedger =>
	STAMP_SEQUENCE.reduce<StampLedger>(
		(acc, checkpoint) => ({
			...acc,
			[checkpoint]: toMillis(ledger?.[checkpoint]),
		}),
		createEmptyLedger(),
	);

const mapLedgerToFirestore = (ledger: StampLedger): FirestoreLedgerField =>
	STAMP_SEQUENCE.reduce<FirestoreLedgerField>(
		(acc, checkpoint) => {
			const value = ledger[checkpoint];
			const timestamp =
				value === null ? null : Timestamp.fromMillis(value);
			return {
				...acc,
				[checkpoint]: timestamp,
			};
		},
		createEmptyTimestampLedger(),
	);

const stampConverter: FirestoreDataConverter<StampRecord, FirestoreStampDocument> = {
	toFirestore(record) {
		return {
			createdAt: Timestamp.fromMillis(record.createdAt),
			lastCollectedAt:
				record.lastCollectedAt === null
					? null
					: Timestamp.fromMillis(record.lastCollectedAt),
			ledger: mapLedgerToFirestore(record.ledger),
		};
	},
	fromFirestore(
		snapshot: QueryDocumentSnapshot<FirestoreStampDocument>,
		options?: SnapshotOptions,
	) {
		const data = snapshot.data(options);
		const createdAt = isTimestamp(data.createdAt)
			? data.createdAt.toMillis()
			: Date.now();
		const lastCollectedAt = toMillis(data.lastCollectedAt);
		const ledger = mapLedgerFromFirestore(data.ledger);

		return {
			userId: snapshot.id,
			createdAt,
			lastCollectedAt,
			ledger,
		};
	},
};

export {
	createEmptyTimestampLedger,
	mapLedgerFromFirestore,
	mapLedgerToFirestore,
	stampConverter,
};

export type { FirestoreLedgerField, FirestoreStampDocument, StampRecord };
