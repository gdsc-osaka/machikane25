/**
 * T501 [P] [US3] Integration Test (Auth Flow)
 *
 * Verifies server action loginWithAdminTokenAction and middleware token guard.
 * Ensures correct custom token issuance on valid admin token and redirect on invalid token.
 *
 * @vitest-environment node
 */

import { createHash } from "node:crypto";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ADMIN_TOKEN = "festival-admin-token";
const ADMIN_SALT = "festival-salt";

const createCustomTokenMock = vi.fn();
const setCookieMock = vi.fn();

const originalEnv = {
	hash: process.env.ADMIN_TOKEN_HASH,
	salt: process.env.ADMIN_TOKEN_SALT,
};

const computeHash = (token: string, salt: string): string =>
	createHash("sha256").update(`${token}${salt}`).digest("hex");

const restoreEnv = () => {
	if (typeof originalEnv.hash === "string") {
		process.env.ADMIN_TOKEN_HASH = originalEnv.hash;
	} else {
		delete process.env.ADMIN_TOKEN_HASH;
	}

	if (typeof originalEnv.salt === "string") {
		process.env.ADMIN_TOKEN_SALT = originalEnv.salt;
	} else {
		delete process.env.ADMIN_TOKEN_SALT;
	}
};

vi.mock("next/headers", () => ({
	cookies: () => ({
		set: setCookieMock,
	}),
}));

describe("Admin Auth Flow", () => {
	beforeEach(() => {
		process.env.ADMIN_TOKEN_SALT = ADMIN_SALT;
		process.env.ADMIN_TOKEN_HASH = computeHash(ADMIN_TOKEN, ADMIN_SALT);

		createCustomTokenMock.mockReset();
		createCustomTokenMock.mockResolvedValue("mock-custom-token");
		setCookieMock.mockReset();

		vi.resetModules();
		vi.doMock("@/lib/firebase/admin", () => ({
			getAdminAuth: () => ({
				createCustomToken: createCustomTokenMock,
			}),
		}));
	});

	afterEach(() => {
		restoreEnv();
		vi.doUnmock("@/lib/firebase/admin");
	});

	it("returns Firebase custom token when admin token is valid", async () => {
		const { loginWithAdminTokenAction } = await import(
			"@/app/actions/authActions"
		);

		const result = await loginWithAdminTokenAction({ token: ADMIN_TOKEN });

		expect(result).toEqual({
			customToken: "mock-custom-token",
		});
		expect(createCustomTokenMock).toHaveBeenCalledWith(
			expect.stringContaining("admin"),
			expect.objectContaining({ role: "admin" }),
		);
		expect(setCookieMock).toHaveBeenCalledWith(
			expect.objectContaining({
				name: "adminToken",
				value: ADMIN_TOKEN,
				httpOnly: true,
			}),
		);
	});

	it("throws AuthError when admin token is invalid", async () => {
		const { loginWithAdminTokenAction } = await import(
			"@/app/actions/authActions"
		);

		await expect(
			loginWithAdminTokenAction({ token: "invalid-token" }),
		).rejects.toThrow("Invalid admin token provided");
		expect(createCustomTokenMock).not.toHaveBeenCalled();
	});

	it("allows protected route access when middleware receives valid cookie", async () => {
		const { middleware } = await import("@/middleware");

		const request = new NextRequest("https://photo.local/admin", {
			headers: new Headers({
				cookie: `adminToken=${ADMIN_TOKEN}`,
			}),
		});

		const response = await middleware(request);

		expect(response.status).toBe(200);
		expect(response.headers.get("location")).toBeNull();
	});

	it("redirects to /login when middleware receives missing or invalid cookie", async () => {
		const { middleware } = await import("@/middleware");

		const invalidRequest = new NextRequest("https://photo.local/admin", {
			headers: new Headers({
				cookie: "adminToken=invalid-token",
			}),
		});

		const redirectResponse = await middleware(invalidRequest);

		expect(redirectResponse.status).toBe(307);
		expect(redirectResponse.headers.get("location")).toBe(
			"https://photo.local/login",
		);

		const missingCookieRequest = new NextRequest(
			"https://photo.local/photos",
		);
		const missingCookieResponse = await middleware(missingCookieRequest);

		expect(missingCookieResponse.status).toBe(307);
		expect(missingCookieResponse.headers.get("location")).toBe(
			"https://photo.local/login",
		);
	});
});
