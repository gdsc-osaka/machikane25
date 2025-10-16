export type Locale = "ja" | "en";

type LocalizedEntry = {
	ja: string;
	en: string;
};

type CopySection =
	| "home"
	| "stamp"
	| "survey"
	| "gift"
	| "scan"
	| "maintenance"
	| "errors";

type CopyDictionary = {
	[Section in CopySection]: Record<string, LocalizedEntry>;
};

const STAMP_COPY: CopyDictionary = {
	home: {
		heading: {
			ja: "スタンプラリー",
			en: "Stamp Rally",
		},
		description: {
			ja: "受付からロボット展示まで 5 つのスタンプを集めて景品を手に入れましょう。",
			en: "Collect all five stamps across the festival to unlock your reward.",
		},
		surveyCta: {
			ja: "アンケートに回答",
			en: "Take Survey",
		},
		rewardCta: {
			ja: "景品を受け取る",
			en: "Claim Reward",
		},
		surveyLocked: {
			ja: "残りのスタンプを集めるとアンケートに回答できます。",
			en: "Collect the remaining stamps to unlock the survey.",
		},
		rewardLocked: {
			ja: "アンケートに回答すると景品ページが表示されます。",
			en: "Submit the survey to unlock the reward page.",
		},
	},
	stamp: {
		nowStamping: {
			ja: "スタンプを付与しています...",
			en: "Adding your stamp...",
		},
		success: {
			ja: "スタンプを獲得しました！",
			en: "Stamp collected!",
		},
		duplicate: {
			ja: "このスタンプは獲得済みです。",
			en: "You already have this stamp.",
		},
		returnHome: {
			ja: "スタンプ一覧を見る",
			en: "Back to stamp board",
		},
	},
	survey: {
		heading: {
			ja: "アンケートにご協力ください",
			en: "Share your feedback",
		},
		description: {
			ja: "展示の満足度を教えていただくと景品ページが表示されます。",
			en: "Tell us how we did to unlock the reward page.",
		},
		submit: {
			ja: "回答を送信",
			en: "Submit response",
		},
		back: {
			ja: "ホームに戻る",
			en: "Back to home",
		},
	},
	gift: {
		heading: {
			ja: "ありがとうございました！",
			en: "Thank you!",
		},
		qrInstruction: {
			ja: "この QR コードをスタッフに提示してください。",
			en: "Show this QR code to staff to receive your prize.",
		},
		redeemed: {
			ja: "景品は受け取り済みです。ご来場ありがとうございました！",
			en: "Prize already redeemed. Thanks for visiting!",
		},
	},
	scan: {
		loginPrompt: {
			ja: "スタッフアカウントでログインしてください。",
			en: "Sign in with your staff account.",
		},
		scanInstruction: {
			ja: "来場者の QR を読み取って景品をお渡しください。",
			en: "Scan the attendee QR code to hand out the prize.",
		},
		grant: {
			ja: "景品を渡してください。",
			en: "Hand the prize to the guest.",
		},
		alreadyRedeemed: {
			ja: "すでに景品を受け取り済みです。",
			en: "This prize has already been redeemed.",
		},
		invalid: {
			ja: "不正な QR コードです。",
			en: "Invalid QR code.",
		},
		manualEntry: {
			ja: "読み取れない場合は手動入力してください。",
			en: "If scanning fails, enter the ID manually.",
		},
	},
	maintenance: {
		heading: {
			ja: "メンテナンス中です",
			en: "Currently under maintenance",
		},
		message: {
			ja: "まもなく再開しますので少々お待ちください。",
			en: "Please hold on—we’ll be back shortly.",
		},
	},
	errors: {
		default: {
			ja: "問題が発生しました。時間をおいて再度お試しください。",
			en: "Something went wrong. Please try again shortly.",
		},
		network: {
			ja: "ネットワークに接続できません。通信状況を確認してください。",
			en: "Unable to connect. Please check your network connection.",
		},
	},
};

export const resolveStampCopy = (
	section: CopySection,
	key: string,
	locale: Locale,
) => {
	const entry = STAMP_COPY[section]?.[key];
	if (!entry) {
		return "";
	}
	return entry[locale] ?? entry.ja;
};

export const stampCopy = STAMP_COPY;
