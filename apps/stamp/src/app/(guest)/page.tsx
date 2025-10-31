"use client";

import { signInAnonymously } from "firebase/auth";
import Image from "next/image";
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
import {
	CHECKPOINT_LABELS,
	formatProgressSummary,
	HOME_MESSAGES,
	type LocaleField,
} from "@/libs/i18n/messages";
import { cn } from "@/libs/utils";
import { getLogger } from "@/packages/logger";
import logoBlue from "../../../public/gdg-blue.svg";
import logoColor from "../../../public/gdg-color.svg";
import logoGreen from "../../../public/gdg-green.svg";
import logoRed from "../../../public/gdg-red.svg";
import logoYellow from "../../../public/gdg-yellow.svg";
import fullLogo from "../../../public/gdgoc-osaka-full-logo.svg";

type StampBoardState = Record<StampIdentifier, boolean>;

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

const boardItemTone = (isCollected: boolean, checkpoint: StampCheckpoint) =>
	cn(
		"rounded-xl border px-4 py-4 transition-colors duration-300 flex items-center justify-center gap-8",
		isCollected
			? "border-primary bg-primary/10 text-primary shadow-sm"
			: "border-muted-foreground/30 border-dashed bg-muted/30 text-muted-foreground",
		checkpoint === "reception"
			? "bg-[#FFE7A5] border-[#FAAB00]"
			: checkpoint === "photobooth"
				? "bg-[#CCF6C5] border-[#34A853]"
				: checkpoint === "robot"
					? "bg-[#F8D8D8] border-[#EA4336]"
					: checkpoint === "art"
						? "bg-[#C3ECF6] border-[#4285F4]"
						: "border-primary text-primary",
	);

const getCheckpointLogo = (checkpoint: StampCheckpoint) => {
	switch (checkpoint) {
		case "reception":
			return logoYellow;
		case "photobooth":
			return logoGreen;
		case "art":
			return logoBlue;
		case "robot":
			return logoRed;
		case "survey":
			return logoColor;
		default:
			return null;
	}
};

const LocaleStack = ({ copy }: { copy: LocaleField }) => (
	<span className="flex flex-col items-center gap-0.5 text-center">
		<span className="text-base font-semibold">{copy.ja}</span>
		<span className="text-xs text-muted-foreground">{copy.en}</span>
	</span>
);

const resolveSurveyCopy = (isSurveyReady: boolean) =>
	isSurveyReady
		? HOME_MESSAGES.cta.surveyReady
		: HOME_MESSAGES.cta.surveyLocked;

const resolveRewardCopy = (isRewardReady: boolean) =>
	isRewardReady
		? HOME_MESSAGES.cta.rewardReady
		: HOME_MESSAGES.cta.rewardLocked;

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
	const summaryCopy = formatProgressSummary({
		collected: collectedCount,
		total: totalCount,
	});

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
				<Image
					src={fullLogo}
					alt={"GDG on Campus University of Osaka のロゴ"}
				/>
				<h1 className="text-3xl font-semibold tracking-tight">
					{HOME_MESSAGES.heading.ja}
				</h1>
				<p className="text-muted-foreground text-sm">
					{HOME_MESSAGES.heading.en}
				</p>
				<p className="text-lg font-medium">{HOME_MESSAGES.subheading.ja}</p>
				<p className="text-muted-foreground text-sm">
					{HOME_MESSAGES.subheading.en}
				</p>
			</section>

			<Card className="border-primary/20 shadow-md">
				<CardHeader className="text-center">
					<h2 className="text-xl font-semibold">
						{HOME_MESSAGES.boardLabel.ja}
					</h2>
					<CardDescription>{HOME_MESSAGES.boardLabel.en}</CardDescription>
				</CardHeader>
				<CardContent className="flex flex-col gap-6">
					<ul className="grid gap-4 sm:grid-cols-2">
						{STAMP_SEQUENCE.map((checkpoint) => (
							<li
								key={checkpoint}
								className={boardItemTone(boardState[checkpoint], checkpoint)}
							>
								<div className="bg-white border-2 flex items-center justify-center rounded-full w-16 h-16">
									{boardState[checkpoint] ? (
										<Image
											src={getCheckpointLogo(checkpoint)}
											alt=""
											width={36}
										/>
									) : null}
								</div>
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
