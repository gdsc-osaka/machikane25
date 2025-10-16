import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { translate } from "@/lib/i18n/messages";
import type { StampProgress } from "../../hooks/useStampProgress";
import { ProgressPanel } from "../progress-panel";

const buildProgress = (
	overrides: Partial<StampProgress> = {},
): StampProgress => ({
	stamps: [],
	remaining: 0,
	surveyCompleted: false,
	rewardEligible: false,
	...overrides,
});

describe("ProgressPanel", () => {
	it("shows translated heading and a skeleton when loading", () => {
		const { container } = render(
			<ProgressPanel locale="ja" isLoading progress={null} />,
		);

		expect(
			screen.getByRole("heading", {
				level: 1,
				name: translate("progressHeading", "ja"),
			}),
		).toBeInTheDocument();
		expect(
			screen.getByText(translate("collectAllCta", "ja")),
		).toBeInTheDocument();
		expect(container.querySelector(".animate-pulse")).not.toBeNull();
	});

	it("renders stamps with locale-specific labels and status text", () => {
		const progress = buildProgress({
			stamps: [
				{
					id: "reception",
					label: "受付",
					labelJa: "受付",
					labelEn: "Reception",
					completed: true,
				},
				{
					id: "photobooth",
					label: "フォトブース",
					labelJa: "フォトブース",
					labelEn: "Photobooth",
					completed: false,
				},
			],
			remaining: 1,
		});

		render(<ProgressPanel locale="en" isLoading={false} progress={progress} />);

		expect(screen.getByText("Reception")).toBeInTheDocument();
		expect(screen.getByText("Photobooth")).toBeInTheDocument();
		expect(screen.getByText("Collected")).toBeInTheDocument();
		expect(screen.getByText("Not yet")).toBeInTheDocument();
		expect(screen.getByText("1 stops remaining")).toBeInTheDocument();
	});

	it("displays maintenance messages from the config or falls back to defaults", () => {
		const withMessage = buildProgress({
			maintenance: {
				status: "degraded",
				messageEn: "Custom maintenance message",
			},
		});
		const { unmount } = render(
			<ProgressPanel locale="en" isLoading={false} progress={withMessage} />,
		);
		expect(screen.getByText("Custom maintenance message")).toBeInTheDocument();
		unmount();

		const fallbackProgress = buildProgress({
			maintenance: {
				status: "maintenance",
			},
		});
		render(
			<ProgressPanel
				locale="ja"
				isLoading={false}
				progress={fallbackProgress}
			/>,
		);
		expect(
			screen.getByText(translate("maintenanceBanner", "ja")),
		).toBeInTheDocument();
	});

	it("invokes callbacks tied to survey and reward actions", () => {
		const onSurvey = vi.fn();
		const onReward = vi.fn();

		const surveyProgress = buildProgress({
			surveyCompleted: false,
			rewardEligible: false,
		});
		const { unmount } = render(
			<ProgressPanel
				locale="en"
				isLoading={false}
				progress={surveyProgress}
				onSurvey={onSurvey}
				onReward={onReward}
			/>,
		);

		fireEvent.click(
			screen.getByRole("button", { name: translate("surveyCta", "en") }),
		);
		expect(onSurvey).toHaveBeenCalled();
		expect(onReward).not.toHaveBeenCalled();
		unmount();

		const rewardProgress = buildProgress({
			rewardEligible: true,
			surveyCompleted: true,
		});
		render(
			<ProgressPanel
				locale="en"
				isLoading={false}
				progress={rewardProgress}
				onSurvey={onSurvey}
				onReward={onReward}
			/>,
		);

		fireEvent.click(
			screen.getByRole("button", { name: translate("rewardCta", "en") }),
		);
		expect(onReward).toHaveBeenCalled();
	});
});
