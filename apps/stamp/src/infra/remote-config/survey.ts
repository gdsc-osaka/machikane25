import { err, ok, Result } from "neverthrow";
import { errorBuilder, type InferError } from "obj-err";
import { z } from "zod";

type SurveyFormEntryIds = {
	attendeeId: string;
	ratingPhotobooth: string;
	ratingAquarium: string;
	ratingStampRally: string;
	freeComment: string;
};

type SurveyFormConfig = {
	formResponseUrl: string;
	entryIds: SurveyFormEntryIds;
};

const entryIdSchema = z.string().min(1).optional();

const entryMapSchema = z.object({
	attendeeId: entryIdSchema,
	uid: entryIdSchema,
	ratingPhotobooth: entryIdSchema,
	photoBoothRating: entryIdSchema,
	ratingAquarium: entryIdSchema,
	aquariumRating: entryIdSchema,
	ratingStampRally: entryIdSchema,
	stampRallyRating: entryIdSchema,
	freeComment: entryIdSchema,
});

const surveyFormConfigSchema = z.object({
	formUrl: z.string().url(),
	entryMap: entryMapSchema,
});

const SURVEY_FORM_CONFIG_ENV = "NEXT_PUBLIC_SURVEY_FORM_URL_MAP";

const SurveyFormConfigError = errorBuilder(
	"SurveyFormConfigError",
	z.object({
		reason: z.union([
			z.literal("missing_env"),
			z.literal("parse_failed"),
			z.literal("validation_failed"),
			z.literal("missing_entry_id"),
		]),
		field: z.string().optional(),
	}),
);

type SurveyFormConfigError = InferError<typeof SurveyFormConfigError>;

const selectEntryId = (
	candidates: ReadonlyArray<keyof z.infer<typeof entryMapSchema>>,
	entryMap: z.infer<typeof entryMapSchema>,
	field: keyof SurveyFormEntryIds,
): Result<string, SurveyFormConfigError> => {
	const resolved = candidates
		.map((candidate) => entryMap[candidate])
		.find((value): value is string => typeof value === "string");

	if (!resolved) {
		return err(
			SurveyFormConfigError("Missing entry ID for survey form field.", {
				extra: { reason: "missing_entry_id", field },
			}),
		);
	}

	return ok(resolved);
};

const parseSurveyFormConfig = (
	raw: string,
): Result<SurveyFormConfig, SurveyFormConfigError> =>
	Result.fromThrowable(
		() => JSON.parse(raw),
		(cause) =>
			SurveyFormConfigError("Failed to parse survey form configuration JSON.", {
				cause,
				extra: { reason: "parse_failed" },
			}),
	)()
		.map((parsed) => surveyFormConfigSchema.safeParse(parsed))
		.andThen((result) => {
			if (!result.success) {
				return err(
					SurveyFormConfigError(
						"Survey form configuration did not match the expected schema.",
						{
							cause: result.error,
							extra: { reason: "validation_failed" },
						},
					),
				);
			}
			return ok(result.data);
		})
		.andThen((config) => {
			const { entryMap } = config;
			return selectEntryId(
				["attendeeId", "uid"],
				entryMap,
				"attendeeId",
			).andThen((attendeeId) =>
				selectEntryId(
					["ratingPhotobooth", "photoBoothRating"],
					entryMap,
					"ratingPhotobooth",
				).andThen((ratingPhotobooth) =>
					selectEntryId(
						["ratingAquarium", "aquariumRating"],
						entryMap,
						"ratingAquarium",
					).andThen((ratingAquarium) =>
						selectEntryId(
							["ratingStampRally", "stampRallyRating"],
							entryMap,
							"ratingStampRally",
						).andThen((ratingStampRally) =>
							selectEntryId(["freeComment"], entryMap, "freeComment").map(
								(freeComment) => ({
									formResponseUrl: config.formUrl,
									entryIds: {
										attendeeId,
										ratingPhotobooth,
										ratingAquarium,
										ratingStampRally,
										freeComment,
									},
								}),
							),
						),
					),
				),
			);
		});

const getSurveyFormConfig = (): Result<
	SurveyFormConfig,
	SurveyFormConfigError
> => {
	const raw = process.env[SURVEY_FORM_CONFIG_ENV];
	if (typeof raw !== "string" || raw.trim().length === 0) {
		return err(
			SurveyFormConfigError("Survey form configuration is missing.", {
				extra: { reason: "missing_env" },
			}),
		);
	}

	return parseSurveyFormConfig(raw);
};

export {
	getSurveyFormConfig,
	parseSurveyFormConfig,
	SURVEY_FORM_CONFIG_ENV,
	SurveyFormConfigError,
};
export type { SurveyFormConfig, SurveyFormEntryIds };
