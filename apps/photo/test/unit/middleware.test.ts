import { describe, expect, it, vi } from "vitest";

const {
	verifyAdminTokenMock,
	getAdminCookieNameMock,
	redirectMock,
	nextMock,
} = vi.hoisted(() => {
	const redirectMock = vi.fn();
	const nextMock = vi.fn();
	return {
		verifyAdminTokenMock: vi.fn(),
		getAdminCookieNameMock: vi.fn(() => "adminToken"),
		redirectMock,
		nextMock,
	};
});

vi.mock("@/application/authService", () => ({
	verifyAdminToken: verifyAdminTokenMock,
	getAdminCookieName: getAdminCookieNameMock,
}));

vi.mock("next/server", () => ({
	NextResponse: {
		redirect: redirectMock.mockReturnValue("redirect"),
		next: nextMock.mockReturnValue("next"),
	},
}));

import { middleware } from "@/middleware";

const createRequest = (cookieValue?: string) => ({
	url: "https://example.com/admin",
	cookies: {
		get: (cookieName: string) =>
			cookieValue && cookieName === "adminToken"
				? { value: cookieValue }
				: undefined,
	},
});

describe("middleware", () => {
	it("redirects to login when admin cookie is missing", async () => {
		const request = createRequest();

		const response = await middleware(request as never);

		expect(redirectMock).toHaveBeenCalledWith(
			new URL("/login", "https://example.com/admin"),
		);
		expect(response).toBe("redirect");
	});

	it("redirects to login when admin token verification fails", async () => {
		verifyAdminTokenMock.mockResolvedValue(false);

		const response = await middleware(createRequest("token-123") as never);

		expect(verifyAdminTokenMock).toHaveBeenCalledWith("token-123");
		expect(response).toBe("redirect");
	});

	it("continues request pipeline when token is valid", async () => {
		verifyAdminTokenMock.mockResolvedValue(true);

		const response = await middleware(createRequest("token-123") as never);

		expect(response).toBe("next");
		expect(nextMock).toHaveBeenCalledOnce();
	});
});
