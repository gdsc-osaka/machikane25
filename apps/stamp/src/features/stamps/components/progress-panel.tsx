"use client";

import type { StampProgress } from "@/features/stamps/hooks/useStampProgress";
import { type SupportedLocale, translate } from "@/lib/i18n/messages";

type ProgressPanelProps = {
	locale: SupportedLocale;
	isLoading: boolean;
	progress: StampProgress | null;
	onSurvey?: () => void;
	onReward?: () => void;
};

const remainingLabel = (locale: SupportedLocale, count: number) => {
	if (locale === "en") {
		return `${count} stops remaining`;
	}
	return `残り ${count} 箇所`;
};

const statusLabel = (locale: SupportedLocale, completed: boolean) => {
	if (completed) {
		return locale === "en" ? "Collected" : "獲得済み";
	}
	return locale === "en" ? "Not yet" : "未獲得";
};

export const ProgressPanel = ({
	locale,
	isLoading,
	progress,
	onSurvey,
	onReward,
}: ProgressPanelProps) => {
	const stamps = progress?.stamps ?? [];
	const remaining = progress?.remaining ?? 0;
	const surveyCompleted = progress?.surveyCompleted ?? false;
	const rewardEligible = progress?.rewardEligible ?? false;
	const maintenance = progress?.maintenance;

	const maintenanceMessage = (() => {
		if (!maintenance || maintenance.status === "online") {
			return null;
		}
		if (locale === "en") {
			return maintenance.messageEn ?? translate("maintenanceBanner", "en");
		}
		return maintenance.messageJa ?? translate("maintenanceBanner", "ja");
	})();

	return (
		<div className="flex flex-col gap-4">
			{maintenanceMessage ? (
				<div className="rounded-md border border-yellow-400 bg-yellow-100 px-4 py-3 text-sm text-yellow-900">
					{maintenanceMessage}
				</div>
			) : null}

			<header className="flex flex-col gap-2">
				<h1 className="text-3xl font-semibold">
					{translate("progressHeading", locale)}
				</h1>
				<p className="text-muted-foreground">
					{translate("collectAllCta", locale)}
				</p>
				{isLoading ? (
					<div className="h-4 w-32 animate-pulse rounded bg-muted" />
				) : (
					<p className="text-sm font-medium">
						{remainingLabel(locale, remaining)}
					</p>
				)}
			</header>

			<section className="grid gap-2">
				{stamps.map((stamp) => (
					<div
						key={stamp.id}
						className="flex items-center justify-between rounded-md border border-muted-foreground/20 px-4 py-3"
					>
						<span className="font-medium">
							{locale === "en"
								? (stamp.labelEn ?? stamp.label)
								: (stamp.labelJa ?? stamp.label)}
						</span>
						<span
							className={
								stamp.completed ? "text-green-600" : "text-muted-foreground"
							}
						>
							{statusLabel(locale, stamp.completed)}
						</span>
					</div>
				))}
			</section>

			<div className="mt-4 flex flex-wrap gap-3">
				{!rewardEligible && !surveyCompleted ? (
					<button
						type="button"
						className="rounded-md bg-primary px-4 py-2 text-primary-foreground shadow"
						onClick={onSurvey}
					>
						{translate("surveyCta", locale)}
					</button>
				) : null}

				{rewardEligible ? (
					<button
						type="button"
						className="rounded-md border border-primary px-4 py-2 text-primary shadow"
						onClick={onReward}
					>
						{translate("rewardCta", locale)}
					</button>
				) : null}
			</div>
		</div>
	);
};
