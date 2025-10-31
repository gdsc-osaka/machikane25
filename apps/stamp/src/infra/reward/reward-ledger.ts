import { collection, doc, type Firestore, setDoc } from "firebase/firestore";
import { ResultAsync } from "neverthrow";
import {
	type MarkRewardRedeemedInput,
	RewardLedgerError,
	type RewardLedgerPort,
} from "@/domain/reward";
import { timestampUtils } from "@/infra/timestamp";

const USERS_COLLECTION = "users";

const createRewardLedger = (firestore: Firestore): RewardLedgerPort => {
	const usersCollection = collection(firestore, USERS_COLLECTION);

	const markRedeemed = ({ attendeeId, redeemedAt }: MarkRewardRedeemedInput) =>
		ResultAsync.fromPromise(
			setDoc(
				doc(usersCollection, attendeeId),
				{
					giftReceivedAt: timestampUtils.fromMaybeMillis(redeemedAt),
				},
				{ merge: true },
			),
			(cause) =>
				RewardLedgerError("Failed to persist reward redemption.", {
					cause,
					extra: { operation: "markRedeemed" },
				}),
		);

	return {
		markRedeemed,
	};
};

export { createRewardLedger, USERS_COLLECTION };
