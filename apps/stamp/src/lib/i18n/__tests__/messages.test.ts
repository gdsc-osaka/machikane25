import { describe, expect, it } from "vitest";
import { messages, translate } from "../messages";

describe("translate", () => {
	it("returns translations for supported locales", () => {
		expect(translate("stampGranted", "ja")).toBe(messages.stampGranted.ja);
		expect(translate("stampGranted", "en")).toBe(messages.stampGranted.en);
	});

	it("returns the key when no catalog entry exists", () => {
		expect(translate("missing" as never, "ja")).toBe("missing");
	});

	it("falls back to Japanese when the locale is unavailable", () => {
		expect(translate("stampGranted", "fr" as never)).toBe(
			messages.stampGranted.ja,
		);
	});
});
