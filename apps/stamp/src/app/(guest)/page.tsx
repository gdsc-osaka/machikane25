"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
	createStampProgress,
	createEmptyLedger,
	STAMP_SEQUENCE,
	type StampCheckpoint,
} from "@/domain/stamp";
import {
	getStampMessages,
	type CheckpointMessages,
	type SupportedLocale,
} from "@/application/i18n/messages";
import {
	type StampProgressSnapshot,
	useStampProgress,
} from "@/hooks/use-stamp-progress";
import { useAnonymousAttendee } from "@/hooks/use-anonymous-attendee";

const EXHIBIT_CHECKPOINTS: ReadonlyArray<StampCheckpoint> = [
	"reception",
	"photobooth",
	"art",
	"robot",
];

const resolveLocale = (): SupportedLocale => {
	if (typeof navigator === "undefined") {
		return "ja";
	}
	return navigator.language.startsWith("ja") ? "ja" : "en";
};

const isCollected = (
	progress: StampProgressSnapshot,
	checkpoint: StampCheckpoint,
) => progress[checkpoint] !== null;

const createBoardItems = (
	progress: StampProgressSnapshot,
	labels: CheckpointMessages,
) =>
	STAMP_SEQUENCE.map((checkpoint) => ({
		checkpoint,
		label: labels[checkpoint],
		collected: isCollected(progress, checkpoint),
	}));

export default function GuestHomePage() {
	const attendee = useAnonymousAttendee();
	const locale = useMemo(resolveLocale, []);
	const { data: ledger } = useStampProgress(attendee.attendeeId);
	const messages = useMemo(() => getStampMessages(locale), [locale]);
	const boardLedger = ledger ?? createEmptyLedger();
	const progress = useMemo(
		() => createStampProgress(boardLedger),
		[boardLedger],
	);
	const progressSummary = locale === "ja"
		? `スタンプ獲得状況: ${progress.collected.length} / ${STAMP_SEQUENCE.length}`
		: `${progress.collected.length} / ${STAMP_SEQUENCE.length} stamps collected`;
	const loadingMessage = locale === "ja"
		? "プロフィールを読み込み中です…"
		: "Loading your festival profile…";
	const errorMessage = locale === "ja"
		? "Firebase に接続できませんでした。再読み込みしてください。"
		: "We could not connect to Firebase. Please refresh and try again.";
	const boardItems = useMemo(
		() => createBoardItems(boardLedger, messages.checkpoints),
		[boardLedger, messages.checkpoints],
	);

	const exhibitsCollected = EXHIBIT_CHECKPOINTS.every((checkpoint) =>
		isCollected(boardLedger, checkpoint),
	);
	const surveyCompleted = isCollected(boardLedger, "survey");
	const surveyCtaLabel = exhibitsCollected
		? messages.home.cta.surveyReady
		: messages.home.cta.surveyLocked;
	const rewardCtaLabel = surveyCompleted
		? messages.home.cta.rewardReady
		: messages.home.cta.rewardLocked;

	return (
		<main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-10 px-6 py-12">
			<section className="flex flex-col gap-4 text-center">
				<p className="text-sm uppercase tracking-[0.25em] text-muted-foreground">
					Machikane Festival 2025
				</p>
				<h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
					{messages.home.heading}
				</h1>
				<p className="text-base text-muted-foreground sm:text-lg">
					{messages.home.subheading}
				</p>
			</section>

			<section className="flex flex-col gap-8">
				<div className="flex flex-col gap-3">
					<h2 className="text-lg font-semibold uppercase tracking-[0.4em] text-muted-foreground">
						{messages.home.stampBoardLabel}
					</h2>
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
						{boardItems.map((item) => (
							<div
								key={item.checkpoint}
								className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-6 text-center shadow-sm"
							>
								<div
									className={`flex h-24 w-24 items-center justify-center rounded-full border-4 text-xl font-bold transition-colors ${
										item.collected
											? "border-primary bg-primary/20 text-primary"
											: "border-muted bg-muted text-muted-foreground"
									}`}
								>
									{item.collected ? "✓" : "・"}
								</div>
								<p className="text-base font-medium text-foreground">
									{item.label}
								</p>
							</div>
						))}
					</div>
				</div>

				<div className="flex flex-col gap-3 rounded-2xl border border-border bg-card/80 p-6 shadow-sm backdrop-blur">
					<h3 className="text-lg font-semibold text-foreground">
						{messages.home.heading}
					</h3>
					<p className="text-sm text-muted-foreground">
						{progressSummary}
					</p>
					<div className="grid gap-3 sm:grid-cols-2">
						{exhibitsCollected ? (
							<Button asChild className="w-full">
								<Link href="/form">{surveyCtaLabel}</Link>
							</Button>
						) : (
							<Button className="w-full" disabled>
								{surveyCtaLabel}
							</Button>
						)}
						{surveyCompleted ? (
							<Button asChild className="w-full" variant="secondary">
								<Link href="/gift">{rewardCtaLabel}</Link>
							</Button>
						) : (
							<Button className="w-full" variant="secondary" disabled>
								{rewardCtaLabel}
							</Button>
						)}
					</div>
					{attendee.status === "loading" ? (
						<p className="text-xs text-muted-foreground">
							{loadingMessage}
						</p>
					) : null}
					{attendee.status === "error" ? (
						<p className="text-xs text-destructive">
							{errorMessage}
						</p>
					) : null}
				</div>
			</section>
		</main>
	);
}
