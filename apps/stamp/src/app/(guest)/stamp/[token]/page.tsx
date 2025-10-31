"use client";

import Image from "next/image";
import Link from "next/link";
import { use, useMemo } from "react";
import useSWR from "swr";
import type {
	ClaimStampError,
	ClaimStampSuccess,
} from "@/application/stamps/claim-stamp";
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
import {
	CHECKPOINT_LABELS,
	formatProgressSummary,
	type LocaleField,
	STAMP_MESSAGES,
} from "@/libs/i18n/messages";
import { cn } from "@/libs/utils";
import logoBlue from "../../../../../public/gdg-blue.svg";
import logoColor from "../../../../../public/gdg-color.svg";
import logoGreen from "../../../../../public/gdg-green.svg";
import logoRed from "../../../../../public/gdg-red.svg";
import logoYellow from "../../../../../public/gdg-yellow.svg";

type ClaimUiState =
	| { status: "loading" }
	| { status: "success"; payload: ClaimStampSuccess }
	| { status: "duplicate" }
	| { status: "invalid" }
	| { status: "error" };

type ClaimOutcome = "success" | "duplicate" | "invalid" | "error";

type OutcomeCopy = {
	body: LocaleField;
	heading: LocaleField;
};

const CLAIM_STAMP_KEY = "claim-stamp";

const OUTCOME_COPY: Record<ClaimOutcome, OutcomeCopy> = {
	success: STAMP_MESSAGES.outcomes.success,
	duplicate: STAMP_MESSAGES.outcomes.duplicate,
	invalid: STAMP_MESSAGES.outcomes.invalid,
	error: STAMP_MESSAGES.outcomes.error,
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
	const summary = formatProgressSummary({
		collected: progress.collected.length,
		total: STAMP_SEQUENCE.length,
	});

	return (
		<div className="flex w-full flex-col gap-3">
			<div className="flex flex-col gap-1">
				<p className="text-sm font-semibold text-muted-foreground">
					{STAMP_MESSAGES.progressLabel.ja}
				</p>
				<p className="text-xs text-muted-foreground">
					{STAMP_MESSAGES.progressLabel.en}
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
				<span>{summary.ja}</span>
				<span className="text-muted-foreground">{summary.en}</span>
			</div>
		</div>
	);
};

type ClaimStampKey = [typeof CLAIM_STAMP_KEY, string];

const useClaimStamp = (token: string) =>
	useSWR<ClaimStampSuccess, ClaimStampError, ClaimStampKey | null>(
		token.length === 0 ? null : [CLAIM_STAMP_KEY, token],
		async ([, lookupToken]) =>
			claimStampWithToken(lookupToken).match(
				(payload) => payload,
				(error) => Promise.reject(error),
			),
		{ revalidateOnFocus: false },
	);

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
	params: Promise<{
		token: string;
	}>;
};

const stampColor = (checkpoint: StampCheckpoint) =>
	cn(
		"border-2 flex items-center justify-center rounded-full w-36 h-36",
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

export default function StampTokenPage(props: StampTokenPageProps) {
	const params = use(props.params);
	const { token } = params;
	const { data: claimResult, error: claimError } = useClaimStamp(token);

	const claimState: ClaimUiState = (() => {
		if (claimResult !== undefined) {
			return {
				status: "success",
				payload: claimResult,
			};
		}
		if (claimError !== undefined) {
			if (DuplicateStampError.isFn(claimError)) {
				return { status: "duplicate" };
			}
			if (InvalidStampTokenError.isFn(claimError)) {
				return { status: "invalid" };
			}
			return { status: "error" };
		}
		return { status: "loading" };
	})();

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
							<h2 className="text-xl font-semibold">
								{STAMP_MESSAGES.loading.ja}
							</h2>
							<CardDescription className="text-sm">
								{STAMP_MESSAGES.loading.en}
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
						<div className={stampColor(claimState.payload.checkpoint)}>
							<Image
								src={getCheckpointLogo(claimState.payload.checkpoint)}
								alt=""
								width={84}
							/>
						</div>
						<LocaleStack
							copy={CHECKPOINT_LABELS[claimState.payload.checkpoint]}
						/>

						<Button asChild size="lg" variant="outline">
							<Link href="/" className="flex flex-col items-center gap-1">
								<span>{STAMP_MESSAGES.homeLink.ja}</span>
								<span
									aria-hidden="true"
									className="text-xs text-muted-foreground"
								>
									{STAMP_MESSAGES.homeLink.en}
								</span>
							</Link>
						</Button>
					</CardContent>
				) : (
					<CardContent className="flex justify-center">
						<Button asChild size="lg" variant="outline">
							<Link href="/" className="flex flex-col items-center gap-1">
								<span>{STAMP_MESSAGES.homeLink.ja}</span>
								<span
									aria-hidden="true"
									className="text-xs text-muted-foreground"
								>
									{STAMP_MESSAGES.homeLink.en}
								</span>
							</Link>
						</Button>
					</CardContent>
				)}
			</Card>
		</main>
	);
}
