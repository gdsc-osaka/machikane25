type SupportedLocale = "ja" | "en";

type LocaleField = Record<SupportedLocale, string>;

type HomeCopy = {
	cta: {
		rewardLocked: LocaleField;
		rewardReady: LocaleField;
		surveyLocked: LocaleField;
		surveyReady: LocaleField;
	};
	heading: LocaleField;
	stampBoardLabel: LocaleField;
	subheading: LocaleField;
};

type StampCopy = {
	claimSuccess: {
		body: LocaleField;
		heading: LocaleField;
	};
	duplicate: {
		body: LocaleField;
		heading: LocaleField;
	};
	invalidToken: {
		body: LocaleField;
		heading: LocaleField;
	};
};

type SurveyCopy = {
	done: LocaleField;
	heading: LocaleField;
	inProgress: LocaleField;
};

type GiftCopy = {
	redeemed: {
		body: LocaleField;
		heading: LocaleField;
	};
	redeemable: {
		body: LocaleField;
		heading: LocaleField;
	};
	unavailable: {
		body: LocaleField;
		heading: LocaleField;
	};
};

type MaintenanceCopy = {
	heading: LocaleField;
	status: {
		degraded: LocaleField;
		maintenance: LocaleField;
		online: LocaleField;
	};
};

type ErrorCopy = {
	generic: LocaleField;
	offline: LocaleField;
};

type StampCopyDefinition = {
	errors: ErrorCopy;
	gift: GiftCopy;
	home: HomeCopy;
	maintenance: MaintenanceCopy;
	stamp: StampCopy;
	survey: SurveyCopy;
};

interface CopyBranch {
	readonly [key: string]: LocaleField | CopyBranch;
}

type CopyNode = LocaleField | CopyBranch;

const SUPPORTED_LOCALES: ReadonlyArray<SupportedLocale> = ["ja", "en"];

const STAMP_COPY: StampCopyDefinition = {
	errors: {
		generic: {
			ja: "通信中に問題が発生しました。時間をおいて再度お試しください。",
			en: "Something went wrong. Please try again in a moment.",
		},
		offline: {
			ja: "ネットワークに接続できません。通信状態を確認してください。",
			en: "You appear to be offline. Check your connection and try again.",
		},
	},
	gift: {
		redeemed: {
			body: {
				ja: "スタッフが受け取り済みを確認しました。景品をお楽しみください！",
				en: "Our staff confirmed the reward handoff. Enjoy the festival!",
			},
			heading: {
				ja: "景品を受け取りました",
				en: "Reward Already Redeemed",
			},
		},
		redeemable: {
			body: {
				ja: "スタッフにこの QR コードを提示してください。景品と交換できます。",
				en: "Show this QR code to staff to receive your reward.",
			},
			heading: {
				ja: "景品の受け取りができます",
				en: "Reward Ready to Claim",
			},
		},
		unavailable: {
			body: {
				ja: "スタンプをすべて集め、アンケートに回答すると景品を受け取れます。",
				en: "Collect all stamps and submit the survey to unlock your reward.",
			},
			heading: {
				ja: "景品受け取りはまだ準備中です",
				en: "Reward Not Yet Available",
			},
		},
	},
	home: {
		cta: {
			rewardLocked: {
				ja: "景品を受け取る (アンケート回答が必要です)",
				en: "Claim Reward (Requires survey submission)",
			},
			rewardReady: {
				ja: "景品を受け取る",
				en: "Claim Reward",
			},
			surveyLocked: {
				ja: "アンケートに回答 (スタンプをすべて集めると回答できます)",
				en: "Take Survey (Collect all stamps to unlock)",
			},
			surveyReady: {
				ja: "アンケートに回答",
				en: "Take Survey",
			},
		},
		heading: {
			ja: "まちかね祭スタンプラリー",
			en: "Machikane Festival Stamp Rally",
		},
		stampBoardLabel: {
			ja: "現在のスタンプ状況",
			en: "Your Stamp Progress",
		},
		subheading: {
			ja: "5つのスタンプを集めて、まちかね祭限定の景品を受け取ろう！",
			en: "Collect all five stamps to unlock the Machikane Festival reward!",
		},
	},
	maintenance: {
		heading: {
			ja: "現在メンテナンス中です",
			en: "Service Notice",
		},
		status: {
			degraded: {
				ja: "一部機能で遅延または停止が発生しています。復旧作業中です。",
				en: "Some features are currently degraded. We are working to restore service.",
			},
			maintenance: {
				ja: "システムを一時停止してメンテナンスを実施しています。再開までしばらくお待ちください。",
				en: "We are performing scheduled maintenance. Please check back shortly.",
			},
			online: {
				ja: "サービスは正常に稼働しています。",
				en: "All festival services are online.",
			},
		},
	},
	stamp: {
		claimSuccess: {
			body: {
				ja: "ホームに戻ってスタンプ帳を確認しましょう。",
				en: "Head back to the home page to check your updated stamp board.",
			},
			heading: {
				ja: "スタンプを獲得しました！",
				en: "Stamp Collected!",
			},
		},
		duplicate: {
			body: {
				ja: "このスタンプはすでに登録されています。ほかの展示も回ってみましょう！",
				en: "This stamp is already recorded. Visit the other exhibits to complete your board!",
			},
			heading: {
				ja: "このスタンプは既に獲得済みです",
				en: "Stamp Already Collected",
			},
		},
		invalidToken: {
			body: {
				ja: "読み取ったリンクが認証できませんでした。スタッフまでお知らせください。",
				en: "The scanned link could not be verified. Please ask a staff member for help.",
			},
			heading: {
				ja: "このスタンプは無効です",
				en: "Invalid Stamp Token",
			},
		},
	},
	checkpoints: {
		reception: {
			ja: "受付",
			en: "Reception",
		},
		photobooth: {
			ja: "フォトブース",
			en: "Photo Booth",
		},
		art: {
			ja: "インタラクティブアート",
			en: "Interactive Art",
		},
		robot: {
			ja: "ロボット展示",
			en: "Robot Exhibit",
		},
		survey: {
			ja: "アンケート",
			en: "Survey",
		},
	},
	survey: {
		done: {
			ja: "アンケートへのご協力ありがとうございます！",
			en: "Thank you for completing the survey!",
		},
		heading: {
			ja: "アンケートにご協力ください",
			en: "Share Your Festival Feedback",
		},
		inProgress: {
			ja: "すべての質問に回答すると、最後のスタンプが押されます。",
			en: "Answer each question to collect your final stamp.",
		},
	},
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null;

const isLocaleField = (value: unknown): value is LocaleField =>
	isRecord(value) &&
	SUPPORTED_LOCALES.every((locale) => {
		const entry = value[locale];
		return typeof entry === "string";
	});

const isCopyBranch = (value: unknown): value is CopyBranch => isRecord(value);

const resolveCopyNode = (
	node: CopyNode,
	path: ReadonlyArray<string>,
): CopyNode => {
	if (path.length === 0) {
		return node;
	}
	if (!isCopyBranch(node)) {
		throw new Error(`Missing copy at ${path.join(".")}`);
	}
	const [segment, ...rest] = path;
	const nextNode = node[segment];
	if (nextNode === undefined) {
		throw new Error(`Missing copy at ${path.join(".")}`);
	}
	return resolveCopyNode(nextNode, rest);
};

const isSupportedLocale = (value: unknown): value is SupportedLocale =>
	typeof value === "string" &&
	SUPPORTED_LOCALES.some((locale) => locale === value);

const getStampCopy = (
	locale: SupportedLocale,
	path: ReadonlyArray<string>,
): string => {
	const resolved = resolveCopyNode(STAMP_COPY, path);
	if (!isLocaleField(resolved)) {
		throw new Error(`Missing copy leaf at ${path.join(".")}`);
	}
	return resolved[locale];
};

export { getStampCopy, isSupportedLocale, STAMP_COPY, SUPPORTED_LOCALES };

export type { CheckpointIdentifier, StampCopyDefinition, SupportedLocale };
