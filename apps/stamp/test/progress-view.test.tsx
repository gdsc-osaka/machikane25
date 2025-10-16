import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { ProgressPanel } from "@/features/stamps/components/progress-panel";

const baseProgress = {
	maintenance: { status: "online" as const },
};

describe("Home progress view", () => {
	beforeEach(() => {});

	it("renders progress summary and remaining count", () => {
		render(
			<ProgressPanel
				locale="ja"
				isLoading={false}
				progress={{
					...baseProgress,
					stamps: [
						{ id: "reception", label: "受付", completed: true },
						{ id: "photobooth", label: "フォトブース", completed: false },
					],
					remaining: 1,
					surveyCompleted: false,
					rewardEligible: false,
				}}
			/>,
		);

		expect(screen.getByText("スタンプの進捗")).toBeInTheDocument();
		expect(screen.getByText("受付")).toBeInTheDocument();
		expect(screen.getByText("フォトブース")).toBeInTheDocument();
		expect(screen.getByText("残り 1 箇所")).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "アンケートに回答する" }),
		).toBeInTheDocument();
	});

	it("prompts reward when attendee is eligible", () => {
		render(
			<ProgressPanel
				locale="ja"
				isLoading={false}
				progress={{
					...baseProgress,
					stamps: [
						{ id: "reception", label: "受付", completed: true },
						{ id: "photobooth", label: "フォトブース", completed: true },
					],
					remaining: 0,
					surveyCompleted: true,
					rewardEligible: true,
				}}
			/>,
		);

		expect(
			screen.getByRole("button", { name: "景品を受け取る" }),
		).toBeInTheDocument();
	});

	it("shows maintenance banner when disabled", () => {
		render(
			<ProgressPanel
				locale="ja"
				isLoading={false}
				progress={{
					stamps: [],
					remaining: 0,
					surveyCompleted: false,
					rewardEligible: false,
					maintenance: {
						status: "maintenance",
						messageJa: "メンテナンス中です",
						messageEn: "Maintenance in progress",
					},
				}}
			/>,
		);

		expect(screen.getByText("メンテナンス中です")).toBeInTheDocument();
	});
});
