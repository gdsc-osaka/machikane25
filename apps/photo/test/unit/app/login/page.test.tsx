/**
 * T502 [P] [US3] RTL Spec (Login Page)
 *
 * Validates that the login page renders token input, invokes server action,
 * signs in with Firebase custom token, and displays error feedback.
 *
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const pushMock = vi.fn();
const signInWithCustomTokenMock = vi.fn();
const loginWithAdminTokenActionMock = vi.fn();

vi.mock("next/navigation", () => ({
	useRouter: () => ({
		push: pushMock,
	}),
}));

vi.mock("firebase/auth", () => ({
	getAuth: () => ({ appName: "photo-app" }),
	signInWithCustomToken: signInWithCustomTokenMock,
}));

vi.mock("@/app/actions/authActions", () => ({
	loginWithAdminTokenAction: loginWithAdminTokenActionMock,
}));

const loadLoginPage = async () =>
	(await import("@/app/(booth)/login/page")).default;

const fillTokenAndSubmit = (token: string) => {
	const tokenInput = screen.getByLabelText(/admin token/i);
	fireEvent.change(tokenInput, { target: { value: token } });
	const submitButton = screen.getByRole("button", { name: /log in/i });
	fireEvent.click(submitButton);
};

describe("LoginPage", () => {
	beforeEach(() => {
		pushMock.mockReset();
		signInWithCustomTokenMock.mockReset();
		loginWithAdminTokenActionMock.mockReset();
		loginWithAdminTokenActionMock.mockResolvedValue({
			customToken: "mock-custom-token",
		});
		signInWithCustomTokenMock.mockResolvedValue({ user: { uid: "admin" } });
		document.cookie = "";
	});

	it("renders admin token field and submit button", async () => {
		const LoginPage = await loadLoginPage();
		render(<LoginPage />);

		expect(screen.getByLabelText(/admin token/i)).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /log in/i })).toBeInTheDocument();
	});

	it("submits token, signs in with custom token, and navigates to /admin", async () => {
		const LoginPage = await loadLoginPage();
		render(<LoginPage />);

		fillTokenAndSubmit("festival-admin-token");

		await waitFor(() => {
			expect(loginWithAdminTokenActionMock).toHaveBeenCalledWith({
				token: "festival-admin-token",
			});
		});

		await waitFor(() => {
			expect(signInWithCustomTokenMock).toHaveBeenCalledWith(
				expect.anything(),
				"mock-custom-token",
			);
		});

		expect(pushMock).toHaveBeenCalledWith("/admin");
	});

	it("shows error message when loginWithAdminTokenAction rejects", async () => {
		loginWithAdminTokenActionMock.mockRejectedValue(
			new Error("Invalid admin token"),
		);

		const LoginPage = await loadLoginPage();
		render(<LoginPage />);

		fillTokenAndSubmit("incorrect-token");

		await waitFor(() => {
			expect(
				screen.getByText(/failed to authenticate admin token/i),
			).toBeInTheDocument();
		});

		expect(signInWithCustomTokenMock).not.toHaveBeenCalled();
		expect(pushMock).not.toHaveBeenCalled();
	});
});
