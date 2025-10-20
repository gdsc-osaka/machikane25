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
import { giftPageCopy } from "@/libs/i18n/gift-copy";
import type { LocaleField } from "@/libs/i18n/messages";

type GiftRewardKey = ["gift-reward", string];

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
							{giftPageCopy.identityError.heading.ja}
						</h1>
						<CardDescription>
							{giftPageCopy.identityError.heading.en}
						</CardDescription>
					</CardHeader>
					<CardContent className="flex flex-col items-center gap-3 text-center text-sm">
						<p>{giftPageCopy.identityError.message.ja}</p>
						<p className="text-muted-foreground text-xs">
							{giftPageCopy.identityError.message.en}
						</p>
						<Button asChild variant="outline" className="mt-4">
							<Link href="/">{giftPageCopy.homeButton.ja}</Link>
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
					{giftPageCopy.pageHeading.ja}
				</h1>
				<p className="text-muted-foreground text-sm">
					{giftPageCopy.pageHeading.en}
				</p>
			</header>

			<Card className="border-primary/20 shadow-md">
				<CardContent className="flex flex-col items-center gap-8 py-10">
					{error ? (
						<div className="flex flex-col items-center gap-2 text-center">
							<p className="font-medium text-destructive">
								{giftPageCopy.error.ja}
							</p>
							<p className="text-muted-foreground text-xs">
								{giftPageCopy.error.en}
							</p>
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
							<RewardHeader
								copy={giftPageCopy.rewardStates.redeemable.heading}
							/>
							<RewardQrDisplay payload={reward.qrPayload ?? ""} />
							<RewardBody copy={giftPageCopy.rewardStates.redeemable.body} />
						</>
					) : reward.status === "redeemed" ? (
						<>
							<RewardHeader copy={giftPageCopy.rewardStates.redeemed.heading} />
							<RewardBody copy={giftPageCopy.rewardStates.redeemed.body} />
						</>
					) : (
						<>
							<RewardHeader
								copy={giftPageCopy.rewardStates.unavailable.heading}
							/>
							<RewardBody copy={giftPageCopy.rewardStates.unavailable.body} />
						</>
					)}

					<Button asChild variant="outline" className="mt-4">
						<Link href="/">
							<span>{giftPageCopy.homeButton.ja}</span>
							<span className="ml-2 text-xs text-muted-foreground">
								{giftPageCopy.homeButton.en}
							</span>
						</Link>
					</Button>
				</CardContent>
			</Card>
		</main>
	);
};

export default GiftPage;
