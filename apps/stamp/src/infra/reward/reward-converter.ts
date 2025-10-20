import {
	type FirestoreDataConverter,
	type QueryDocumentSnapshot,
	Timestamp,
	type WithFieldValue,
} from "firebase/firestore";
import {
	rewardRecordSchema,
	type RewardRecord,
} from "@/domain/reward";
import { timestampUtils } from "@/infra/timestamp";

const isTimestamp = (value: unknown): value is Timestamp =>
	value instanceof Timestamp;

const toMillis = (value: unknown): number | null =>
	isTimestamp(value) ? value.toMillis() : null;

const rewardConverter: FirestoreDataConverter<RewardRecord> = {
	toFirestore(
		record: WithFieldValue<RewardRecord>,
	): Record<string, unknown> {
		const payload = rewardRecordSchema.parse(record);
		return {
			qrPayload: payload.qrPayload,
			issuedAt: timestampUtils.fromMaybeMillis(payload.issuedAt),
			redeemedAt: timestampUtils.fromMaybeMillis(payload.redeemedAt),
		};
	},
	fromFirestore(
		snapshot: QueryDocumentSnapshot<Record<string, unknown>>,
	): RewardRecord {
		const data = snapshot.data();
		const issuedAt = toMillis(data.issuedAt) ?? Date.now();
		const redeemedAt = toMillis(data.redeemedAt);
		const qrPayload =
			typeof data.qrPayload === "string" ? data.qrPayload : "";

		return rewardRecordSchema.parse({
			attendeeId: snapshot.id,
			qrPayload,
			issuedAt,
			redeemedAt,
		});
	},
};

export { rewardConverter };
