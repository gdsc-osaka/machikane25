"use server";

import { randomUUID } from "node:crypto";
import { z } from "zod";
import { createSubmitSurveyService } from "@/application/survey/submit-survey";
import type { SubmitSurveySuccess } from "@/application/survey/submit-survey";
import { getSurveyFormConfig } from "@/infra/remote-config/survey";
import { createRewardRepository } from "@/infra/reward/reward-repository";
import { createSurveyLedger } from "@/infra/survey/survey-ledger";

const surveyAnswersSchema = z.object({
	ratingPhotobooth: z.number().int().min(1).max(5),
	ratingAquarium: z.number().int().min(1).max(5),
	ratingStampRally: z.number().int().min(1).max(5),
	freeComment: z.string().nullable(),
});

const submitSurveyActionInputSchema = z.object({
	attendeeId: z.string().min(1),
	answers: surveyAnswersSchema,
});

type SubmitSurveyActionInput = z.infer<typeof submitSurveyActionInputSchema>;

type SurveyFormEntryIds = ReturnType<typeof getSurveyFormConfig>["entryIds"];

const createSurveyFormData = ({
	attendeeId,
	answers,
	entryIds,
}: SubmitSurveyActionInput & { entryIds: SurveyFormEntryIds }) => {
	const formData = new FormData();
	formData.set(entryIds.attendeeId, attendeeId);
	formData.set(entryIds.ratingPhotobooth, String(answers.ratingPhotobooth));
	formData.set(entryIds.ratingAquarium, String(answers.ratingAquarium));
	formData.set(entryIds.ratingStampRally, String(answers.ratingStampRally));
	formData.set(entryIds.freeComment, answers.freeComment ?? "");
	return formData;
};

const hasFirebaseConfig = (): boolean => {
	const raw = process.env.NEXT_PUBLIC_FIREBASE_CONFIG;
	return typeof raw === "string" && raw.trim().length > 0;
};

const createInMemorySubmitSurveyService = () =>
	createSubmitSurveyService({
		surveyLedger: {
			markCompleted: async () => {},
		},
		rewards: {
			findByAttendeeId: async () => null,
			save: async () => {},
		},
	});

const resolveSubmitSurveyService = async () => {
	if (!hasFirebaseConfig()) {
		if (process.env.NODE_ENV === "test") {
			return createInMemorySubmitSurveyService();
		}
		throw new Error(
			"NEXT_PUBLIC_FIREBASE_CONFIG is not defined. Please set it before submitting surveys.",
		);
	}

	const { getFirebaseClients } = await import("@/firebase");
	const { firestore } = getFirebaseClients();

	return createSubmitSurveyService({
		surveyLedger: createSurveyLedger(firestore),
		rewards: createRewardRepository(firestore),
	});
};

const submitSurveyAction = async (
	rawInput: SubmitSurveyActionInput,
): Promise<SubmitSurveySuccess> => {
	const input = submitSurveyActionInputSchema.parse(rawInput);
	const config = getSurveyFormConfig();
	const formData = createSurveyFormData({
		...input,
		entryIds: config.entryIds,
	});

	const response = await fetch(config.formResponseUrl, {
		method: "POST",
		body: formData,
	});

	if (!response.ok) {
		throw new Error("Failed to submit survey to Google Forms.");
	}

	const submitSurveyService = await resolveSubmitSurveyService();

	return submitSurveyService.submit({
		attendeeId: input.attendeeId,
		answers: input.answers,
		responseId: `${input.attendeeId}:${randomUUID()}`,
	});
};

export { submitSurveyAction };
