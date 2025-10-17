type SupportedLanguage = "ja" | "en";

type LocalizedText = Record<SupportedLanguage, string>;

type StampCheckpointKey =
	| "reception"
	| "photobooth"
	| "art"
	| "robot"
	| "survey";

const SUPPORTED_LANGUAGES: ReadonlyArray<SupportedLanguage> = ["ja", "en"];

const createLocalizedText = (translations: LocalizedText): LocalizedText =>
	translations;

const STAMP_CHECKPOINT_TITLES: Record<StampCheckpointKey, LocalizedText> = {
	reception: createLocalizedText({
		ja: "受付",
		en: "Reception",
	}),
	photobooth: createLocalizedText({
		ja: "AIフォトブース",
		en: "AI Photo Booth",
	}),
	art: createLocalizedText({
		ja: "インタラクティブアート",
		en: "Interactive Art",
	}),
	robot: createLocalizedText({
		ja: "ロボット展示",
		en: "Robotics Exhibit",
	}),
	survey: createLocalizedText({
		ja: "アンケート",
		en: "Survey",
	}),
};

const STAMP_BOARD_COPY = {
	heading: createLocalizedText({
		ja: "スタンプカード",
		en: "Stamp Card",
	}),
};

const STAMP_PROGRESS_STATES = {
	complete: createLocalizedText({
		ja: "コンプリート！",
		en: "Completed!",
	}),
	incomplete: createLocalizedText({
		ja: "あと{{count}}スタンプ",
		en: "{{count}} more stamps",
	}),
};

const STAMP_CTA_COPY = {
	survey: {
		label: createLocalizedText({
			ja: "アンケートに回答",
			en: "Take Survey",
		}),
		disabledHint: createLocalizedText({
			ja: "全てのスタンプを集めるとアンケートが開きます",
			en: "Collect all stamps to unlock the survey",
		}),
	},
	reward: {
		label: createLocalizedText({
			ja: "景品を受け取る",
			en: "Claim Reward",
		}),
		disabledHint: createLocalizedText({
			ja: "アンケート回答後に景品を受け取れます",
			en: "Complete the survey to unlock the reward",
		}),
	},
};

export {
	SUPPORTED_LANGUAGES,
	STAMP_BOARD_COPY,
	STAMP_CHECKPOINT_TITLES,
	STAMP_CTA_COPY,
	STAMP_PROGRESS_STATES,
};

export type { LocalizedText, StampCheckpointKey, SupportedLanguage };
