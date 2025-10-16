"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { StampFeedback } from "@/features/stamps/components/stamp-feedback";
import type { AwardStampResult } from "@/features/stamps/server/award-stamp";
import { type SupportedLocale, translate } from "@/lib/i18n/messages";

type AwardState = "idle" | "loading" | "success" | "error";

const detectLocale = (): SupportedLocale => {
	if (typeof navigator === "undefined") {
		return "ja";
	}
	return navigator.language.startsWith("en") ? "en" : "ja";
};

export default function StampPage() {
	const searchParams = useSearchParams();
	const router = useRouter();
	const [locale, setLocale] = useState<SupportedLocale>("ja");
	const [state, setState] = useState<AwardState>("idle");
	const [result, setResult] = useState<AwardStampResult | null>(null);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	const token = searchParams.get("token");

	useEffect(() => {
		setLocale(detectLocale());
	}, []);

	useEffect(() => {
		const runAwardFlow = async () => {
			if (!token) {
				setState("error");
				setErrorMessage(translate("stampInvalid", locale));
				return;
			}
			setState("loading");
			setErrorMessage(null);
			try {
				const response = await fetch("/api/stamps/award", {
					method: "POST",
					headers: {
						"content-type": "application/json",
					},
					body: JSON.stringify({ token, locale }),
				});
				if (!response.ok) {
					throw new Error(`award failed: ${response.status}`);
				}
				const payload = (await response.json()) as AwardStampResult;
				setResult(payload);
				setState("success");
			} catch (error) {
				console.error(error);
				setErrorMessage(translate("stampInvalid", locale));
				setState("error");
			}
		};

		void runAwardFlow();
	}, [token, locale]);

	const feedback = useMemo(() => {
		if (state === "loading") {
			return (
				<StampFeedback
					variant="info"
					title={translate("stampProcessing", locale)}
					description={translate("collectAllCta", locale)}
				/>
			);
		}
		if (state === "error") {
			return (
				<StampFeedback
					variant="error"
					title={translate("stampInvalid", locale)}
					description={errorMessage}
				/>
			);
		}
		if (state === "success" && result) {
			const variant =
				result.status === "granted"
					? "success"
					: result.status === "duplicate"
						? "warning"
						: result.status === "maintenance"
							? "warning"
							: "error";
			return (
				<StampFeedback
					variant={variant}
					title={result.message}
					description={
						<div className="text-sm">
							<p>{translate("collectAllCta", locale)}</p>
							<p className="mt-2">
								{remainingCopy(locale, result.progress.remaining)}
							</p>
						</div>
					}
					actions={
						<button
							type="button"
							className="rounded-md bg-primary px-4 py-2 text-primary-foreground shadow"
							onClick={() => router.push("/")}
						>
							{locale === "en" ? "View stamp list" : "スタンプ一覧を見る"}
						</button>
					}
				/>
			);
		}
		return null;
	}, [state, result, errorMessage, locale, router]);

	return (
		<main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-6 px-6 py-10">
			{feedback}
			{state === "loading" ? (
				<div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
			) : null}
		</main>
	);
}

const remainingCopy = (locale: SupportedLocale, count: number) => {
	if (locale === "en") {
		return count > 0
			? `${count} stops remaining to finish the rally.`
			: "All stops complete!";
	}
	return count > 0
		? `クリアまで残り ${count} 箇所です。`
		: "全てのスタンプを獲得しました！";
};
