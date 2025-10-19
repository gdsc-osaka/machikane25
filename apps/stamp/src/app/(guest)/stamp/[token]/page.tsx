"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { ClaimStampSuccess } from "@/application/stamps/claim-stamp";
import { claimStampWithToken } from "@/application/stamps/claim-stamp.client";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import {
	DuplicateStampError,
	InvalidStampTokenError,
	STAMP_SEQUENCE,
	type StampCheckpoint,
	type StampProgress,
} from "@/domain/stamp";
import { getStampCopy, type SupportedLocale } from "@/libs/i18n/stamp-copy";
import { cn } from "@/libs/utils";

type ClaimUiState =
	| { status: "loading" }
	| { status: "success"; payload: ClaimStampSuccess }
	| { status: "duplicate" }
	| { status: "invalid" }
	| { status: "error" };

type ClaimOutcome = "success" | "duplicate" | "invalid" | "error";

type OutcomeCopy = {
	body: Record<SupportedLocale, string>;
	heading: Record<SupportedLocale, string>;
};

const OUTCOME_COPY: Record<ClaimOutcome, OutcomeCopy> = {
	success: {
		heading: {
			ja: getStampCopy("ja", ["stamp", "claimSuccess", "heading"]),
			en: getStampCopy("en", ["stamp", "claimSuccess", "heading"]),
		},
		body: {
			ja: getStampCopy("ja", ["stamp", "claimSuccess", "body"]),
			en: getStampCopy("en", ["stamp", "claimSuccess", "body"]),
		},
	},
	duplicate: {
		heading: {
			ja: getStampCopy("ja", ["stamp", "duplicate", "heading"]),
			en: getStampCopy("en", ["stamp", "duplicate", "heading"]),
		},
		body: {
			ja: getStampCopy("ja", ["stamp", "duplicate", "body"]),
			en: getStampCopy("en", ["stamp", "duplicate", "body"]),
		},
	},
	invalid: {
		heading: {
			ja: getStampCopy("ja", ["stamp", "invalidToken", "heading"]),
			en: getStampCopy("en", ["stamp", "invalidToken", "heading"]),
		},
		body: {
			ja: getStampCopy("ja", ["stamp", "invalidToken", "body"]),
			en: getStampCopy("en", ["stamp", "invalidToken", "body"]),
		},
	},
	error: {
		heading: {
			ja: getStampCopy("ja", ["errors", "generic"]),
			en: getStampCopy("en", ["errors", "generic"]),
		},
		body: {
			ja: getStampCopy("ja", ["errors", "offline"]),
			en: getStampCopy("en", ["errors", "offline"]),
		},
	},
};

const LOADING_COPY: Record<SupportedLocale, string> = {
	ja: "スタンプの記録を更新しています…",
	en: "Updating your stamp board…",
};

const HOME_LINK_COPY: Record<SupportedLocale, string> = {
	ja: "スタンプ一覧を見る",
	en: "View Stamp Board",
};

const PROGRESS_LABEL_COPY: Record<SupportedLocale, string> = {
	ja: "獲得状況",
	en: "Your Progress",
};

const CHECKPOINT_LABELS: Record<
	StampCheckpoint,
	Record<SupportedLocale, string>
> = {
	reception: { ja: "受付", en: "Reception" },
	photobooth: { ja: "フォトブース", en: "Photo Booth" },
	art: { ja: "アート展示", en: "Art Exhibit" },
	robot: { ja: "ロボット研究", en: "Robotics Lab" },
	survey: { ja: "アンケート", en: "Survey" },
};

const formatProgressSummary = (
	progress: StampProgress,
	locale: SupportedLocale,
): string => {
	const collectedCount = progress.collected.length;
	const total = STAMP_SEQUENCE.length;
	if (locale === "ja") {
		return `取得済み ${collectedCount} / ${total}`;
	}
	return `Collected ${collectedCount} of ${total}`;
};

const getOutcomeCopy = (outcome: ClaimOutcome) => OUTCOME_COPY[outcome];

const resolveCheckpointTone = (collected: boolean) =>
	cn(
		"rounded-xl border px-4 py-3 transition-all duration-500",
		collected
			? "bg-primary/10 border-primary text-primary animate-in fade-in slide-in-from-bottom-2"
			: "bg-muted/40 border-dashed border-muted-foreground/40 text-muted-foreground",
	);

const StampProgressList = ({ progress }: { progress: StampProgress }) => {
	const collected = useMemo(
		() =>
			progress.collected.reduce<Record<StampCheckpoint, boolean>>(
				(acc, checkpoint) => ({
					...acc,
					[checkpoint]: true,
				}),
				{
					reception: false,
					photobooth: false,
					art: false,
					robot: false,
					survey: false,
				},
			),
		[progress.collected],
	);

	return (
		<div className="flex w-full flex-col gap-3">
			<div className="flex flex-col gap-1">
				<p className="text-sm font-semibold text-muted-foreground">
					{PROGRESS_LABEL_COPY.ja}
				</p>
				<p className="text-xs text-muted-foreground">
					{PROGRESS_LABEL_COPY.en}
				</p>
			</div>
			<ul className="grid gap-3 sm:grid-cols-2">
				{STAMP_SEQUENCE.map((checkpoint) => {
					const isCollected = collected[checkpoint] ?? false;
					return (
						<li key={checkpoint} className={resolveCheckpointTone(isCollected)}>
							<p className="text-sm font-semibold">
								{CHECKPOINT_LABELS[checkpoint].ja}
							</p>
							<p className="text-xs text-muted-foreground">
								{CHECKPOINT_LABELS[checkpoint].en}
							</p>
						</li>
					);
				})}
			</ul>
			<div className="flex flex-col gap-1 text-sm font-medium">
				<span>{formatProgressSummary(progress, "ja")}</span>
				<span className="text-muted-foreground">
					{formatProgressSummary(progress, "en")}
				</span>
			</div>
		</div>
	);
};

const resolveOutcome = (state: ClaimUiState): ClaimOutcome | null => {
	if (state.status === "success") {
		return "success";
	}
	if (state.status === "duplicate") {
		return "duplicate";
	}
	if (state.status === "invalid") {
		return "invalid";
	}
	if (state.status === "error") {
		return "error";
	}
	return null;
};

type StampTokenPageProps = {
	params: {
		token: string;
	};
};

export default function StampTokenPage({ params }: StampTokenPageProps) {
	const { token } = params;
	const [claimState, setClaimState] = useState<ClaimUiState>({
		status: "loading",
	});

	useEffect(() => {
		const active = { current: true };
		setClaimState({ status: "loading" });

		void claimStampWithToken(token)
			.match(
				(payload) => {
					if (!active.current) {
						return;
					}
					setClaimState({ status: "success", payload });
				},
				(error) => {
					if (!active.current) {
						return;
					}
					if (DuplicateStampError.isFn(error)) {
						setClaimState({ status: "duplicate" });
						return;
					}
					if (InvalidStampTokenError.isFn(error)) {
						setClaimState({ status: "invalid" });
						return;
					}
					setClaimState({ status: "error" });
				},
			)
			.catch(() => {
				if (active.current) {
					setClaimState({ status: "error" });
				}
			});

		return () => {
			active.current = false;
		};
	}, [token]);

	const outcome = resolveOutcome(claimState);
	const outcomeCopy = outcome === null ? null : getOutcomeCopy(outcome);

	return (
		<main className="bg-background text-foreground mx-auto flex min-h-screen max-w-3xl flex-col items-center gap-8 px-6 py-12">
			<section className="flex w-full flex-col items-center gap-6 text-center">
				<h1 className="text-2xl font-semibold tracking-tight">
					まちかね祭スタンプラリー
				</h1>
				<p className="text-muted-foreground text-sm">
					Machikane Festival Stamp Rally
				</p>
			</section>

			<Card
				data-testid="claim-status"
				data-state={claimState.status}
				className={cn(
					"w-full max-w-xl animate-in fade-in slide-in-from-bottom-4 border-primary/20 shadow-lg",
					claimState.status === "loading"
						? "border-dashed"
						: claimState.status === "success"
							? "border-primary bg-primary/10"
							: claimState.status === "error"
								? "border-destructive/40 bg-destructive/5"
								: "border-primary/20 bg-background/80 backdrop-blur",
				)}
			>
				<CardHeader className="flex flex-col items-center gap-3 text-center">
					{claimState.status === "loading" ? (
						<>
							<Spinner className="size-8 text-primary" />
							<h2 className="text-xl font-semibold">{LOADING_COPY.ja}</h2>
							<CardDescription className="text-sm">
								{LOADING_COPY.en}
							</CardDescription>
						</>
					) : outcomeCopy !== null ? (
						<>
							<h2 className="text-xl font-semibold">
								{outcomeCopy.heading.ja}
							</h2>
							<CardDescription className="text-base text-foreground">
								{outcomeCopy.heading.en}
							</CardDescription>
							<p className="text-sm text-muted-foreground">
								{outcomeCopy.body.ja}
							</p>
							<p className="text-xs text-muted-foreground/80">
								{outcomeCopy.body.en}
							</p>
						</>
					) : null}
				</CardHeader>

				{claimState.status === "success" ? (
					<CardContent className="flex flex-col items-center gap-6">
						<StampProgressList progress={claimState.payload.progress} />
						<Button asChild size="lg" variant="outline">
							<Link href="/" className="flex flex-col items-center gap-1">
								<span>{HOME_LINK_COPY.ja}</span>
								<span
									aria-hidden="true"
									className="text-xs text-muted-foreground"
								>
									{HOME_LINK_COPY.en}
								</span>
							</Link>
						</Button>
					</CardContent>
				) : (
					<CardContent className="flex justify-center">
						<Button asChild size="lg" variant="outline">
							<Link href="/" className="flex flex-col items-center gap-1">
								<span>{HOME_LINK_COPY.ja}</span>
								<span
									aria-hidden="true"
									className="text-xs text-muted-foreground"
								>
									{HOME_LINK_COPY.en}
								</span>
							</Link>
						</Button>
					</CardContent>
				)}
			</Card>
		</main>
	);
}
