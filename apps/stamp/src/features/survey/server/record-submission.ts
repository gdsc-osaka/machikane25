"use server";

import { getAdminFirestore } from "@/lib/firebase/admin";

export type RecordSurveySubmissionInput = {
	uid: string;
	status: "success" | "error";
	payload: Record<string, unknown>;
	submittedAt: number;
	googleResponseId?: string;
	errorMessage?: string;
};

export type RecordSurveySubmissionResult = {
	submissionId: string;
	submittedAt: number;
};

export const recordSurveySubmission = async (
	input: RecordSurveySubmissionInput,
): Promise<RecordSurveySubmissionResult> => {
	const firestore = getAdminFirestore();
	const submissions = firestore.collection("surveySubmissions");
	const submissionRef = submissions.doc();

	await submissionRef.set({
		uid: input.uid,
		submittedAt: input.submittedAt,
		googleResponseId: input.googleResponseId ?? null,
		status: input.status,
		errorMessage: input.errorMessage ?? null,
		payload: input.payload,
	});

	return {
		submissionId: submissionRef.id,
		submittedAt: input.submittedAt,
	};
};
