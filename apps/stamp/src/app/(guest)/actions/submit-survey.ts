"use server";

import { randomUUID } from "node:crypto";
import { match, P } from "ts-pattern";
import { errAsync, okAsync, Result, ResultAsync } from "neverthrow";
import { errorBuilder, type InferError } from "obj-err";
import { z } from "zod";
import {
	createSubmitSurveyService,
	RewardSnapshotError,
	SubmitSurveyValidationError,
	type SubmitSurveyFailure,
	type SubmitSurveySuccess,
} from "@/application/survey/submit-survey";
import {
	RewardQrEncodingError,
	RewardRecordInvariantError,
	RewardRepositoryError,
} from "@/domain/reward";
import { SurveyLedgerError } from "@/domain/survey";
import {
	getSurveyFormConfig,
	type SurveyFormConfig,
	SurveyFormConfigError,
} from "@/infra/remote-config/survey";
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

type SurveyFormEntryIds = SurveyFormConfig["entryIds"];

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

const SubmitSurveyActionError = errorBuilder(
	"SubmitSurveyActionError",
	z.object({
		reason: z.union([
			z.literal("invalid_input"),
			z.literal("config_unavailable"),
			z.literal("form_submission_failed"),
			z.literal("service_unavailable"),
		]),
		status: z.number().optional(),
		field: z.string().optional(),
	}),
);

type SubmitSurveyActionError = InferError<typeof SubmitSurveyActionError>;

const fromResult = <Value, Failure>(
	result: Result<Value, Failure>,
): ResultAsync<Value, Failure> =>
	(() => {
		try {
			return okAsync<Value, Failure>(result._unsafeUnwrap());
		} catch {
			return errAsync<Value, Failure>(result._unsafeUnwrapErr());
		}
	})();

const hasFirebaseConfig = (): boolean => {
	const raw = process.env.NEXT_PUBLIC_FIREBASE_CONFIG;
	return typeof raw === "string" && raw.trim().length > 0;
};

const createInMemorySubmitSurveyService = () =>
	createSubmitSurveyService({
		surveyLedger: {
			markCompleted: () => okAsync(undefined),
		},
		rewards: {
			findByAttendeeId: () => okAsync(null),
			save: () => okAsync(undefined),
		},
	});

const resolveSubmitSurveyService = (): ResultAsync<
	ReturnType<typeof createSubmitSurveyService>,
	SubmitSurveyActionError
> => {
	if (!hasFirebaseConfig()) {
		if (process.env.NODE_ENV === "test") {
			return okAsync(createInMemorySubmitSurveyService());
		}
		return errAsync(
			SubmitSurveyActionError("Survey submission service is unavailable.", {
				extra: { reason: "service_unavailable" },
			}),
		);
	}

	return ResultAsync.fromPromise(
		import("@/firebase"),
		(cause) =>
			SubmitSurveyActionError("Survey submission service is unavailable.", {
				cause,
				extra: { reason: "service_unavailable" },
			}),
	)
		.map(({ getFirebaseClients }) => {
			const { firestore } = getFirebaseClients();
			return createSubmitSurveyService({
				surveyLedger: createSurveyLedger(firestore),
				rewards: createRewardRepository(firestore),
			});
		});
};

const mapSurveyConfigError = (
	error: SurveyFormConfigError,
): SubmitSurveyActionError => {
	const reason = error.extra?.reason;
	if (reason === "missing_entry_id") {
		return SubmitSurveyActionError(
			"Survey configuration is missing an entry identifier.",
			{
				extra: {
					reason: "config_unavailable",
					field: error.extra?.field,
				},
			},
		);
	}

	return SubmitSurveyActionError("Survey configuration is unavailable.", {
		extra: { reason: "config_unavailable" },
	});
};

const submitToGoogleForms = (
	formResponseUrl: string,
	formData: FormData,
): ResultAsync<void, SubmitSurveyActionError> =>
	ResultAsync.fromPromise(
		fetch(formResponseUrl, {
			method: "POST",
			body: formData,
		}),
		(cause) =>
			SubmitSurveyActionError("Failed to submit survey to Google Forms.", {
				cause,
				extra: { reason: "form_submission_failed" },
			}),
	)
		.andThen((response) =>
			response.ok
				? okAsync(undefined)
				: errAsync(
					SubmitSurveyActionError(
						"Failed to submit survey to Google Forms.",
						{
							extra: {
								reason: "form_submission_failed",
								status: response.status,
							},
						},
					),
				),
		);

const mapActionFailureToError = (
	error: SubmitSurveyActionError | SubmitSurveyFailure,
): Error => {
	const message = match(error)
		.with(
			P.when(SubmitSurveyActionError.isFn),
			(actionError) =>
				match(actionError.extra?.reason)
					.with("invalid_input", () =>
						"Survey submission payload failed validation.",
					)
					.with("config_unavailable", () =>
						"Survey configuration is unavailable.",
					)
					.with("form_submission_failed", () =>
						"Failed to submit survey to Google Forms.",
					)
					.with("service_unavailable", () =>
						"Survey submission service is unavailable.",
					)
					.otherwise(() => "Unable to submit survey."),
		)
		.with(
			P.when(SubmitSurveyValidationError.isFn),
			() => "Survey submission payload failed validation.",
		)
		.with(
			P.when(SurveyLedgerError.isFn),
			() => "Unable to record survey completion.",
		)
		.with(
			P.when(RewardRepositoryError.isFn),
			() => "Unable to persist reward record.",
		)
		.with(
			P.when(RewardQrEncodingError.isFn),
			() => "Failed to generate reward QR payload.",
		)
		.with(
			P.when(RewardRecordInvariantError.isFn),
			() => "Reward record failed validation.",
		)
		.with(
			P.when(RewardSnapshotError.isFn),
			() => "Reward snapshot is missing a QR payload.",
		)
		.otherwise(() => "Unable to submit survey.");

	return new Error(message);
};

const submitSurveyAction = async (
	rawInput: SubmitSurveyActionInput,
): Promise<SubmitSurveySuccess> => {
	const parsedInput = Result.fromThrowable(
		() => submitSurveyActionInputSchema.parse(rawInput),
		(cause) =>
			SubmitSurveyActionError(
				"Survey submission payload failed validation.",
				{
					cause,
					extra: { reason: "invalid_input" },
				},
			),
	);

	const result = fromResult(parsedInput).andThen((input) =>
		fromResult(getSurveyFormConfig().mapErr(mapSurveyConfigError)).andThen(
			(config) => {
			const formData = createSurveyFormData({
				...input,
				entryIds: config.entryIds,
			});

			return resolveSubmitSurveyService()
				.andThen((service) =>
					submitToGoogleForms(config.formResponseUrl, formData).andThen(
						() =>
							service.submit({
								attendeeId: input.attendeeId,
								answers: input.answers,
								responseId: `${input.attendeeId}:${randomUUID()}`,
							}),
					),
				)
				.mapErr((error): SubmitSurveyActionError | SubmitSurveyFailure => error);
		})
	);

	return result.match(
		(success) => success,
		(error) => {
			throw mapActionFailureToError(error);
		},
	);
};

export { submitSurveyAction };
