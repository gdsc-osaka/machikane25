import { describe, expect, it } from "vitest";
import {
	CHECKPOINT_LABELS,
	formatProgressSummary,
	HOME_MESSAGES,
	STAMP_MESSAGES,
} from "../messages";

describe("application/i18n/messages", () => {
	it("provides bilingual home page copy", () => {
		expect(HOME_MESSAGES.heading).toEqual({
			ja: "まちかね祭スタンプラリー",
			en: "Machikane Festival Stamp Rally",
		});
		expect(HOME_MESSAGES.subheading).toEqual({
			ja: "5つのスタンプを集めて、まちかね祭限定の景品を受け取ろう！",
			en: "Collect all five stamps to unlock the Machikane Festival reward!",
		});
		expect(HOME_MESSAGES.boardLabel).toEqual({
			ja: "現在のスタンプ状況",
			en: "Your Stamp Progress",
		});

		expect(HOME_MESSAGES.cta.surveyLocked).toEqual({
			ja: "アンケートに回答 (スタンプをすべて集めると回答できます)",
			en: "Take Survey (Collect all stamps to unlock)",
		});
		expect(HOME_MESSAGES.cta.surveyReady).toEqual({
			ja: "アンケートに回答",
			en: "Take Survey",
		});
		expect(HOME_MESSAGES.cta.rewardLocked).toEqual({
			ja: "景品を受け取る (アンケート回答が必要です)",
			en: "Claim Reward (Requires survey submission)",
		});
		expect(HOME_MESSAGES.cta.rewardReady).toEqual({
			ja: "景品を受け取る",
			en: "Claim Reward",
		});
	});

	it("exposes checkpoint labels for both locales", () => {
		expect(CHECKPOINT_LABELS.reception).toEqual({
			ja: "受付",
			en: "Reception",
		});
		expect(CHECKPOINT_LABELS.photobooth).toEqual({
			ja: "フォトブース",
			en: "Photo Booth",
		});
		expect(CHECKPOINT_LABELS.art).toEqual({
			ja: "アート展示",
			en: "Art Exhibit",
		});
		expect(CHECKPOINT_LABELS.robot).toEqual({
			ja: "ロボット研究",
			en: "Robotics Lab",
		});
		expect(CHECKPOINT_LABELS.survey).toEqual({
			ja: "アンケート",
			en: "Survey",
		});
	});

	it("maps stamp claim outcomes to localized copy", () => {
		expect(STAMP_MESSAGES.outcomes.success).toEqual({
			heading: {
				ja: "スタンプを獲得しました！",
				en: "Stamp Collected!",
			},
			body: {
				ja: "ホームに戻ってスタンプ帳を確認しましょう。",
				en: "Head back to the home page to check your updated stamp board.",
			},
		});

		expect(STAMP_MESSAGES.outcomes.duplicate).toEqual({
			heading: {
				ja: "このスタンプは既に獲得済みです",
				en: "Stamp Already Collected",
			},
			body: {
				ja: "このスタンプはすでに登録されています。ほかの展示も回ってみましょう！",
				en: "This stamp is already recorded. Visit the other exhibits to complete your board!",
			},
		});

		expect(STAMP_MESSAGES.outcomes.invalid).toEqual({
			heading: {
				ja: "このスタンプは無効です",
				en: "Invalid Stamp Token",
			},
			body: {
				ja: "読み取ったリンクが認証できませんでした。スタッフまでお知らせください。",
				en: "The scanned link could not be verified. Please ask a staff member for help.",
			},
		});

		expect(STAMP_MESSAGES.outcomes.error).toEqual({
			heading: {
				ja: "通信中に問題が発生しました。時間をおいて再度お試しください。",
				en: "Something went wrong. Please try again in a moment.",
			},
			body: {
				ja: "ネットワークに接続できません。通信状態を確認してください。",
				en: "You appear to be offline. Check your connection and try again.",
			},
		});
	});

	it("exposes additional stamp page copy", () => {
		expect(STAMP_MESSAGES.loading).toEqual({
			ja: "スタンプの記録を更新しています…",
			en: "Updating your stamp board…",
		});

		expect(STAMP_MESSAGES.homeLink).toEqual({
			ja: "スタンプ一覧を見る",
			en: "View Stamp Board",
		});

		expect(STAMP_MESSAGES.progressLabel).toEqual({
			ja: "獲得状況",
			en: "Your Progress",
		});
	});

	it("formats progress summary for both locales", () => {
		expect(formatProgressSummary({ collected: 2, total: 5 })).toEqual({
			ja: "取得済み 2 / 5",
			en: "Collected 2 of 5",
		});
	});
});
