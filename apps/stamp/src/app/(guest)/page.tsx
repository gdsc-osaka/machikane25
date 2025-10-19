"use client";

import { signInAnonymously } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
} from "@/components/ui/card";
import { STAMP_SEQUENCE, type StampCheckpoint } from "@/domain/stamp";
import { getFirebaseAuth } from "@/firebase";
import {
	createEmptyStampProgress,
	type StampIdentifier,
	type StampProgressSnapshot,
	useStampProgress,
} from "@/hooks/use-stamp-progress";
import { getStampCopy } from "@/libs/i18n/stamp-copy";
import { cn } from "@/libs/utils";
import { getLogger } from "@/packages/logger";

type LocaleField = {
	en: string;
	ja: string;
};

type StampBoardState = Record<StampIdentifier, boolean>;

const HOME_COPY = {
	heading: {
		ja: getStampCopy("ja", ["home", "heading"]),
		en: getStampCopy("en", ["home", "heading"]),
	},
	subheading: {
		ja: getStampCopy("ja", ["home", "subheading"]),
		en: getStampCopy("en", ["home", "subheading"]),
	},
	boardLabel: {
		ja: getStampCopy("ja", ["home", "stampBoardLabel"]),
		en: getStampCopy("en", ["home", "stampBoardLabel"]),
	},
	cta: {
		surveyLocked: {
			ja: getStampCopy("ja", ["home", "cta", "surveyLocked"]),
			en: getStampCopy("en", ["home", "cta", "surveyLocked"]),
		},
		surveyReady: {
			ja: getStampCopy("ja", ["home", "cta", "surveyReady"]),
			en: getStampCopy("en", ["home", "cta", "surveyReady"]),
		},
		rewardLocked: {
			ja: getStampCopy("ja", ["home", "cta", "rewardLocked"]),
			en: getStampCopy("en", ["home", "cta", "rewardLocked"]),
		},
		rewardReady: {
			ja: getStampCopy("ja", ["home", "cta", "rewardReady"]),
			en: getStampCopy("en", ["home", "cta", "rewardReady"]),
		},
	},
} as const;

const CHECKPOINT_LABELS: Record<StampCheckpoint, LocaleField> = {
	reception: { ja: "受付", en: "Reception" },
	photobooth: { ja: "フォトブース", en: "Photo Booth" },
	art: { ja: "アート展示", en: "Art Exhibit" },
	robot: { ja: "ロボット研究", en: "Robotics Lab" },
	survey: { ja: "アンケート", en: "Survey" },
};

const createInitialBoardState = (): StampBoardState => ({
	reception: false,
	photobooth: false,
	art: false,
	robot: false,
	survey: false,
});

const resolveBoardState = (progress: StampProgressSnapshot): StampBoardState =>
	STAMP_SEQUENCE.reduce<StampBoardState>(
		(state, checkpoint) => ({
			...state,
			[checkpoint]: progress[checkpoint] !== null,
		}),
		createInitialBoardState(),
	);

const resolveProgressSummary = (
	collectedCount: number,
	totalCount: number,
): LocaleField => ({
	ja: `取得済み ${collectedCount} / ${totalCount}`,
	en: `Collected ${collectedCount} of ${totalCount}`,
});

const boardItemTone = (isCollected: boolean) =>
	cn(
		"rounded-xl border px-4 py-4 transition-colors duration-300",
		isCollected
			? "border-primary bg-primary/10 text-primary shadow-sm"
			: "border-muted-foreground/30 border-dashed bg-muted/30 text-muted-foreground",
	);

const LocaleStack = ({ copy }: { copy: LocaleField }) => (
	<span className="flex flex-col items-center gap-0.5 text-center">
		<span className="text-base font-semibold">{copy.ja}</span>
		<span className="text-xs text-muted-foreground">{copy.en}</span>
	</span>
);

const resolveSurveyCopy = (isSurveyReady: boolean) =>
	isSurveyReady ? HOME_COPY.cta.surveyReady : HOME_COPY.cta.surveyLocked;

const resolveRewardCopy = (isRewardReady: boolean) =>
	isRewardReady ? HOME_COPY.cta.rewardReady : HOME_COPY.cta.rewardLocked;

export default function HomePage() {
	const [attendeeId, setAttendeeId] = useState<string | null>(null);
	const router = useRouter();
	const { data: progressSnapshot } = useStampProgress(attendeeId);

	useEffect(() => {
		const auth = getFirebaseAuth();
		const existingUser = auth.currentUser;
		if (existingUser !== null) {
			setAttendeeId(existingUser.uid);
			return;
		}
		const controller = new AbortController();
		signInAnonymously(auth)
			.then((credentials) => {
				if (!controller.signal.aborted) {
					setAttendeeId(credentials.user.uid);
				}
			})
			.catch((error) => {
				if (!controller.signal.aborted) {
					getLogger().error(
						error,
						"Failed to resolve attendee identity on home page.",
					);
				}
			});
		return () => controller.abort();
	}, []);

	const effectiveProgress = progressSnapshot ?? createEmptyStampProgress();
	const boardState = resolveBoardState(effectiveProgress);
	const collectedCount = STAMP_SEQUENCE.filter(
		(checkpoint) => boardState[checkpoint],
	).length;
	const totalCount = STAMP_SEQUENCE.length;
	const summaryCopy = resolveProgressSummary(collectedCount, totalCount);

	const isSurveyReady =
		boardState.reception &&
		boardState.photobooth &&
		boardState.art &&
		boardState.robot;
	const isRewardReady = boardState.survey;

	const surveyCopy = resolveSurveyCopy(isSurveyReady);
	const rewardCopy = resolveRewardCopy(isRewardReady);

	const handleSurveyClick = () => {
		if (!isSurveyReady) {
			return;
		}
		router.push("/form");
	};

	const handleRewardClick = () => {
		if (!isRewardReady) {
			return;
		}
		router.push("/gift");
	};

	return (
		<main className="bg-background text-foreground mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-6 py-12">
			<section className="flex flex-col items-center gap-4 text-center">
				<h1 className="text-3xl font-semibold tracking-tight">
					{HOME_COPY.heading.ja}
				</h1>
				<p className="text-muted-foreground text-sm">{HOME_COPY.heading.en}</p>
				<p className="text-lg font-medium">{HOME_COPY.subheading.ja}</p>
				<p className="text-muted-foreground text-sm">
					{HOME_COPY.subheading.en}
				</p>
			</section>

			<Card className="border-primary/20 shadow-md">
				<CardHeader className="text-center">
					<h2 className="text-xl font-semibold">{HOME_COPY.boardLabel.ja}</h2>
					<CardDescription>{HOME_COPY.boardLabel.en}</CardDescription>
				</CardHeader>
				<CardContent className="flex flex-col gap-6">
					<ul className="grid gap-4 sm:grid-cols-2">
						{STAMP_SEQUENCE.map((checkpoint) => (
							<li
								key={checkpoint}
								className={boardItemTone(boardState[checkpoint])}
							>
								<LocaleStack copy={CHECKPOINT_LABELS[checkpoint]} />
							</li>
						))}
					</ul>
					<div className="flex flex-col items-center gap-1 text-center text-sm font-medium">
						<span>{summaryCopy.ja}</span>
						<span className="text-muted-foreground">{summaryCopy.en}</span>
					</div>
				</CardContent>
			</Card>

			<section className="flex flex-col gap-4 sm:flex-row">
				<Button
					data-testid="cta-survey"
					type="button"
					variant="default"
					className="flex-1 py-6 text-center"
					disabled={!isSurveyReady}
					onClick={handleSurveyClick}
				>
					<LocaleStack copy={surveyCopy} />
				</Button>
				<Button
					data-testid="cta-reward"
					type="button"
					variant="outline"
					className="flex-1 py-6 text-center"
					disabled={!isRewardReady}
					onClick={handleRewardClick}
				>
					<LocaleStack copy={rewardCopy} />
				</Button>
			</section>
		</main>
	);
}
