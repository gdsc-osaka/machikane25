"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { QrCanvas } from "@/features/rewards/components/qr-canvas";
import { useStampProgress } from "@/features/stamps/hooks/useStampProgress";
import { getFirebaseAuth } from "@/lib/firebase/client";
import type { SupportedLocale } from "@/lib/i18n/messages";

const determineLocale = (): SupportedLocale => {
	if (typeof navigator === "undefined") {
		return "ja";
	}
	return navigator.language.startsWith("en") ? "en" : "ja";
};

const createPayload = (uid: string) => {
	const suffix = uid.slice(-6);
	const timestamp = Math.floor(Date.now() / 1000).toString(36);
	const raw = `${suffix}:${timestamp}`;
	return raw.length > 17 ? raw.slice(-17) : raw;
};

const copy = {
	ja: {
		heading: "景品引換ページ",
		waiting: "スタンプとアンケートを完了するとQRコードが表示されます。",
		login: "サインインが必要です。スタンプページから再読み込みしてください。",
		regenerate: "QRコードを更新",
		instructions: (remaining: number) =>
			`残り ${remaining} 箇所のスタンプとアンケートを完了してください。`,
		eligible: "スタッフにこのQRコードを提示してください。",
	},
	en: {
		heading: "Gift Redemption",
		waiting: "Complete all stamps and the survey to reveal your QR code.",
		login: "Please sign in again from the stamp page.",
		regenerate: "Refresh QR code",
		instructions: (remaining: number) =>
			`Finish the remaining ${remaining} stamps and survey to unlock your reward.`,
		eligible: "Show this QR code to a staff member to claim your prize.",
	},
};

export default function GiftPage() {
	const { data, isLoading } = useStampProgress();
	const [locale, setLocale] = useState<SupportedLocale>("ja");
	const [uid, setUid] = useState<string | null>(null);
	const [payload, setPayload] = useState<string | null>(null);

	useEffect(() => {
		setLocale(determineLocale());
	}, []);

	useEffect(() => {
		const auth = getFirebaseAuth();
		const unsubscribe = auth.onAuthStateChanged((user) => {
			if (!user) {
				setUid(null);
				setPayload(null);
				return;
			}
			setUid(user.uid);
			setPayload(createPayload(user.uid));
		});
		return () => unsubscribe();
	}, []);

	const text = copy[locale];
	const remaining = data?.remaining ?? 0;
	const eligible = Boolean(data?.rewardEligible);

	let body: ReactNode;
	if (!uid) {
		body = <p className="text-muted-foreground text-sm">{text.login}</p>;
	} else if (!eligible) {
		body = isLoading ? (
			<p className="text-muted-foreground text-sm">Loading progress…</p>
		) : (
			<p className="text-muted-foreground text-sm">
				{text.instructions(remaining)}
			</p>
		);
	} else if (!payload) {
		body = (
			<p className="text-destructive text-sm">
				{locale === "ja"
					? "QRコードの生成に失敗しました。ページを再読込してください。"
					: "Failed to generate the QR code. Please reload the page."}
			</p>
		);
	} else {
		body = (
			<div className="flex flex-col items-center gap-6">
				<QrCanvas
					payload={payload}
					className="rounded-lg border bg-white p-2 shadow-sm"
				/>
				<p className="text-center text-sm text-muted-foreground">
					{text.eligible}
				</p>
				<Button
					variant="outline"
					onClick={() => setPayload(createPayload(uid))}
				>
					{text.regenerate}
				</Button>
			</div>
		);
	}

	return (
		<main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-6 py-10">
			<header className="flex flex-col gap-2">
				<h1 className="text-3xl font-semibold tracking-tight">
					{text.heading}
				</h1>
				<p className="text-muted-foreground text-base">{text.waiting}</p>
			</header>
			{body}
		</main>
	);
}
