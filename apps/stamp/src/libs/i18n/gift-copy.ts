"use client";

import type { LocaleField } from "@/libs/i18n/messages";
import { getStampCopy } from "@/libs/i18n/stamp-copy";

type RewardStateKey = "redeemable" | "redeemed" | "unavailable";

type RewardStateCopy = {
	heading: LocaleField;
	body: LocaleField;
};

type GiftCopy = {
	pageHeading: LocaleField;
	homeButton: LocaleField;
	error: LocaleField;
	identityError: {
		heading: LocaleField;
		message: LocaleField;
	};
	rewardStates: Record<RewardStateKey, RewardStateCopy>;
};

const createLocaleField = (path: ReadonlyArray<string>): LocaleField => ({
	ja: getStampCopy("ja", path),
	en: getStampCopy("en", path),
});

const rewardStates: Record<RewardStateKey, RewardStateCopy> = {
	redeemable: {
		heading: createLocaleField(["gift", "redeemable", "heading"]),
		body: createLocaleField(["gift", "redeemable", "body"]),
	},
	redeemed: {
		heading: createLocaleField(["gift", "redeemed", "heading"]),
		body: createLocaleField(["gift", "redeemed", "body"]),
	},
	unavailable: {
		heading: createLocaleField(["gift", "unavailable", "heading"]),
		body: createLocaleField(["gift", "unavailable", "body"]),
	},
};

const giftPageCopy: GiftCopy = {
	pageHeading: {
		ja: "景品受け取りページ",
		en: "Reward Claim Page",
	},
	homeButton: {
		ja: "ホームに戻る",
		en: "Back to Home",
	},
	error: {
		ja: "景品状態の取得に失敗しました。時間をおいて再度お試しください。",
		en: "We could not load your reward. Please try again shortly.",
	},
	identityError: {
		heading: {
			ja: "参加者情報を確認できませんでした",
			en: "Attendee identity unavailable",
		},
		message: {
			ja: "ホーム画面に戻ってから再度アクセスしてください。",
			en: "Return to the home page before trying again.",
		},
	},
	rewardStates,
};

export { giftPageCopy };
export type { RewardStateKey, RewardStateCopy };
