/**
 * Authentication utilities for admin token verification
 * Uses Web Crypto API for compatibility with both Node.js and Edge Runtime
 */

const ADMIN_COOKIE_NAME = "adminToken";
const ADMIN_USER_ID = "photobooth-admin";

type AdminEnv = {
	salt: string;
	hash: string;
};

const ensureAdminEnv = (): AdminEnv => {
	const salt = process.env.ADMIN_TOKEN_SALT ?? "";
	const hash = process.env.ADMIN_TOKEN_HASH ?? "";

	if (!salt || !hash) {
		throw new Error("Admin token environment variables are not configured");
	}

	return { salt, hash };
};

const createAuthError = (message: string): Error => {
	const error = new Error(message);
	error.name = "AuthError";
	return error;
};

/**
 * Hash token using Web Crypto API (compatible with both Node.js and Edge Runtime)
 */
const hashToken = async (token: string, salt: string): Promise<string> => {
	const encoder = new TextEncoder();
	const data = encoder.encode(`${token}${salt}`);
	const hashBuffer = await crypto.subtle.digest("SHA-256", data);
	return Array.from(new Uint8Array(hashBuffer))
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
};

export const getAdminCookieName = (): string => ADMIN_COOKIE_NAME;

/**
 * Verify admin token (compatible with both Node.js and Edge Runtime)
 */
export const verifyAdminToken = async (token: string): Promise<boolean> => {
	const trimmed = token.trim();
	if (!trimmed) {
		return false;
	}

	const { salt, hash } = ensureAdminEnv();
	const candidateHash = await hashToken(trimmed, salt);

	return candidateHash === hash;
};

export const assertValidAdminToken = async (token: string): Promise<void> => {
	const isValid = await verifyAdminToken(token);
	if (!isValid) {
		throw createAuthError("Invalid admin token provided");
	}
};

/**
 * Create custom Firebase token (Node.js runtime only)
 */
export const createCustomToken = async (): Promise<string> => {
	const { getAdminAuth } = await import("@/lib/firebase/admin");
	const auth = getAdminAuth();
	return auth.createCustomToken(ADMIN_USER_ID, {
		role: "admin",
		issuedAt: new Date().toISOString(),
	});
};
