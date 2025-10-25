import {
	type FirestoreDataConverter,
	type QueryDocumentSnapshot,
	Timestamp,
	type WithFieldValue,
} from "firebase/firestore";
import {
	createEmptyLedger,
	markStampCollected,
	STAMP_SEQUENCE,
	type StampCheckpoint,
	type StampLedger,
} from "@/domain/stamp";
import { timestampUtils } from "@/infra/timestamp";

type StampLedgerRecord = {
	ledger: StampLedger;
	createdAt: number;
	lastCollectedAt: number | null;
};

const isTimestamp = (value: unknown): value is Timestamp =>
	value instanceof Timestamp;

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null;

const toMillis = (value: unknown): number | null =>
	isTimestamp(value) ? value.toMillis() : null;

const toLedger = (raw: unknown): StampLedger =>
	STAMP_SEQUENCE.reduce<StampLedger>((ledger, checkpoint) => {
		const collectedAt =
			isRecord(raw) && isTimestamp(raw[checkpoint])
				? raw[checkpoint].toMillis()
				: null;
		return collectedAt
			? markStampCollected({ ledger, checkpoint, collectedAt })
			: ledger;
	}, createEmptyLedger());

const stampLedgerConverter: FirestoreDataConverter<StampLedgerRecord> = {
	toFirestore(
		data: WithFieldValue<StampLedgerRecord>,
	): Record<string, unknown> {
		const convertedStamps: Record<string, unknown> = {};

		for (const checkpoint of STAMP_SEQUENCE) {
			const ledger = data.ledger as Record<string, number | null>;
			const millis = ledger[checkpoint];
			convertedStamps[checkpoint] = timestampUtils.fromMaybeMillis(millis);
		}

		return {
			createdAt: timestampUtils.fromMaybeMillis(data.createdAt),
			lastCollectedAt: timestampUtils.fromMaybeMillis(data.lastCollectedAt),
			stamps: convertedStamps,
		};
	},
	fromFirestore(
		snapshot: QueryDocumentSnapshot<Record<string, unknown>>,
	): StampLedgerRecord {
		const data = snapshot.data();
		const createdAt = toMillis(data.createdAt) ?? Date.now();
		const lastCollectedAt = toMillis(data.lastCollectedAt);
		const ledger = toLedger(data.stamps);

		return {
			ledger,
			createdAt,
			lastCollectedAt,
		};
	},
};

export { stampLedgerConverter };
export type { StampLedgerRecord };
