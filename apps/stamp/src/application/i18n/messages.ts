import {
	getStampCopy,
	SUPPORTED_LOCALES,
	type CheckpointIdentifier,
	type SupportedLocale,
} from "@/libs/i18n/stamp-copy";

type HomeCtaMessages = {
	surveyLocked: string;
	surveyReady: string;
	rewardLocked: string;
	rewardReady: string;
};

type HomeMessages = {
	heading: string;
	subheading: string;
	stampBoardLabel: string;
	cta: HomeCtaMessages;
};

type StampStateMessages = {
	heading: string;
	body: string;
};

type StampMessages = {
	success: StampStateMessages;
	duplicate: StampStateMessages;
	invalid: StampStateMessages;
};

type CheckpointMessages = Record<CheckpointIdentifier, string>;

type StampAppMessages = {
	home: HomeMessages;
	stamp: StampMessages;
	checkpoints: CheckpointMessages;
};

const createHomeMessages = (locale: SupportedLocale): HomeMessages => ({
	heading: getStampCopy(locale, ["home", "heading"]),
	subheading: getStampCopy(locale, ["home", "subheading"]),
	stampBoardLabel: getStampCopy(locale, ["home", "stampBoardLabel"]),
	cta: {
		surveyLocked: getStampCopy(locale, ["home", "cta", "surveyLocked"]),
		surveyReady: getStampCopy(locale, ["home", "cta", "surveyReady"]),
		rewardLocked: getStampCopy(locale, ["home", "cta", "rewardLocked"]),
		rewardReady: getStampCopy(locale, ["home", "cta", "rewardReady"]),
	},
});

const CHECKPOINT_ORDER: ReadonlyArray<CheckpointIdentifier> = [
	"reception",
	"photobooth",
	"art",
	"robot",
	"survey",
];

const createStampMessages = (locale: SupportedLocale): StampMessages => ({
	success: {
		heading: getStampCopy(locale, ["stamp", "claimSuccess", "heading"]),
		body: getStampCopy(locale, ["stamp", "claimSuccess", "body"]),
	},
	duplicate: {
		heading: getStampCopy(locale, ["stamp", "duplicate", "heading"]),
		body: getStampCopy(locale, ["stamp", "duplicate", "body"]),
	},
	invalid: {
		heading: getStampCopy(locale, ["stamp", "invalidToken", "heading"]),
		body: getStampCopy(locale, ["stamp", "invalidToken", "body"]),
	},
});

const createCheckpointMessages = (locale: SupportedLocale): CheckpointMessages =>
	CHECKPOINT_ORDER.reduce<CheckpointMessages>(
		(acc, checkpoint) => ({
			...acc,
			[checkpoint]: getStampCopy(locale, ["checkpoints", checkpoint]),
		}),
		{
			reception: "",
			photobooth: "",
			art: "",
			robot: "",
			survey: "",
		},
	);

const getStampMessages = (locale: SupportedLocale): StampAppMessages => ({
	home: createHomeMessages(locale),
	stamp: createStampMessages(locale),
	checkpoints: createCheckpointMessages(locale),
});

export { getStampMessages, SUPPORTED_LOCALES };

export type {
	HomeCtaMessages,
	HomeMessages,
	StampMessages,
	CheckpointMessages,
	StampAppMessages,
	SupportedLocale,
	CheckpointIdentifier,
};
