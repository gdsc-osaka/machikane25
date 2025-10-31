import { beforeEach, describe, expect, it, vi } from "vitest";

const {
	assertValidAdminTokenMock,
	createCustomTokenMock,
	getAdminCookieNameMock,
	cookieSetMock,
	cookiesMock,
} = vi.hoisted(() => {
	const cookieSetMock = vi.fn();
	return {
		assertValidAdminTokenMock: vi.fn(),
		createCustomTokenMock: vi.fn(),
		getAdminCookieNameMock: vi.fn(() => "adminToken"),
		cookieSetMock,
		cookiesMock: vi.fn(async () => ({
			set: cookieSetMock,
		})),
	};
});

vi.mock("@/application/authService", () => ({
	assertValidAdminToken: assertValidAdminTokenMock,
	createCustomToken: createCustomTokenMock,
	getAdminCookieName: getAdminCookieNameMock,
}));

vi.mock("next/headers", () => ({
	cookies: cookiesMock,
}));

import { loginWithAdminTokenAction } from "@/app/actions/authActions";

describe("auth actions", () => {
	beforeEach(() => {
		assertValidAdminTokenMock.mockReset();
		createCustomTokenMock.mockReset();
		getAdminCookieNameMock.mockClear();
		cookieSetMock.mockReset();
		cookiesMock.mockClear();
	});

	it("validates token, creates custom token, and sets admin cookie", async () => {
		createCustomTokenMock.mockResolvedValue("custom-token-123");

		const result = await loginWithAdminTokenAction({
			token: " festival-admin ",
		});

		expect(assertValidAdminTokenMock).toHaveBeenCalledWith(" festival-admin ");
		expect(createCustomTokenMock).toHaveBeenCalledOnce();
		expect(cookiesMock).toHaveBeenCalledOnce();
		expect(cookieSetMock).toHaveBeenCalledWith({
			name: "adminToken",
			value: " festival-admin ",
			httpOnly: true,
			secure: true,
			sameSite: "strict",
			path: "/",
			maxAge: 60 * 60 * 12,
		});
		expect(result).toEqual({ customToken: "custom-token-123" });
	});

	it("rejects when token is missing", async () => {
		await expect(
			loginWithAdminTokenAction({ token: "" }),
		).rejects.toThrowError();
	});

	it("propagates validation errors", async () => {
		assertValidAdminTokenMock.mockRejectedValue(new Error("invalid token"));

		await expect(
			loginWithAdminTokenAction({ token: "invalid" }),
		).rejects.toThrowError("invalid token");
	});
});
