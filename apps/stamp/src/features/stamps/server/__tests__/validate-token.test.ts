import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const tokenEnvKeys = [
	"STAMP_NFC_TOKEN_RECEPTION",
	"STAMP_NFC_TOKEN_PHOTOBOOTH",
	"STAMP_NFC_TOKEN_ART",
	"STAMP_NFC_TOKEN_ROBOT",
	"STAMP_NFC_TOKEN_SURVEY",
] as const;

const clearStampEnv = () => {
	for (const key of tokenEnvKeys) {
		delete process.env[key];
	}
};

beforeEach(() => {
	clearStampEnv();
	vi.resetModules();
});

afterAll(() => {
	clearStampEnv();
});

const importModule = () => import("../validate-token");

describe("validateStampToken", () => {
	it("returns null when token is empty", async () => {
		process.env.STAMP_NFC_TOKEN_RECEPTION = "token-reception";
		const { validateStampToken } = await importModule();

		expect(validateStampToken("")).toBeNull();
	});

	it("returns null when token does not match configured values", async () => {
		process.env.STAMP_NFC_TOKEN_RECEPTION = "token-reception";
		const { validateStampToken } = await importModule();

		expect(validateStampToken("unknown-token")).toBeNull();
	});

	it("returns the matching stamp definition when token matches", async () => {
		process.env.STAMP_NFC_TOKEN_PHOTOBOOTH = "token-photobooth";
		const { validateStampToken } = await importModule();

		const result = validateStampToken("token-photobooth");
		expect(result).toEqual({
			stampId: "photobooth",
			labels: { ja: "フォトブース", en: "Photobooth" },
		});
	});
});

describe("listStampDefinitions", () => {
	it("exposes configured tokens alongside static metadata", async () => {
		process.env.STAMP_NFC_TOKEN_RECEPTION = "token-reception";
		process.env.STAMP_NFC_TOKEN_SURVEY = "token-survey";
		const { listStampDefinitions } = await importModule();

		const definitions = listStampDefinitions();
		expect(definitions).toHaveLength(5);
		expect(
			definitions.find((definition) => definition.id === "reception")?.envVar,
		).toBe("token-reception");
		expect(
			definitions.find((definition) => definition.id === "survey")?.labels,
		).toEqual({ ja: "アンケート", en: "Survey" });
	});
});
