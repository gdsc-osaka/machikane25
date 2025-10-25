import { afterEach, describe, expect, it, vi } from "vitest";
import {
	getSurveyFormConfig,
	parseSurveyFormConfig,
	SURVEY_FORM_CONFIG_ENV,
	SurveyFormConfigError,
} from "../survey";

afterEach(() => {
	vi.unstubAllEnvs();
});

describe("parseSurveyFormConfig", () => {
	it("parses config and resolves entry ids using fallback keys", () => {
		const payload = JSON.stringify({
			formUrl: "https://example.com/forms/submit",
			entryMap: {
				uid: "entry.attendee",
				photoBoothRating: "entry.photo",
				aquariumRating: "entry.aquarium",
				stampRallyRating: "entry.stamp",
				freeComment: "entry.comment",
			},
		});

		const result = parseSurveyFormConfig(payload);

		expect(result.isOk()).toBe(true);
		const config = result._unsafeUnwrap();
		expect(config.formResponseUrl).toBe("https://example.com/forms/submit");
		expect(config.entryIds.attendeeId).toBe("entry.attendee");
		expect(config.entryIds.ratingPhotobooth).toBe("entry.photo");
		expect(config.entryIds.ratingAquarium).toBe("entry.aquarium");
		expect(config.entryIds.ratingStampRally).toBe("entry.stamp");
		expect(config.entryIds.freeComment).toBe("entry.comment");
	});

	it("returns parse error when payload is not valid JSON", () => {
		const result = parseSurveyFormConfig("{invalid json");

		expect(result.isErr()).toBe(true);
		const error = result._unsafeUnwrapErr();
		expect(SurveyFormConfigError.isFn(error)).toBe(true);
		expect(error.extra?.reason).toBe("parse_failed");
	});

	it("returns validation error when schema does not match", () => {
		const payload = JSON.stringify({
			formUrl: "not-a-url",
			entryMap: {},
		});

		const result = parseSurveyFormConfig(payload);

		expect(result.isErr()).toBe(true);
		const error = result._unsafeUnwrapErr();
		expect(error.extra?.reason).toBe("validation_failed");
	});

	it("requires each entry id to be present", () => {
		const payload = JSON.stringify({
			formUrl: "https://example.com/forms/submit",
			entryMap: {
				attendeeId: "entry.attendee",
				ratingPhotobooth: "entry.photo",
				ratingAquarium: "entry.aquarium",
				ratingStampRally: "entry.stamp",
			},
		});

		const result = parseSurveyFormConfig(payload);

		expect(result.isErr()).toBe(true);
		const error = result._unsafeUnwrapErr();
		expect(error.extra?.reason).toBe("missing_entry_id");
		expect(error.extra?.field).toBe("freeComment");
	});
});

describe("getSurveyFormConfig", () => {
	it("returns error when environment variable is missing", () => {
		vi.unstubAllEnvs();
		const result = getSurveyFormConfig();

		expect(result.isErr()).toBe(true);
		const error = result._unsafeUnwrapErr();
		expect(error.extra?.reason).toBe("missing_env");
	});

	it("parses configuration from environment variable", () => {
		const payload = JSON.stringify({
			formUrl: "https://example.com/forms/submit",
			entryMap: {
				attendeeId: "entry.attendee",
				ratingPhotobooth: "entry.photo",
				ratingAquarium: "entry.aquarium",
				ratingStampRally: "entry.stamp",
				freeComment: "entry.comment",
			},
		});
		vi.stubEnv(SURVEY_FORM_CONFIG_ENV, payload);

		const result = getSurveyFormConfig();

		expect(result.isOk()).toBe(true);
		const config = result._unsafeUnwrap();
		expect(config.entryIds.freeComment).toBe("entry.comment");
	});
});
