"use client";

import { useRouter } from "next/navigation";
import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
	useTransition,
} from "react";
import { Controller, useForm } from "react-hook-form";
import { submitSurveyAction } from "@/app/(guest)/actions/submit-survey";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
} from "@/components/ui/card";
import {
	Field,
	FieldContent,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
	FieldLegend,
	FieldSet,
	FieldTitle,
} from "@/components/ui/field";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupTextarea,
} from "@/components/ui/input-group";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Spinner } from "@/components/ui/spinner";
import { STAMP_SEQUENCE, type StampCheckpoint } from "@/domain/stamp";
import { useAnonymousAttendeeId } from "@/hooks/use-anonymous-attendee-id";
import {
	createEmptyStampProgress,
	type StampProgressSnapshot,
	useStampProgress,
} from "@/hooks/use-stamp-progress";
import { CHECKPOINT_LABELS, type LocaleField } from "@/libs/i18n/messages";
import { getStampCopy } from "@/libs/i18n/stamp-copy";
import { getLogger } from "@/packages/logger";

type SurveyFormValues = {
	ratingPhotobooth: string;
	ratingAquarium: string;
	ratingStampRally: string;
	freeComment: string;
};

type RatingOption = {
	value: string;
	label: LocaleField;
};

type SurveyQuestion = {
	name: Exclude<keyof SurveyFormValues, "freeComment">;
	heading: LocaleField;
	description: LocaleField;
};

type SubmissionErrorState = {
	heading: LocaleField;
	message: LocaleField;
} | null;

const createLocaleField = (path: ReadonlyArray<string>): LocaleField => ({
	ja: getStampCopy("ja", path),
	en: getStampCopy("en", path),
});

const isExhibitCheckpoint = (
	checkpoint: StampCheckpoint,
): checkpoint is Exclude<StampCheckpoint, "survey"> => checkpoint !== "survey";

const EXHIBIT_CHECKPOINTS: ReadonlyArray<Exclude<StampCheckpoint, "survey">> =
	STAMP_SEQUENCE.filter(isExhibitCheckpoint);

const SURVEY_HEADING = createLocaleField(["survey", "heading"]);
const SURVEY_DESCRIPTION = createLocaleField(["survey", "inProgress"]);
const SURVEY_COMPLETE = createLocaleField(["survey", "done"]);
const SURVEY_PAGE_TITLE: LocaleField = {
	ja: "アンケート",
	en: "Survey",
};

const LOCKED_HEADING: LocaleField = {
	ja: "アンケートはまだご利用いただけません",
	en: "Survey Not Yet Available",
};

const LOCKED_DESCRIPTION: LocaleField = {
	ja: "すべての展示スタンプを集めてから再度アクセスしてください。",
	en: "Collect all exhibit stamps before returning to this page.",
};

const COMMENT_LABEL: LocaleField = {
	ja: "ご意見・ご感想（任意）",
	en: "Comments (optional)",
};

const COMMENT_PLACEHOLDER: LocaleField = {
	ja: "気に入った展示や改善してほしい点があればご記入ください。",
	en: "Share highlights or ideas to improve the festival experience.",
};

const ATTENDEE_ERROR_HEADING: LocaleField = {
	ja: "参加者情報を取得できませんでした",
	en: "Unable to resolve attendee identity",
};

const ATTENDEE_ERROR_MESSAGE: LocaleField = {
	ja: "ページを再読み込みするか、ホーム画面から再度アクセスしてください。",
	en: "Refresh the page or return to the home screen before trying again.",
};

const RATING_OPTIONS: ReadonlyArray<RatingOption> = [
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

const SURVEY_QUESTIONS: ReadonlyArray<SurveyQuestion> = [
	{
		name: "ratingPhotobooth",
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
		name: "ratingAquarium",
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
		name: "ratingStampRally",
		heading: {
			ja: "スタンプラリー全体の満足度",
			en: "Overall Stamp Rally Satisfaction",
		},
		description: {
			ja: "受付から景品受け取りまでの流れを振り返って評価してください。",
			en: "Rate your experience from check-in to reward unlock.",
		},
	},
];

const COMMENT_MAX_LENGTH = 500;

const toRatingNumber = (value: string): number => {
	const parsed = Number.parseInt(value, 10);
	if (Number.isNaN(parsed)) {
		return 0;
	}
	return parsed;
};

const resolveSubmissionErrorCopy = (): SubmissionErrorState => ({
	heading: {
		ja: "送信に失敗しました",
		en: "Submission Failed",
	},
	message: {
		ja: "通信状況をご確認のうえ、もう一度お試しください。",
		en: "Check your connection and try submitting again.",
	},
});

const LocaleStack = ({ copy }: { copy: LocaleField }) => (
	<div className="flex flex-col gap-0.5">
		<span className="text-base font-semibold leading-tight">{copy.ja}</span>
		<span className="text-xs text-muted-foreground leading-tight">
			{copy.en}
		</span>
	</div>
);

const MissingStampList = ({
	progress,
}: {
	progress: StampProgressSnapshot;
}) => {
	const missing = useMemo(
		() =>
			EXHIBIT_CHECKPOINTS.filter((checkpoint) => progress[checkpoint] === null),
		[progress],
	);

	if (missing.length === 0) {
		return null;
	}

	return (
		<ul className="text-muted-foreground mt-4 list-disc space-y-1 pl-5 text-sm">
			{missing.map((checkpoint) => (
				<li key={checkpoint}>
					<span className="font-medium text-foreground">
						{CHECKPOINT_LABELS[checkpoint].ja}
					</span>
					<span className="ml-2 text-xs">
						{CHECKPOINT_LABELS[checkpoint].en}
					</span>
				</li>
			))}
		</ul>
	);
};

const SurveyForm = ({
	attendeeId,
	progress,
}: {
	attendeeId: string;
	progress: StampProgressSnapshot;
}) => {
	const router = useRouter();
	const [submissionError, setSubmissionError] =
		useState<SubmissionErrorState>(null);
	const [isPending, startTransition] = useTransition();

	const {
		control,
		register,
		handleSubmit,
		reset,
		formState: { errors },
	} = useForm<SurveyFormValues>({
		defaultValues: {
			ratingPhotobooth: "",
			ratingAquarium: "",
			ratingStampRally: "",
			freeComment: "",
		},
		shouldFocusError: true,
	});

	const onSubmit = useCallback(
		(values: SurveyFormValues) => {
			const photobooth = toRatingNumber(values.ratingPhotobooth);
			const aquarium = toRatingNumber(values.ratingAquarium);
			const stampRally = toRatingNumber(values.ratingStampRally);

			if (photobooth === 0 || aquarium === 0 || stampRally === 0) {
				return;
			}

			const freeComment = values.freeComment.trim();

			setSubmissionError(null);

			startTransition(() => {
				void submitSurveyAction({
					attendeeId,
					answers: {
						ratingPhotobooth: photobooth,
						ratingAquarium: aquarium,
						ratingStampRally: stampRally,
						freeComment: freeComment.length === 0 ? null : freeComment,
					},
				})
					.then(() => {
						reset();
						router.push("/gift");
					})
					.catch((error: unknown) => {
						getLogger().error(error, "Failed to submit survey responses.");
						setSubmissionError(resolveSubmissionErrorCopy());
					});
			});
		},
		[attendeeId, reset, router],
	);

	const isSubmitting = isPending;

	return (
		<form
			data-testid="survey-form"
			onSubmit={handleSubmit(onSubmit)}
			className="flex w-full flex-col gap-8"
		>
			<header className="flex flex-col gap-3 text-center">
				<h1 className="text-3xl font-semibold tracking-tight">
					{SURVEY_PAGE_TITLE.ja}
				</h1>
				<p className="text-muted-foreground text-sm">{SURVEY_PAGE_TITLE.en}</p>
				<p className="text-base font-medium">{SURVEY_HEADING.ja}</p>
				<p className="text-muted-foreground text-sm">{SURVEY_HEADING.en}</p>
			</header>

			<Card className="border-primary/20 shadow-md">
				<CardHeader className="space-y-2 text-center">
					<h2 className="text-xl font-semibold">{SURVEY_COMPLETE.ja}</h2>
					<CardDescription>{SURVEY_COMPLETE.en}</CardDescription>
				</CardHeader>
				<CardContent className="flex flex-col gap-8">
					<FieldSet>
						<FieldLegend className="text-center text-lg font-semibold">
							<span>{SURVEY_DESCRIPTION.ja}</span>
							<span className="block text-sm text-muted-foreground">
								{SURVEY_DESCRIPTION.en}
							</span>
						</FieldLegend>
						<FieldGroup>
							{SURVEY_QUESTIONS.map((question) => (
								<Controller
									key={question.name}
									control={control}
									name={question.name}
									rules={{
										required: {
											value: true,
											message: "1 から 5 のいずれかを選択してください。",
										},
									}}
									render={({ field, fieldState }) => (
										<Field data-invalid={fieldState.invalid ? "true" : "false"}>
											<FieldTitle className="flex flex-col gap-1">
												<span className="text-base font-semibold">
													{question.heading.ja}
												</span>
												<span className="text-xs text-muted-foreground">
													{question.heading.en}
												</span>
											</FieldTitle>
											<FieldDescription className="flex flex-col gap-1">
												<span>{question.description.ja}</span>
												<span className="text-xs text-muted-foreground">
													{question.description.en}
												</span>
											</FieldDescription>
											<FieldContent>
												<RadioGroup
													name={field.name}
													value={field.value}
													onValueChange={field.onChange}
													onBlur={field.onBlur}
													className="grid gap-3 sm:grid-cols-2"
												>
													{RATING_OPTIONS.map((option) => {
														const inputId = `${field.name}-${option.value}`;
														return (
															<FieldLabel
																key={option.value}
																htmlFor={inputId}
																className="items-center gap-3 rounded-lg border border-muted-foreground/30 p-3 transition hover:border-primary focus-within:border-primary data-[state=checked]:border-primary data-[state=checked]:bg-primary/5"
															>
																<RadioGroupItem
																	id={inputId}
																	value={option.value}
																	aria-invalid={
																		fieldState.invalid ? "true" : "false"
																	}
																/>
																<LocaleStack copy={option.label} />
															</FieldLabel>
														);
													})}
												</RadioGroup>
											</FieldContent>
											<FieldError
												errors={
													fieldState.error ? [fieldState.error] : undefined
												}
											/>
										</Field>
									)}
								/>
							))}

							<Field
								data-invalid={errors.freeComment ? "true" : "false"}
								className="flex flex-col gap-2"
							>
								<FieldTitle className="flex flex-col gap-1">
									<span className="text-base font-semibold">
										{COMMENT_LABEL.ja}
									</span>
									<span className="text-xs text-muted-foreground">
										{COMMENT_LABEL.en}
									</span>
								</FieldTitle>
								<FieldDescription className="flex flex-col gap-1">
									<span>{COMMENT_PLACEHOLDER.ja}</span>
									<span className="text-xs text-muted-foreground">
										{COMMENT_PLACEHOLDER.en}
									</span>
								</FieldDescription>
								<FieldContent>
									<InputGroup className="min-h-24">
										<InputGroupAddon align="block-start" className="text-xs">
											<span>{COMMENT_LABEL.ja}</span>
											<span className="text-muted-foreground block text-[11px]">
												{COMMENT_LABEL.en}
											</span>
										</InputGroupAddon>
										<InputGroupTextarea
											{...register("freeComment", {
												maxLength: {
													value: COMMENT_MAX_LENGTH,
													message: `${COMMENT_MAX_LENGTH} 文字以内で入力してください。`,
												},
											})}
											aria-invalid={errors.freeComment ? "true" : "false"}
											placeholder={`${COMMENT_PLACEHOLDER.ja}\n${COMMENT_PLACEHOLDER.en}`}
											rows={5}
										/>
									</InputGroup>
								</FieldContent>
								<FieldError
									errors={errors.freeComment ? [errors.freeComment] : undefined}
								/>
							</Field>
						</FieldGroup>
					</FieldSet>

					{submissionError ? (
						<Alert variant="destructive">
							<AlertTitle>{submissionError.heading.ja}</AlertTitle>
							<AlertDescription>
								<p>{submissionError.heading.en}</p>
								<p>{submissionError.message.ja}</p>
								<p>{submissionError.message.en}</p>
							</AlertDescription>
						</Alert>
					) : null}

					<div className="flex flex-col gap-2">
						<Button
							type="submit"
							className="flex items-center justify-center gap-2 py-6 text-base"
							disabled={isSubmitting}
						>
							{isSubmitting ? (
								<>
									<Spinner className="size-5" />
									<span>送信中…</span>
								</>
							) : (
								<span>アンケートを送信する</span>
							)}
						</Button>
						<p className="text-center text-xs text-muted-foreground">
							{attendeeId.slice(0, 6)}… で回答を記録します。
						</p>
					</div>
				</CardContent>
			</Card>

			<section className="rounded-xl border border-muted-foreground/20 bg-muted/10 px-4 py-3 text-center text-sm">
				<p className="font-medium">{SURVEY_COMPLETE.ja}</p>
				<p className="text-muted-foreground text-xs">{SURVEY_COMPLETE.en}</p>
				<MissingStampList progress={progress} />
			</section>
		</form>
	);
};

const SurveyFormPage = () => {
	const router = useRouter();
	const { attendeeId, isLoading } = useAnonymousAttendeeId();
	const redirectRef = useRef(false);

	const { data: snapshot } = useStampProgress(attendeeId);

	const progress = snapshot ?? createEmptyStampProgress();

	const hasExhibitStamps = useMemo(
		() =>
			EXHIBIT_CHECKPOINTS.every((checkpoint) => progress[checkpoint] !== null),
		[progress],
	);

	useEffect(() => {
		if (isLoading || attendeeId === null) {
			return;
		}
		if (hasExhibitStamps) {
			redirectRef.current = false;
			return;
		}
		if (!redirectRef.current) {
			router.push("/");
			redirectRef.current = true;
		}
	}, [attendeeId, hasExhibitStamps, isLoading, router]);

	if (isLoading) {
		return (
			<main className="bg-background text-foreground mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-4 px-6 py-12">
				<Spinner className="size-6 text-primary" />
				<p className="text-sm text-muted-foreground">
					まちかね祭スタンプラリーに接続しています…
				</p>
			</main>
		);
	}

	if (attendeeId === null) {
		return (
			<main className="bg-background text-foreground mx-auto flex min-h-screen max-w-2xl flex-col items-center gap-8 px-6 py-12">
				<Card className="w-full border-destructive/40 bg-destructive/5 shadow-md">
					<CardHeader className="text-center">
						<h1 className="text-2xl font-semibold tracking-tight text-destructive">
							{ATTENDEE_ERROR_HEADING.ja}
						</h1>
						<CardDescription>{ATTENDEE_ERROR_HEADING.en}</CardDescription>
					</CardHeader>
					<CardContent className="flex flex-col items-center gap-3 text-center text-sm">
						<p>{ATTENDEE_ERROR_MESSAGE.ja}</p>
						<p className="text-muted-foreground text-xs">
							{ATTENDEE_ERROR_MESSAGE.en}
						</p>
					</CardContent>
				</Card>
			</main>
		);
	}

	if (!hasExhibitStamps) {
		return (
			<main className="bg-background text-foreground mx-auto flex min-h-screen max-w-2xl flex-col items-center gap-8 px-6 py-12">
				<Card
					data-testid="survey-access-locked"
					className="w-full border-primary/20 bg-muted/30 shadow-md"
				>
					<CardHeader className="text-center">
						<h1 className="text-2xl font-semibold tracking-tight">
							{LOCKED_HEADING.ja}
						</h1>
						<CardDescription>{LOCKED_HEADING.en}</CardDescription>
					</CardHeader>
					<CardContent className="flex flex-col items-center gap-4 text-center text-sm">
						<p>{LOCKED_DESCRIPTION.ja}</p>
						<p className="text-muted-foreground text-xs">
							{LOCKED_DESCRIPTION.en}
						</p>
						<MissingStampList progress={progress} />
					</CardContent>
				</Card>
			</main>
		);
	}

	return (
		<main className="bg-background text-foreground mx-auto flex min-h-screen max-w-3xl flex-col items-center px-6 py-12">
			<SurveyForm attendeeId={attendeeId} progress={progress} />
		</main>
	);
};

export default SurveyFormPage;
