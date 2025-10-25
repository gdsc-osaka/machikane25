import type { StampCheckpoint } from "@/domain/stamp";
import { getStampCopy, type SupportedLocale } from "@/libs/i18n/stamp-copy";

type LocaleField = Record<SupportedLocale, string>;

type HomeMessages = {
	heading: LocaleField;
	subheading: LocaleField;
	boardLabel: LocaleField;
	cta: {
		surveyLocked: LocaleField;
		surveyReady: LocaleField;
		rewardLocked: LocaleField;
		rewardReady: LocaleField;
	};
};

type StampMessages = {
	outcomes: {
		success: {
			heading: LocaleField;
			body: LocaleField;
		};
		duplicate: {
			heading: LocaleField;
			body: LocaleField;
		};
		invalid: {
			heading: LocaleField;
			body: LocaleField;
		};
		error: {
			heading: LocaleField;
			body: LocaleField;
		};
	};
	loading: LocaleField;
	homeLink: LocaleField;
	progressLabel: LocaleField;
};

type ProgressSummaryInput = {
	collected: number;
	total: number;
};

const toLocaleField = (path: ReadonlyArray<string>): LocaleField => ({
	ja: getStampCopy("ja", path),
	en: getStampCopy("en", path),
});

const HOME_MESSAGES: HomeMessages = {
	heading: toLocaleField(["home", "heading"]),
	subheading: toLocaleField(["home", "subheading"]),
	boardLabel: toLocaleField(["home", "stampBoardLabel"]),
	cta: {
		surveyLocked: toLocaleField(["home", "cta", "surveyLocked"]),
		surveyReady: toLocaleField(["home", "cta", "surveyReady"]),
		rewardLocked: toLocaleField(["home", "cta", "rewardLocked"]),
		rewardReady: toLocaleField(["home", "cta", "rewardReady"]),
	},
};

const CHECKPOINT_LABELS: Record<StampCheckpoint, LocaleField> = {
	reception: {
		ja: "受付",
		en: "Reception",
	},
	photobooth: {
		ja: "フォトブース",
		en: "Photo Booth",
	},
	art: {
		ja: "アート展示",
		en: "Art Exhibit",
	},
	robot: {
		ja: "ロボット研究",
		en: "Robotics Lab",
	},
	survey: {
		ja: "アンケート",
		en: "Survey",
	},
};

const STAMP_MESSAGES: StampMessages = {
	outcomes: {
		success: {
			heading: toLocaleField(["stamp", "claimSuccess", "heading"]),
			body: toLocaleField(["stamp", "claimSuccess", "body"]),
		},
		duplicate: {
			heading: toLocaleField(["stamp", "duplicate", "heading"]),
			body: toLocaleField(["stamp", "duplicate", "body"]),
		},
		invalid: {
			heading: toLocaleField(["stamp", "invalidToken", "heading"]),
			body: toLocaleField(["stamp", "invalidToken", "body"]),
		},
		error: {
			heading: toLocaleField(["errors", "generic"]),
			body: toLocaleField(["errors", "offline"]),
		},
	},
	loading: {
		ja: "スタンプの記録を更新しています…",
		en: "Updating your stamp board…",
	},
	homeLink: {
		ja: "スタンプ一覧を見る",
		en: "View Stamp Board",
	},
	progressLabel: {
		ja: "獲得状況",
		en: "Your Progress",
	},
};

const formatProgressSummary = ({
	collected,
	total,
}: ProgressSummaryInput): LocaleField => ({
	ja: `取得済み ${collected} / ${total}`,
	en: `Collected ${collected} of ${total}`,
});

export {
	HOME_MESSAGES,
	STAMP_MESSAGES,
	CHECKPOINT_LABELS,
	formatProgressSummary,
};

export type { LocaleField };
