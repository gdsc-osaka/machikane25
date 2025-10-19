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
		if (!isRecord(raw)) {
			return ledger;
		}
		const candidate = raw[checkpoint];
		if (candidate === null) {
			return ledger;
		}
		if (!isTimestamp(candidate)) {
			return ledger;
		}
		return markStampCollected({
			ledger,
			checkpoint,
			collectedAt: candidate.toMillis(),
		});
	}, createEmptyLedger());

const stampLedgerConverter: FirestoreDataConverter<StampLedgerRecord> = {
	toFirestore(
		data: WithFieldValue<StampLedgerRecord>,
	): Record<string, unknown> {
		return {
			createdAt: timestampUtils.fromMaybeMillis(data.createdAt),
			lastCollectedAt: timestampUtils.fromMaybeMillis(data.lastCollectedAt),
			stamps: data.ledger,
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
