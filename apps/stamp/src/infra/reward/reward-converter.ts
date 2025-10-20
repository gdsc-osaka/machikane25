import {
	type FirestoreDataConverter,
	type QueryDocumentSnapshot,
	Timestamp,
	type WithFieldValue,
} from "firebase/firestore";
import {
	createRewardRecord,
	RewardRecordInvariantError,
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
			return createRewardRecord(record).match(
				(payload) => ({
					qrPayload: payload.qrPayload,
					issuedAt: timestampUtils.fromMaybeMillis(payload.issuedAt),
					redeemedAt: timestampUtils.fromMaybeMillis(payload.redeemedAt),
				}),
				(error) => {
					throw RewardRecordInvariantError(
						"Failed to serialize reward record.",
						{
							cause: error,
							extra: { reason: "invalid_record" },
						},
					);
				},
			);
		},
	fromFirestore(
		snapshot: QueryDocumentSnapshot<Record<string, unknown>>,
	): RewardRecord {
		const data = snapshot.data();
		const issuedAt = toMillis(data.issuedAt) ?? Date.now();
		const redeemedAt = toMillis(data.redeemedAt);
		const qrPayload =
			typeof data.qrPayload === "string" ? data.qrPayload : "";

		const candidate: RewardRecord = {
			attendeeId: snapshot.id,
			qrPayload,
			issuedAt,
			redeemedAt,
		};

		return createRewardRecord(candidate).match(
			(record) => record,
			(error) => {
				throw RewardRecordInvariantError(
					"Failed to deserialize reward record.",
					{
						cause: error,
						extra: { reason: "invalid_record" },
					},
				);
			},
		);
	},
};

export { rewardConverter };
