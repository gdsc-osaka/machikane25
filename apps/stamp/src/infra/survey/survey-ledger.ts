import {
	collection,
	doc,
	type Firestore,
	setDoc,
} from "firebase/firestore";
import { ResultAsync } from "neverthrow";
import {
	type MarkSurveyCompletedInput,
	SurveyLedgerError,
} from "@/domain/survey";
import { timestampUtils } from "@/infra/timestamp";

const SURVEY_LEDGER_COLLECTION = "surveyLedger";
const USERS_COLLECTION = "users";

const createSurveyLedger = (firestore: Firestore) => {
	const surveyLedgerCollection = collection(
		firestore,
		SURVEY_LEDGER_COLLECTION,
	);
	const usersCollection = collection(firestore, USERS_COLLECTION);

	const markCompleted = ({
		attendeeId,
		completedAt,
		responseId,
	}: MarkSurveyCompletedInput): ResultAsync<void, SurveyLedgerError> => {
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

		return ResultAsync.fromPromise(
			Promise.all([ledgerUpdate, attendeeUpdate]),
			(cause) =>
				SurveyLedgerError("Failed to record survey completion.", {
					cause,
					extra: { operation: "markCompleted" },
				}),
		).map(() => undefined);
	};

	return {
		markCompleted,
	};
};

export {
	createSurveyLedger,
	SURVEY_LEDGER_COLLECTION,
};
export type { MarkSurveyCompletedInput };
