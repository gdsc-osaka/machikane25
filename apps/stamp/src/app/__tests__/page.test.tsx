import { render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

const { useStampProgressMock, progressPanelMock } = vi.hoisted(() => {
	return {
		useStampProgressMock: vi.fn(),
		progressPanelMock: vi.fn(
			({
				locale,
				isLoading,
				progress,
			}: {
				locale: string;
				isLoading: boolean;
				progress: unknown;
			}) => (
				<div
					data-testid="progress-panel"
					data-locale={locale}
					data-loading={isLoading}
				>
					<pre data-testid="progress-data">
						{JSON.stringify(progress, null, 2)}
					</pre>
				</div>
			),
		),
	};
});

vi.mock("@/features/stamps/hooks/useStampProgress", () => ({
	useStampProgress: useStampProgressMock,
}));

vi.mock("@/features/stamps/components/progress-panel", () => ({
	ProgressPanel: progressPanelMock,
}));

beforeEach(() => {
	useStampProgressMock.mockReset();
	progressPanelMock.mockClear();
});

afterEach(() => {
	vi.resetModules();
});

test("renders loading state when progress data has not loaded", async () => {
	useStampProgressMock.mockReturnValue({
		data: null,
		isLoading: true,
		error: null,
		refresh: vi.fn(),
	});

	const { default: Home } = await import("../page");

	render(<Home />);

	await waitFor(() => {
		expect(progressPanelMock).toHaveBeenCalled();
	});

	const lastCall =
		progressPanelMock.mock.calls[progressPanelMock.mock.calls.length - 1];
	const lastCallArgs = lastCall?.[0];
	expect(lastCallArgs).toMatchObject({
		isLoading: true,
		progress: null,
	});
});

test("fills missing stamp labels before passing data to the progress panel", async () => {
	useStampProgressMock.mockReturnValue({
		data: {
			stamps: [
				{
					id: "north-gate",
					label: "North Gate",
					completed: true,
				},
			],
			remaining: 2,
			surveyCompleted: false,
			rewardEligible: false,
		},
		isLoading: false,
		error: null,
		refresh: vi.fn(),
	});

	const { default: Home } = await import("../page");

	render(<Home />);

	await waitFor(() => {
		expect(progressPanelMock).toHaveBeenCalled();
	});

	const lastCall =
		progressPanelMock.mock.calls[progressPanelMock.mock.calls.length - 1];
	const lastCallArgs = lastCall?.[0];
	expect(lastCallArgs.locale).toBe("en");

	const stampedProgress = lastCallArgs.progress;
	expect(stampedProgress).not.toBeNull();
	expect(stampedProgress.stamps[0]).toMatchObject({
		labelJa: "North Gate",
		labelEn: "North Gate",
	});
});
