import { describe, expect, test } from "vitest";
import {
	SUPPORTED_LANGUAGES,
	STAMP_BOARD_COPY,
	STAMP_CHECKPOINT_TITLES,
	STAMP_CTA_COPY,
	STAMP_PROGRESS_STATES,
} from "./stamp-copy";

const CHECKPOINT_KEYS = [
	"reception",
	"photobooth",
	"art",
	"robot",
	"survey",
] as const;

describe("stamp copy map", () => {
	test("provides bilingual titles for all stamp checkpoints", () => {
		expect(Object.keys(STAMP_CHECKPOINT_TITLES)).toEqual(
			CHECKPOINT_KEYS.map((key) => key),
		);

		const localizedCombinations = CHECKPOINT_KEYS.flatMap((key) =>
			SUPPORTED_LANGUAGES.map((language) => ({
				key,
				language,
				value: STAMP_CHECKPOINT_TITLES[key][language],
			})),
		);

		localizedCombinations.forEach(({ key, language, value }) => {
			expect(value).toBeTruthy();
			if (key === "reception" && language === "ja") {
				expect(value).toBe("受付");
			}
			if (key === "reception" && language === "en") {
				expect(value).toBe("Reception");
			}
			if (key === "photobooth" && language === "ja") {
				expect(value).toBe("AIフォトブース");
			}
			if (key === "photobooth" && language === "en") {
				expect(value).toBe("AI Photo Booth");
			}
			if (key === "art" && language === "ja") {
				expect(value).toBe("インタラクティブアート");
			}
			if (key === "art" && language === "en") {
				expect(value).toBe("Interactive Art");
			}
			if (key === "robot" && language === "ja") {
				expect(value).toBe("ロボット展示");
			}
			if (key === "robot" && language === "en") {
				expect(value).toBe("Robotics Exhibit");
			}
			if (key === "survey" && language === "ja") {
				expect(value).toBe("アンケート");
			}
			if (key === "survey" && language === "en") {
				expect(value).toBe("Survey");
			}
		});
	});

	test("includes board copy for headings and completion states", () => {
		expect(STAMP_BOARD_COPY.heading.ja).toBe("スタンプカード");
		expect(STAMP_BOARD_COPY.heading.en).toBe("Stamp Card");

		expect(STAMP_PROGRESS_STATES.complete.ja).toBe("コンプリート！");
		expect(STAMP_PROGRESS_STATES.complete.en).toBe("Completed!");

		expect(STAMP_PROGRESS_STATES.incomplete.ja).toBe("あと{{count}}スタンプ");
		expect(STAMP_PROGRESS_STATES.incomplete.en).toBe("{{count}} more stamps");
	});

	test("provides CTA copy for survey and reward actions", () => {
		expect(STAMP_CTA_COPY.survey.label.ja).toBe("アンケートに回答");
		expect(STAMP_CTA_COPY.survey.label.en).toBe("Take Survey");
		expect(STAMP_CTA_COPY.survey.disabledHint.ja).toBe(
			"全てのスタンプを集めるとアンケートが開きます",
		);
		expect(STAMP_CTA_COPY.survey.disabledHint.en).toBe(
			"Collect all stamps to unlock the survey",
		);

		expect(STAMP_CTA_COPY.reward.label.ja).toBe("景品を受け取る");
		expect(STAMP_CTA_COPY.reward.label.en).toBe("Claim Reward");
		expect(STAMP_CTA_COPY.reward.disabledHint.ja).toBe(
			"アンケート回答後に景品を受け取れます",
		);
		expect(STAMP_CTA_COPY.reward.disabledHint.en).toBe(
			"Complete the survey to unlock the reward",
		);
	});
});
