import {
	afterEach,
	beforeEach,
	describe,
	expect,
	expectTypeOf,
	it,
	vi,
} from "vitest";

const { getAdminAuthMock, createCustomTokenMock } = vi.hoisted(() => ({
	getAdminAuthMock: vi.fn(),
	createCustomTokenMock: vi.fn(),
}));

vi.mock("@/lib/firebase/admin", () => ({
	getAdminAuth: getAdminAuthMock,
}));

import {
	assertValidAdminToken,
	createCustomToken,
	getAdminCookieName,
	verifyAdminToken,
} from "@/application/authService";

const computeHash = async (token: string, salt: string): Promise<string> => {
	const encoder = new TextEncoder();
	const data = encoder.encode(`${token}${salt}`);
	const hashBuffer = await crypto.subtle.digest("SHA-256", data);
	return Array.from(new Uint8Array(hashBuffer))
		.map((value) => value.toString(16).padStart(2, "0"))
		.join("");
};

describe("authService", () => {
	const originalEnv = { ...process.env };

	beforeEach(() => {
		process.env = { ...originalEnv };
		getAdminAuthMock.mockReset();
		createCustomTokenMock.mockReset();
	});

	afterEach(() => {
		process.env = { ...originalEnv };
	});

	it("returns admin cookie name", () => {
		expect(getAdminCookieName()).toBe("adminToken");
	});

	it("returns false when token is blank", async () => {
		expect(await verifyAdminToken("   ")).toBe(false);
	});

	it("verifies token using configured salt and hash", async () => {
		const salt = "test-salt";
		const token = "secret-token";
		const hash = await computeHash(token, salt);
		process.env.ADMIN_TOKEN_SALT = salt;
		process.env.ADMIN_TOKEN_HASH = hash;

		await expect(verifyAdminToken(token)).resolves.toBe(true);
		await expect(verifyAdminToken("wrong-token")).resolves.toBe(false);
	});

	it("throws when admin environment variables are missing", async () => {
		delete process.env.ADMIN_TOKEN_SALT;
		delete process.env.ADMIN_TOKEN_HASH;

		await expect(verifyAdminToken("token")).rejects.toThrowError(
			"Admin token environment variables are not configured",
		);
	});

	it("asserts valid admin token", async () => {
		const salt = "salt";
		const token = "token";
		const hash = await computeHash(token, salt);
		process.env.ADMIN_TOKEN_SALT = salt;
		process.env.ADMIN_TOKEN_HASH = hash;

		await expect(assertValidAdminToken(token)).resolves.toBeUndefined();
		await expect(assertValidAdminToken("invalid")).rejects.toMatchObject({
			name: "AuthError",
			message: "Invalid admin token provided",
		});
	});

	it("creates custom Firebase token for admin user", async () => {
		const authInstance = {
			createCustomToken: createCustomTokenMock.mockResolvedValue("custom"),
		};
		getAdminAuthMock.mockReturnValue(authInstance);

		const token = await createCustomToken();

		expect(getAdminAuthMock).toHaveBeenCalledOnce();
		expect(createCustomTokenMock).toHaveBeenCalledWith(
			"photobooth-admin",
			expect.objectContaining({ role: "admin" }),
		);
		expect(token).toBe("custom");
	});
});
