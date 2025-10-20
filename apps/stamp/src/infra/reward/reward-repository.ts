import {
	collection,
	doc,
	type Firestore,
	getDoc,
	setDoc,
} from "firebase/firestore";
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

	const findByAttendeeId = async (
		attendeeId: string,
	): Promise<RewardRecord | null> => {
		try {
			const snapshot = await getDoc(doc(rewardsCollection, attendeeId));
			if (!snapshot.exists()) {
				return null;
			}
			return snapshot.data();
		} catch (cause) {
			throw RewardRepositoryError("Failed to load reward record.", {
				cause,
				extra: { operation: "find" },
			});
		}
	};

	const save = async (record: RewardRecord): Promise<void> => {
		try {
			await setDoc(doc(rewardsCollection, record.attendeeId), record, {
				merge: true,
			});
		} catch (cause) {
			throw RewardRepositoryError("Failed to persist reward record.", {
				cause,
				extra: { operation: "save" },
			});
		}
	};

	return {
		findByAttendeeId,
		save,
	};
};

export { createRewardRepository, REWARDS_COLLECTION };
