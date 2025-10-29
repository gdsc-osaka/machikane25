/**
 * Edge Runtime compatible authentication utilities for middleware
 * Uses Web Crypto API instead of Node.js crypto module
 */

const ADMIN_COOKIE_NAME = "adminToken";

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

export const getAdminCookieName = (): string => ADMIN_COOKIE_NAME;

/**
 * Edge Runtime compatible token verification using Web Crypto API
 */
export const verifyAdminTokenEdge = async (token: string): Promise<boolean> => {
	const trimmed = token.trim();
	if (!trimmed) {
		return false;
	}

	const { salt, hash } = ensureAdminEnv();

	const encoder = new TextEncoder();
	const data = encoder.encode(`${trimmed}${salt}`);
	const hashBuffer = await crypto.subtle.digest("SHA-256", data);
	const candidateHash = Array.from(new Uint8Array(hashBuffer))
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");

	return candidateHash === hash;
};
