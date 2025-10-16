import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const originalEnv = process.env;

let validateStampToken: typeof import("../validate-token")["validateStampToken"];
let listStampDefinitions: typeof import("../validate-token")["listStampDefinitions"];

beforeEach(async () => {
	process.env = {
		...originalEnv,
		STAMP_NFC_TOKEN_RECEPTION: "token-reception",
		STAMP_NFC_TOKEN_PHOTOBOOTH: "token-photobooth",
		STAMP_NFC_TOKEN_ART: "token-art",
		STAMP_NFC_TOKEN_ROBOT: "token-robot",
		STAMP_NFC_TOKEN_SURVEY: "token-survey",
	};

	vi.resetModules();
	const module = await import("../validate-token");
	validateStampToken = module.validateStampToken;
	listStampDefinitions = module.listStampDefinitions;
});

afterEach(() => {
	process.env = originalEnv;
});

describe("validateStampToken", () => {
	it("returns the matching stamp definition when token matches", () => {
		const validated = validateStampToken("token-photobooth");

		expect(validated).toEqual({
			stampId: "photobooth",
			labels: { ja: "フォトブース", en: "Photobooth" },
		});
	});

	it("returns null when no token matches", () => {
		expect(validateStampToken("unknown-token")).toBeNull();
	});
});

describe("listStampDefinitions", () => {
	it("includes all stamp ids with localized labels", () => {
		const definitions = listStampDefinitions();

		expect(definitions).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: "reception",
					labels: { ja: "受付", en: "Reception" },
				}),
				expect.objectContaining({
					id: "survey",
					labels: { ja: "アンケート", en: "Survey" },
				}),
			]),
		);
	});
});
