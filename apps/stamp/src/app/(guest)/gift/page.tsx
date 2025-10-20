"use client";

import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { useMemo } from "react";
import useSWR from "swr";
import {
	issueSurveyReward,
	loadSurveyReward,
	type RewardSnapshot,
} from "@/application/survey/reward";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useAnonymousAttendeeId } from "@/hooks/use-anonymous-attendee-id";
import type { LocaleField } from "@/libs/i18n/messages";
import { getStampCopy } from "@/libs/i18n/stamp-copy";

type GiftRewardKey = ["gift-reward", string];

const GIFT_PAGE_HEADING: LocaleField = {
	ja: "景品受け取りページ",
	en: "Reward Claim Page",
};

const HOME_BUTTON_COPY: LocaleField = {
	ja: "ホームに戻る",
	en: "Back to Home",
};

const ERROR_COPY: LocaleField = {
	ja: "景品状態の取得に失敗しました。時間をおいて再度お試しください。",
	en: "We could not load your reward. Please try again shortly.",
};

const IDENTITY_ERROR_HEADING: LocaleField = {
	ja: "参加者情報を確認できませんでした",
	en: "Attendee identity unavailable",
};

const IDENTITY_ERROR_MESSAGE: LocaleField = {
	ja: "ホーム画面に戻ってから再度アクセスしてください。",
	en: "Return to the home page before trying again.",
};

const createLocaleField = (path: ReadonlyArray<string>): LocaleField => ({
	ja: getStampCopy("ja", path),
	en: getStampCopy("en", path),
});

const GIFT_COPY = {
	redeemable: {
		heading: createLocaleField(["gift", "redeemable", "heading"]),
		body: createLocaleField(["gift", "redeemable", "body"]),
	},
	redeemed: {
		heading: createLocaleField(["gift", "redeemed", "heading"]),
		body: createLocaleField(["gift", "redeemed", "body"]),
	},
	unavailable: {
		heading: createLocaleField(["gift", "unavailable", "heading"]),
		body: createLocaleField(["gift", "unavailable", "body"]),
	},
};

const fetchRewardSnapshot = async (
	key: GiftRewardKey,
): Promise<RewardSnapshot> => {
	const [, attendeeId] = key;
	const snapshot = await loadSurveyReward(attendeeId);
	if (snapshot.status === "pending") {
		return issueSurveyReward(attendeeId);
	}
	return snapshot;
};

const RewardHeader = ({ copy }: { copy: LocaleField }) => (
	<div className="flex flex-col items-center gap-1 text-center">
		<h2 className="text-xl font-semibold">{copy.ja}</h2>
		<p className="text-muted-foreground text-sm">{copy.en}</p>
	</div>
);

const RewardBody = ({ copy }: { copy: LocaleField }) => (
	<div className="flex flex-col items-center gap-2 text-center text-sm">
		<p>{copy.ja}</p>
		<p className="text-muted-foreground text-xs">{copy.en}</p>
	</div>
);

const RewardQrDisplay = ({ payload }: { payload: string }) => (
	<div className="flex flex-col items-center gap-4">
		<div className="rounded-xl border border-primary/30 bg-background p-4 shadow-inner">
			<QRCodeSVG
				value={payload}
				size={220}
				className="text-primary"
				role="img"
				aria-label="Reward QR code"
			/>
		</div>
		<code
			data-testid="reward-qr-payload"
			className="border-muted-foreground/30 text-muted-foreground inline-flex max-w-xs items-center justify-center break-all rounded-md border bg-muted/40 px-3 py-1 text-xs"
		>
			{payload}
		</code>
	</div>
);

const GiftPage = () => {
	const { attendeeId, isLoading } = useAnonymousAttendeeId();
	const rewardKey: GiftRewardKey | null = useMemo(
		() => (attendeeId === null ? null : ["gift-reward", attendeeId]),
		[attendeeId],
	);

	const {
		data: reward,
		error,
		isValidating,
	} = useSWR<RewardSnapshot, Error, GiftRewardKey | null>(
		rewardKey,
		fetchRewardSnapshot,
		{
			revalidateOnFocus: false,
		},
	);

	if (isLoading) {
		return (
			<main className="bg-background text-foreground mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-4 px-6 py-12">
				<Spinner className="size-6 text-primary" />
				<p className="text-sm text-muted-foreground">
					景品情報を読み込んでいます…
				</p>
			</main>
		);
	}

	if (attendeeId === null) {
		return (
			<main className="bg-background text-foreground mx-auto flex min-h-screen max-w-2xl flex-col items-center gap-8 px-6 py-12">
				<Card className="w-full border-destructive/40 bg-destructive/10 shadow-md">
					<CardHeader className="text-center">
						<h1 className="text-2xl font-semibold tracking-tight text-destructive">
							{IDENTITY_ERROR_HEADING.ja}
						</h1>
						<CardDescription>{IDENTITY_ERROR_HEADING.en}</CardDescription>
					</CardHeader>
					<CardContent className="flex flex-col items-center gap-3 text-center text-sm">
						<p>{IDENTITY_ERROR_MESSAGE.ja}</p>
						<p className="text-muted-foreground text-xs">
							{IDENTITY_ERROR_MESSAGE.en}
						</p>
						<Button asChild variant="outline" className="mt-4">
							<Link href="/">ホームに戻る</Link>
						</Button>
					</CardContent>
				</Card>
			</main>
		);
	}

	return (
		<main className="bg-background text-foreground mx-auto flex min-h-screen max-w-3xl flex-col gap-10 px-6 py-12">
			<header className="flex flex-col items-center gap-2 text-center">
				<h1 className="text-3xl font-semibold tracking-tight">
					{GIFT_PAGE_HEADING.ja}
				</h1>
				<p className="text-muted-foreground text-sm">{GIFT_PAGE_HEADING.en}</p>
			</header>

			<Card className="border-primary/20 shadow-md">
				<CardContent className="flex flex-col items-center gap-8 py-10">
					{error ? (
						<div className="flex flex-col items-center gap-2 text-center">
							<p className="font-medium text-destructive">{ERROR_COPY.ja}</p>
							<p className="text-muted-foreground text-xs">{ERROR_COPY.en}</p>
						</div>
					) : reward === undefined || isValidating ? (
						<div className="flex flex-col items-center gap-3">
							<Spinner className="size-6 text-primary" />
							<p className="text-muted-foreground text-sm">
								景品の状態を確認しています…
							</p>
						</div>
					) : reward.status === "issued" ? (
						<>
							<RewardHeader copy={GIFT_COPY.redeemable.heading} />
							<RewardQrDisplay payload={reward.qrPayload ?? ""} />
							<RewardBody copy={GIFT_COPY.redeemable.body} />
						</>
					) : reward.status === "redeemed" ? (
						<>
							<RewardHeader copy={GIFT_COPY.redeemed.heading} />
							<RewardBody copy={GIFT_COPY.redeemed.body} />
						</>
					) : (
						<>
							<RewardHeader copy={GIFT_COPY.unavailable.heading} />
							<RewardBody copy={GIFT_COPY.unavailable.body} />
						</>
					)}

					<Button asChild variant="outline" className="mt-4">
						<Link href="/">
							<span>{HOME_BUTTON_COPY.ja}</span>
							<span className="ml-2 text-xs text-muted-foreground">
								{HOME_BUTTON_COPY.en}
							</span>
						</Link>
					</Button>
				</CardContent>
			</Card>
		</main>
	);
};

export default GiftPage;
