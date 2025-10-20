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

const entryIdSchema = z
	.string()
	.min(1)
	.optional();

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

const SURVEY_FORM_CONFIG_ENV = "SURVEY_FORM_URL_MAP";

const selectEntryId = (
	candidates: ReadonlyArray<keyof z.infer<typeof entryMapSchema>>,
	entryMap: z.infer<typeof entryMapSchema>,
	field: keyof SurveyFormEntryIds,
): string => {
	const resolved = candidates
		.map((candidate) => entryMap[candidate])
		.find((value): value is string => typeof value === "string");

	if (!resolved) {
		throw new Error(
			`Missing entry ID for ${field}. Update ${SURVEY_FORM_CONFIG_ENV} to include this value.`,
		);
	}

	return resolved;
};

const parseSurveyFormConfig = (raw: string): SurveyFormConfig => {
	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch (cause) {
		throw new Error("Failed to parse survey form configuration JSON.", {
			cause,
		});
	}

	const config = surveyFormConfigSchema.parse(parsed);
	const { entryMap } = config;

	const entryIds: SurveyFormEntryIds = {
		attendeeId: selectEntryId(["attendeeId", "uid"], entryMap, "attendeeId"),
		ratingPhotobooth: selectEntryId(
			["ratingPhotobooth", "photoBoothRating"],
			entryMap,
			"ratingPhotobooth",
		),
		ratingAquarium: selectEntryId(
			["ratingAquarium", "aquariumRating"],
			entryMap,
			"ratingAquarium",
		),
		ratingStampRally: selectEntryId(
			["ratingStampRally", "stampRallyRating"],
			entryMap,
			"ratingStampRally",
		),
		freeComment: selectEntryId(["freeComment"], entryMap, "freeComment"),
	};

	return {
		formResponseUrl: config.formUrl,
		entryIds,
	};
};

const getSurveyFormConfig = (): SurveyFormConfig => {
	const raw = process.env[SURVEY_FORM_CONFIG_ENV];
	if (typeof raw !== "string" || raw.trim().length === 0) {
		throw new Error(
			`Survey form configuration is missing. Define ${SURVEY_FORM_CONFIG_ENV} in the server environment.`,
		);
	}

	return parseSurveyFormConfig(raw);
};

export { getSurveyFormConfig, parseSurveyFormConfig, SURVEY_FORM_CONFIG_ENV };
export type { SurveyFormConfig, SurveyFormEntryIds };
