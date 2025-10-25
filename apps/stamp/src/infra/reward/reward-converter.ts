import {
	type FirestoreDataConverter,
	type QueryDocumentSnapshot,
	Timestamp,
	type WithFieldValue,
} from "firebase/firestore";
import {
	type RewardRecord,
	RewardRecordInvariantError,
	rewardRecordSchema,
} from "@/domain/reward";
import { timestampUtils } from "@/infra/timestamp";

const isTimestamp = (value: unknown): value is Timestamp =>
	value instanceof Timestamp;

const toMillis = (value: unknown): number | null =>
	isTimestamp(value) ? value.toMillis() : null;

const rewardConverter: FirestoreDataConverter<RewardRecord> = {
	toFirestore(record: WithFieldValue<RewardRecord>): Record<string, unknown> {
		const validation = rewardRecordSchema.safeParse(record);
		if (!validation.success) {
			throw RewardRecordInvariantError("Failed to serialize reward record.", {
				extra: { reason: "invalid_record", issues: validation.error.issues },
			});
		}
		const payload = validation.data;
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
		const qrPayload = typeof data.qrPayload === "string" ? data.qrPayload : "";

		const candidate = {
			attendeeId: snapshot.id,
			qrPayload,
			issuedAt,
			redeemedAt,
		};
		const validation = rewardRecordSchema.safeParse(candidate);
		if (!validation.success) {
			throw RewardRecordInvariantError("Failed to deserialize reward record.", {
				extra: { reason: "invalid_record", issues: validation.error.issues },
			});
		}
		return validation.data;
	},
};

export { rewardConverter };
