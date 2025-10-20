import {
	collection,
	doc,
	type Firestore,
	setDoc,
} from "firebase/firestore";
import { timestampUtils } from "@/infra/timestamp";

type MarkSurveyCompletedInput = {
	attendeeId: string;
	completedAt: number;
	responseId: string;
};

const SURVEY_LEDGER_COLLECTION = "surveyLedger";
const USERS_COLLECTION = "users";

const createSurveyLedger = (firestore: Firestore) => {
	const surveyLedgerCollection = collection(
		firestore,
		SURVEY_LEDGER_COLLECTION,
	);
	const usersCollection = collection(firestore, USERS_COLLECTION);

	const markCompleted = async ({
		attendeeId,
		completedAt,
		responseId,
	}: MarkSurveyCompletedInput): Promise<void> => {
		const completedAtTimestamp = timestampUtils.fromMaybeMillis(completedAt);
		const ledgerUpdate = setDoc(
			doc(surveyLedgerCollection, attendeeId),
			{
				completedAt: completedAtTimestamp,
				responseId,
			},
			{ merge: true },
		);

		const attendeeUpdate = setDoc(
			doc(usersCollection, attendeeId),
			{
				stamps: {
					survey: completedAtTimestamp,
				},
				survey: {
					completedAt: completedAtTimestamp,
					responseId,
				},
			},
			{ merge: true },
		);

		try {
			await Promise.all([ledgerUpdate, attendeeUpdate]);
		} catch (cause) {
			throw new Error("Failed to record survey completion.", { cause });
		}
	};

	return {
		markCompleted,
	};
};

export { createSurveyLedger, SURVEY_LEDGER_COLLECTION };
export type { MarkSurveyCompletedInput };
