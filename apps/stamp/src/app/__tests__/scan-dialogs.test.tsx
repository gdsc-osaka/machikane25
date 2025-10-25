import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
	RedemptionDialog,
	type RedemptionDialogState,
} from "../scan/components/redemption-dialog";

const createRedeemableState = (
	overrides: Partial<
		Extract<RedemptionDialogState, { status: "redeemable" }>
	> = {},
): Extract<RedemptionDialogState, { status: "redeemable" }> => ({
	status: "redeemable",
	attendeeId: "attendee-001",
	...overrides,
});

const createDuplicateState = (
	overrides: Partial<
		Extract<RedemptionDialogState, { status: "duplicate" }>
	> = {},
): Extract<RedemptionDialogState, { status: "duplicate" }> => ({
	status: "duplicate",
	attendeeId: "attendee-001",
	redeemedAt: "2025-11-01T09:00:00.000Z",
	...overrides,
});

const createInvalidState = (
	overrides: Partial<
		Extract<RedemptionDialogState, { status: "invalid" }>
	> = {},
): Extract<RedemptionDialogState, { status: "invalid" }> => ({
	status: "invalid",
	error: "format",
	...overrides,
});

describe("RedemptionDialog", () => {
	const renderDialog = (state: RedemptionDialogState) =>
		render(<RedemptionDialog state={state} />);

	it("renders bilingual success messaging for a redeemable scan result", () => {
		const state = createRedeemableState({ attendeeId: "attendee-sakura" });

		renderDialog(state);

		expect(screen.getByTestId("scan-dialog")).toHaveAttribute(
			"data-scan-status",
			"redeemable",
		);
		expect(
			screen.getByRole("heading", { name: "景品を渡してください" }),
		).toBeInTheDocument();
		expect(
			screen.getByText("Hand the reward to attendee-sakura."),
		).toBeInTheDocument();
		expect(
			screen.getByText("attendee-sakura に景品を渡してください。"),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", {
				name: "Mark reward as handed off / 景品の受け渡しを完了する",
			}),
		).toBeInTheDocument();
	});

	it("instructs staff to decline duplicate redemptions with bilingual copy", () => {
		const state = createDuplicateState({
			attendeeId: "attendee-momiji",
			redeemedAt: "2025-11-02T03:15:00.000Z",
		});

		renderDialog(state);

		expect(screen.getByTestId("scan-dialog")).toHaveAttribute(
			"data-scan-status",
			"duplicate",
		);
		expect(
			screen.getByRole("heading", { name: "受け渡し済みの景品です" }),
		).toBeInTheDocument();
		expect(
			screen.getByText("attendee-momiji は既に景品を受け取っています。"),
		).toBeInTheDocument();
		expect(
			screen.getByText("attendee-momiji has already collected this reward."),
		).toBeInTheDocument();
		expect(
			screen.getByText("スタッフリーダーに連絡して状況を共有してください。"),
		).toBeInTheDocument();
	});

	it("guides staff to retry or use manual entry when a scan is invalid", () => {
		const state = createInvalidState();

		renderDialog(state);

		expect(screen.getByTestId("scan-dialog")).toHaveAttribute(
			"data-scan-status",
			"invalid",
		);
		expect(
			screen.getByRole("heading", { name: "不正な QR コードです" }),
		).toBeInTheDocument();
		expect(
			screen.getByText("Invalid QR code. Rescan or enter the ID manually."),
		).toBeInTheDocument();
		expect(
			screen.getByText("再度読み取るか、手動入力で確認してください。"),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "手動入力に切り替える" }),
		).toBeInTheDocument();
	});
});
