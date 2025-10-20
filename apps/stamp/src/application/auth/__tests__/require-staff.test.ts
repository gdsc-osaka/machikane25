"use client";

import { beforeEach, describe, expect, it, vi } from "vitest";
import { requireStaff } from "../require-staff";

const getFirebaseAuthMock = vi.hoisted(() => vi.fn());
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
	getIdTokenResultMock.mockReset();
	signOutMock.mockReset();
});

describe("requireStaff", () => {
	it("requests authentication when no user is signed in", async () => {
		getFirebaseAuthMock.mockReturnValue({
			currentUser: null,
		});

		const result = await requireStaff();

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
		getFirebaseAuthMock.mockReturnValue({
			currentUser: user,
		});
		getIdTokenResultMock.mockResolvedValue({
			claims: { isStaff: false },
		});

		const result = await requireStaff();

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
		getFirebaseAuthMock.mockReturnValue({
			currentUser: user,
		});
		getIdTokenResultMock.mockResolvedValue({
			claims: { isStaff: true },
		});

		const result = await requireStaff();

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
