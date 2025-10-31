"use client";

import { beforeEach, describe, expect, it, vi } from "vitest";
import { requireStaff } from "../require-staff";

let onAuthStateChangedCallback: ((user: any) => Promise<void>) | null = null;
const onAuthStateChangedMock = vi.hoisted(() =>
	vi.fn((callback) => {
		onAuthStateChangedCallback = callback;
		return vi.fn(); // unsubscribe function
	}),
);
const getFirebaseAuthMock = vi.hoisted(() =>
	vi.fn(() => ({
		onAuthStateChanged: onAuthStateChangedMock,
	})),
);
const getIdTokenResultMock = vi.hoisted(() => vi.fn());
const signOutMock = vi.hoisted(() => vi.fn());

vi.mock("@/firebase", () => ({
	getFirebaseAuth: getFirebaseAuthMock,
}));

vi.mock("firebase/auth", () => ({
	getIdTokenResult: getIdTokenResultMock,
	signOut: signOutMock,
}));

beforeEach(() => {
	getFirebaseAuthMock.mockReset();
	onAuthStateChangedMock.mockReset();
	getIdTokenResultMock.mockReset();
	signOutMock.mockReset();
	onAuthStateChangedCallback = null;
});

describe("requireStaff", () => {
	it("requests authentication when no user is signed in", async () => {
		const promise = requireStaff();
		await onAuthStateChangedCallback?.(null);
		const result = await promise;

		expect(result).toEqual({ status: "needs-auth" });
		expect(getIdTokenResultMock).not.toHaveBeenCalled();
		expect(signOutMock).not.toHaveBeenCalled();
	});

	it("signs out non-staff users and requests authentication", async () => {
		const user = {
			uid: "attendee-1",
			email: "guest@example.com",
			displayName: "Guest",
		};
		getIdTokenResultMock.mockResolvedValue({
			claims: { isStaff: false },
		});

		const promise = requireStaff();
		await onAuthStateChangedCallback?.(user);
		const result = await promise;

		expect(result).toEqual({ status: "needs-auth" });
		expect(getIdTokenResultMock).toHaveBeenCalledTimes(1);
		expect(getIdTokenResultMock).toHaveBeenCalledWith(user, true);
		expect(signOutMock).toHaveBeenCalledTimes(1);
	});

	it("returns staff access details when user has staff claim", async () => {
		const user = {
			uid: "staff-1",
			email: "staff@example.com",
			displayName: "Festival Staff",
		};
		getIdTokenResultMock.mockResolvedValue({
			claims: { isStaff: true },
		});

		const promise = requireStaff();
		await onAuthStateChangedCallback?.(user);
		const result = await promise;

		expect(result).toEqual({
			status: "authorized",
			staff: {
				uid: "staff-1",
				email: "staff@example.com",
				displayName: "Festival Staff",
			},
		});
		expect(signOutMock).not.toHaveBeenCalled();
	});
});
