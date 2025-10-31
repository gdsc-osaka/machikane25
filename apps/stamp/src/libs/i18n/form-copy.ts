"use client";

import type { LocaleField } from "@/libs/i18n/messages";
import { getStampCopy } from "@/libs/i18n/stamp-copy";

type SurveyQuestionId =
	| "ratingPhotobooth"
	| "ratingAquarium"
	| "ratingStampRally"
	| "howYouKnew";

type SurveyRatingOption = {
	value: string;
	label: LocaleField;
};

type SurveyCheckboxOption = {
	value: string;
	label: LocaleField;
};

type SurveyQuestionCopy = {
	id: SurveyQuestionId;
	heading: LocaleField;
	description: LocaleField;
};

type SurveyFormCopy = {
	pageTitle: LocaleField;
	heading: LocaleField;
	instructions: LocaleField;
	completion: LocaleField;
	locked: {
		heading: LocaleField;
		description: LocaleField;
	};
	comment: {
		label: LocaleField;
		placeholder: LocaleField;
	};
	attendeeError: {
		heading: LocaleField;
		message: LocaleField;
	};
	submissionError: {
		heading: LocaleField;
		message: LocaleField;
	};
	ratingOptions: ReadonlyArray<SurveyRatingOption>;
	howYouKnewOptions: ReadonlyArray<SurveyCheckboxOption>;
	questions: ReadonlyArray<SurveyQuestionCopy>;
};

const createLocaleField = (path: ReadonlyArray<string>): LocaleField => ({
	ja: getStampCopy("ja", path),
	en: getStampCopy("en", path),
});

const surveyRatingOptions: ReadonlyArray<SurveyRatingOption> = [
	{
		value: "5",
		label: {
			ja: "とても満足",
			en: "Very satisfied",
		},
	},
	{
		value: "4",
		label: {
			ja: "満足",
			en: "Satisfied",
		},
	},
	{
		value: "3",
		label: {
			ja: "普通",
			en: "Neutral",
		},
	},
	{
		value: "2",
		label: {
			ja: "やや不満",
			en: "Slightly dissatisfied",
		},
	},
	{
		value: "1",
		label: {
			ja: "不満",
			en: "Dissatisfied",
		},
	},
];

const surveyHowYouKnewOptions: ReadonlyArray<SurveyCheckboxOption> = [
	{
		value: "poster",
		label: {
			ja: "掲示板のポスターを見た",
			en: "Saw a poster on the bulletin board",
		},
	},
	{
		value: "pamphlet",
		label: {
			ja: "パンフレットを見た",
			en: "Saw a pamphlet",
		},
	},
	{
		value: "sns",
		label: {
			ja: "SNS を見た",
			en: "Saw on SNS",
		},
	},
	{
		value: "friend",
		label: {
			ja: "知人に聞いた",
			en: "Heard from a friend",
		},
	},
	{
		value: "other",
		label: {
			ja: "その他 (自由回答)",
			en: "Other (free text)",
		},
	},
];

const surveyQuestions: ReadonlyArray<SurveyQuestionCopy> = [
	{
		id: "ratingPhotobooth",
		heading: {
			ja: "フォトブースの満足度",
			en: "Photo Booth Satisfaction",
		},
		description: {
			ja: "体験してみた感想を教えてください。",
			en: "Tell us how you felt about the photo booth.",
		},
	},
	{
		id: "ratingAquarium",
		heading: {
			ja: "水族館展示の満足度",
			en: "Aquarium Exhibit Satisfaction",
		},
		description: {
			ja: "展示のわかりやすさや楽しさはいかがでしたか？",
			en: "How engaging and clear was the aquarium exhibit?",
		},
	},
	{
		id: "ratingStampRally",
		heading: {
			ja: "スタンプラリー全体の満足度",
			en: "Overall Stamp Rally Satisfaction",
		},
		description: {
			ja: "受付から景品受け取りまでの流れを振り返って評価してください。",
			en: "Rate your experience from check-in to reward unlock.",
		},
	},
	{
		id: "howYouKnew",
		heading: {
			ja: "どこでこの企画を知りましたか？",
			en: "How did you learn about this event?",
		},
		description: {
			ja: "複数選択可能です。",
			en: "Multiple selections possible.",
		},
	},
];

const surveyFormCopy: SurveyFormCopy = {
	pageTitle: {
		ja: "アンケート",
		en: "Survey",
	},
	heading: createLocaleField(["survey", "heading"]),
	instructions: createLocaleField(["survey", "inProgress"]),
	completion: createLocaleField(["survey", "done"]),
	locked: {
		heading: {
			ja: "アンケートはまだご利用いただけません",
			en: "Survey Not Yet Available",
		},
		description: {
			ja: "すべての展示スタンプを集めてから再度アクセスしてください。",
			en: "Collect all exhibit stamps before returning to this page.",
		},
	},
	comment: {
		label: {
			ja: "ご意見・ご感想（任意）",
			en: "Comments (optional)",
		},
		placeholder: {
			ja: "気に入った展示や改善してほしい点があればご記入ください。",
			en: "Share highlights or ideas to improve the festival experience.",
		},
	},
	attendeeError: {
		heading: {
			ja: "参加者情報を取得できませんでした",
			en: "Unable to resolve attendee identity",
		},
		message: {
			ja: "ページを再読み込みするか、ホーム画面から再度アクセスしてください。",
			en: "Refresh the page or return to the home screen before trying again.",
		},
	},
	submissionError: {
		heading: {
			ja: "送信に失敗しました",
			en: "Submission Failed",
		},
		message: {
			ja: "通信状況をご確認のうえ、もう一度お試しください。",
			en: "Check your connection and try submitting again.",
		},
	},
	ratingOptions: surveyRatingOptions,
	howYouKnewOptions: surveyHowYouKnewOptions,
	questions: surveyQuestions,
};

export { surveyFormCopy };
export type {
	SurveyQuestionCopy,
	SurveyQuestionId,
	SurveyRatingOption,
	SurveyCheckboxOption,
};
