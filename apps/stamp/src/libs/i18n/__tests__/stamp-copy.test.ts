import { describe, expect, it } from "vitest";
import {
	getStampCopy,
	isSupportedLocale,
	STAMP_COPY,
	SUPPORTED_LOCALES,
} from "@/libs/i18n/stamp-copy";

describe("stamp copy map", () => {
	it("exposes supported locales", () => {
		expect(SUPPORTED_LOCALES).toContain("ja");
		expect(SUPPORTED_LOCALES).toContain("en");
		expect(isSupportedLocale("ja")).toBe(true);
		expect(isSupportedLocale("en")).toBe(true);
		expect(isSupportedLocale("fr")).toBe(false);
	});

	it("provides bilingual CTA copy for the home page", () => {
		const copy = STAMP_COPY.home.cta;

		expect(copy.surveyLocked.ja).toContain("アンケートに回答");
		expect(copy.surveyLocked.en).toContain("Take Survey");
		expect(copy.rewardLocked.ja).toContain("景品を受け取る");
		expect(copy.rewardLocked.en).toContain("Claim Reward");
	});

	it("returns nested copy entries by locale and key", () => {
		expect(getStampCopy("ja", ["stamp", "claimSuccess", "heading"])).toBe(
			"スタンプを獲得しました！",
		);
		expect(getStampCopy("en", ["stamp", "claimSuccess", "heading"])).toBe(
			"Stamp Collected!",
		);
	});

	it("throws when accessing unknown copy keys", () => {
		expect(() =>
			getStampCopy("ja", ["stamp", "missing", "heading"]),
		).toThrowError(/missing copy/i);
	});
});
