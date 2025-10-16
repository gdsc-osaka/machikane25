"use client";

import { useEffect, useMemo, useState } from "react";
import { ProgressPanel } from "@/features/stamps/components/progress-panel";
import { useStampProgress } from "@/features/stamps/hooks/useStampProgress";
import type { SupportedLocale } from "@/lib/i18n/messages";

const determineLocale = (): SupportedLocale => {
	if (typeof navigator === "undefined") {
		return "ja";
	}
	return navigator.language.startsWith("en") ? "en" : "ja";
};

export default function Home() {
	const { data, isLoading } = useStampProgress();
	const [locale, setLocale] = useState<SupportedLocale>("ja");

	useEffect(() => {
		setLocale(determineLocale());
	}, []);

	const progressWithLabels = useMemo(() => {
		if (!data) {
			return null;
		}
		return {
			...data,
			stamps: data.stamps.map((stamp) => ({
				...stamp,
				labelJa: stamp.labelJa ?? stamp.label,
				labelEn: stamp.labelEn ?? stamp.label,
			})),
		};
	}, [data]);

	return (
		<main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-6 py-10">
			<ProgressPanel
				locale={locale}
				isLoading={isLoading}
				progress={progressWithLabels}
			/>
		</main>
	);
}
