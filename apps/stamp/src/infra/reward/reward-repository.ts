import {
	collection,
	doc,
	type Firestore,
	getDoc,
	setDoc,
} from "firebase/firestore";
import { ResultAsync } from "neverthrow";
import {
	RewardRepositoryError,
	type RewardRecord,
	type RewardRepository,
} from "@/domain/reward";
import { rewardConverter } from "./reward-converter";

const REWARDS_COLLECTION = "rewards";

const createRewardRepository = (firestore: Firestore): RewardRepository => {
	const rewardsCollection = collection(
		firestore,
		REWARDS_COLLECTION,
	).withConverter(rewardConverter);

	const findByAttendeeId = (
		attendeeId: string,
	): ResultAsync<RewardRecord | null, RewardRepositoryError> =>
		ResultAsync.fromPromise(getDoc(doc(rewardsCollection, attendeeId)), (cause) =>
			RewardRepositoryError("Failed to load reward record.", {
				cause,
				extra: { operation: "find" },
			}),
		).map((snapshot) => {
			if (!snapshot.exists()) {
				return null;
			}
			return snapshot.data();
		});

	const save = (record: RewardRecord): ResultAsync<void, RewardRepositoryError> =>
		ResultAsync.fromPromise(
			setDoc(doc(rewardsCollection, record.attendeeId), record, {
				merge: true,
			}),
			(cause) =>
				RewardRepositoryError("Failed to persist reward record.", {
					cause,
					extra: { operation: "save" },
				}),
		);

	return {
		findByAttendeeId,
		save,
	};
};

export { createRewardRepository, REWARDS_COLLECTION };
