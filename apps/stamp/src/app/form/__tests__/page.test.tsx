import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SurveyFormPage from "../page";

const pushMock = vi.fn();
const mockGetFirebaseAuth = vi.fn();
const mockSignInAnonymously = vi.fn();
const toastSuccess = vi.fn();
const toastError = vi.fn();

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: pushMock }),
}));

vi.mock("firebase/auth", () => ({
	signInAnonymously: (auth: unknown) => mockSignInAnonymously(auth),
}));

vi.mock("@/lib/firebase/client", () => ({
	getFirebaseAuth: () => mockGetFirebaseAuth(),
}));

vi.mock("sonner", () => ({
	toast: {
		success: (...args: unknown[]) => toastSuccess(...args),
		error: (...args: unknown[]) => toastError(...args),
	},
}));

describe("SurveyFormPage", () => {
	const originalFetch = globalThis.fetch;
	const originalLanguage = navigator.language;

	beforeEach(() => {
		pushMock.mockReset();
		mockSignInAnonymously.mockReset();
		toastSuccess.mockReset();
		toastError.mockReset();
		mockGetFirebaseAuth.mockReturnValue({
			currentUser: { uid: "attendee-123" },
		});
		globalThis.fetch = vi.fn().mockResolvedValue(
			new Response(JSON.stringify({ status: "success" }), {
				status: 200,
				headers: { "content-type": "application/json" },
			}),
		);
		Object.defineProperty(window.navigator, "language", {
			configurable: true,
			value: "en-US",
		});
	});

	afterEach(() => {
		globalThis.fetch = originalFetch;
		vi.restoreAllMocks();
		Object.defineProperty(window.navigator, "language", {
			configurable: true,
			value: originalLanguage,
		});
	});

	it("submits the survey with the current user UID", async () => {
		render(<SurveyFormPage />);

		const textArea = screen.getByPlaceholderText(/let us know/i);
		fireEvent.change(textArea, { target: { value: "Amazing event!" } });

		const submitButton = screen.getByRole("button", { name: /submit survey/i });
		fireEvent.click(submitButton);

		await waitFor(() => {
			expect(globalThis.fetch).toHaveBeenCalledWith(
				"/api/survey",
				expect.objectContaining({
					method: "POST",
					headers: expect.objectContaining({
						authorization: "Bearer attendee-123",
					}),
				}),
			);
		});
		expect(pushMock).toHaveBeenCalledWith("/gift");
		expect(toastSuccess).toHaveBeenCalled();
	});

	it("signs in anonymously when no user is present", async () => {
		mockGetFirebaseAuth.mockReturnValueOnce({
			currentUser: null,
		});
		mockSignInAnonymously.mockResolvedValue({
			user: { uid: "anon-789" },
		});

		render(<SurveyFormPage />);

		const submitButton = screen.getByRole("button", { name: /submit survey/i });
		fireEvent.click(submitButton);

		await waitFor(() => {
			expect(mockSignInAnonymously).toHaveBeenCalled();
		});
		expect(globalThis.fetch).toHaveBeenCalledWith(
			"/api/survey",
			expect.objectContaining({
				headers: expect.objectContaining({
					authorization: "Bearer anon-789",
				}),
			}),
		);
	});

	it("shows an error toast when submission fails", async () => {
		globalThis.fetch = vi
			.fn()
			.mockResolvedValue(new Response("Error", { status: 502 }));

		render(<SurveyFormPage />);
		const submitButton = screen.getByRole("button", { name: /submit survey/i });
		fireEvent.click(submitButton);

		await waitFor(() => {
			expect(toastError).toHaveBeenCalled();
		});
		expect(pushMock).not.toHaveBeenCalled();
	});
});
