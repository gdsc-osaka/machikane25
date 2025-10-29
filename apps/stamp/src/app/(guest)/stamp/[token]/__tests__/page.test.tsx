import { act, render, screen } from "@testing-library/react";
import { errAsync, okAsync } from "neverthrow";
import { SWRConfig } from "swr";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ClaimStampAsyncResult } from "@/application/stamps/claim-stamp";
import {
	DuplicateStampError,
	InvalidStampTokenError,
	type StampProgress,
	StampRepositoryError,
} from "@/domain/stamp";

const { claimStampWithTokenMock } = vi.hoisted(() => {
	const mock = vi.fn<(arg: string) => ClaimStampAsyncResult>();
	return { claimStampWithTokenMock: mock };
});

vi.mock("@/application/stamps/claim-stamp.client", () => ({
	claimStampWithToken: claimStampWithTokenMock,
}));

const importPage = async () => {
	const module = await import("../page");
	return module.default;
};

const renderWithSWR = async (
	token: string,
): Promise<ReturnType<typeof render>> => {
	const Page = await importPage();
	let result;
	await act(async () => {
		result = render(
			<SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
				<Page params={Promise.resolve({ token })} />
			</SWRConfig>,
		);
	});
	return result!;
};

describe("StampTokenPage", () => {
	beforeEach(() => {
		claimStampWithTokenMock.mockReset();
	});

	it("renders success messaging when a stamp is claimed", async () => {
		const progress = {
			collected: ["reception", "photobooth"],
			remaining: ["art", "robot", "survey"],
			lastCollectedAt: 1_700_000_001_000,
			isComplete: false,
		} satisfies StampProgress;
		claimStampWithTokenMock.mockReturnValueOnce(
			okAsync({
				checkpoint: "reception",
				progress,
			}),
		);

		await renderWithSWR("token-reception");

		expect(
			await screen.findByRole("heading", {
				name: "スタンプを獲得しました！",
			}),
		).toBeInTheDocument();
		expect(claimStampWithTokenMock).toHaveBeenCalledWith("token-reception");
		expect(screen.getByText("Stamp Collected!")).toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: "スタンプ一覧を見る" }),
		).toHaveAttribute("href", "/");

		const statusCard = screen.getByTestId("claim-status");
		expect(statusCard).toHaveAttribute("data-state", "success");
	});

	it("renders duplicate messaging when the stamp was already collected", async () => {
		const duplicateError = DuplicateStampError(
			"This stamp is already collected.",
			{ extra: { checkpoint: "photobooth" } },
		);
		claimStampWithTokenMock.mockReturnValueOnce(errAsync(duplicateError));

		await renderWithSWR("token-photobooth");

		expect(
			await screen.findByRole("heading", {
				name: "このスタンプは既に獲得済みです",
			}),
		).toBeInTheDocument();
		expect(claimStampWithTokenMock).toHaveBeenCalledWith("token-photobooth");
		expect(screen.getByText("Stamp Already Collected")).toBeInTheDocument();

		const statusCard = screen.getByTestId("claim-status");
		expect(statusCard).toHaveAttribute("data-state", "duplicate");
	});

	it("renders invalid token messaging when the NFC token is unknown", async () => {
		const invalidError = InvalidStampTokenError(
			"Unknown stamp token provided.",
			{ extra: { token: "token-unknown" } },
		);
		claimStampWithTokenMock.mockReturnValueOnce(errAsync(invalidError));

		await renderWithSWR("token-unknown");

		expect(
			await screen.findByRole("heading", {
				name: "このスタンプは無効です",
			}),
		).toBeInTheDocument();
		expect(claimStampWithTokenMock).toHaveBeenCalledWith("token-unknown");
		expect(screen.getByText("Invalid Stamp Token")).toBeInTheDocument();

		const statusCard = screen.getByTestId("claim-status");
		expect(statusCard).toHaveAttribute("data-state", "invalid");
	});

	it("renders generic error messaging when claim service fails unexpectedly", async () => {
		const genericError = StampRepositoryError(
			"Failed to persist stamp ledger.",
			{ extra: { operation: "save" } },
		);
		claimStampWithTokenMock.mockReturnValueOnce(errAsync(genericError));

		await renderWithSWR("token-robot");

		expect(
			await screen.findByRole("heading", {
				name: "通信中に問題が発生しました。時間をおいて再度お試しください。",
			}),
		).toBeInTheDocument();
		expect(claimStampWithTokenMock).toHaveBeenCalledWith("token-robot");
		expect(
			screen.getByText("Something went wrong. Please try again in a moment."),
		).toBeInTheDocument();

		const statusCard = screen.getByTestId("claim-status");
		expect(statusCard).toHaveAttribute("data-state", "error");
	});
});
