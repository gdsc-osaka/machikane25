import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useAnonymousAttendeeId } from "../use-anonymous-attendee-id";

const signInAnonymouslyMock = vi.hoisted(() => vi.fn());
const getFirebaseAuthMock = vi.hoisted(() => vi.fn());
const errorLoggerMock = vi.hoisted(() => vi.fn());

vi.mock("firebase/auth", () => ({
	signInAnonymously: signInAnonymouslyMock,
}));

vi.mock("@/firebase", () => ({
	getFirebaseAuth: getFirebaseAuthMock,
}));

vi.mock("@/packages/logger", () => ({
	getLogger: () => ({
		error: errorLoggerMock,
	}),
}));

beforeEach(() => {
	signInAnonymouslyMock.mockReset();
	getFirebaseAuthMock.mockReset();
	errorLoggerMock.mockReset();
});

describe("useAnonymousAttendeeId", () => {
	it("returns existing attendee id without triggering sign-in", async () => {
		getFirebaseAuthMock.mockReturnValue({
			currentUser: { uid: "existing-user" },
		});

		const { result } = renderHook(() => useAnonymousAttendeeId());

		await waitFor(() => {
			expect(result.current.isLoading).toBe(false);
		});
		expect(result.current.attendeeId).toBe("existing-user");
		expect(signInAnonymouslyMock).not.toHaveBeenCalled();
	});

	it("signs in anonymously when no current user", async () => {
		getFirebaseAuthMock.mockReturnValue({
			currentUser: null,
		});
		signInAnonymouslyMock.mockResolvedValue({
			user: { uid: "generated-user" },
		});

		const { result } = renderHook(() => useAnonymousAttendeeId());

		await waitFor(() => {
			expect(result.current.isLoading).toBe(false);
		});
		expect(result.current.attendeeId).toBe("generated-user");
		expect(signInAnonymouslyMock).toHaveBeenCalledTimes(1);
	});

	it("logs error and clears loading state when sign-in fails", async () => {
		getFirebaseAuthMock.mockReturnValue({
			currentUser: null,
		});
		signInAnonymouslyMock.mockRejectedValue(new Error("sign-in failed"));

		const { result } = renderHook(() => useAnonymousAttendeeId());

		await waitFor(() => {
			expect(result.current.isLoading).toBe(false);
		});

		expect(result.current.attendeeId).toBeNull();
		expect(errorLoggerMock).toHaveBeenCalledTimes(1);
	});
});
