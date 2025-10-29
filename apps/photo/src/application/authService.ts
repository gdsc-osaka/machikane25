import { createHash, timingSafeEqual } from "node:crypto";
import { getAdminAuth } from "@/lib/firebase/admin";

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

const toHashBuffer = (hexValue: string): Buffer => Buffer.from(hexValue, "hex");

const hashToken = (token: string, salt: string): string =>
	createHash("sha256").update(`${token}${salt}`).digest("hex");

const createAuthError = (message: string): Error => {
	const error = new Error(message);
	error.name = "AuthError";
	return error;
};

export const getAdminCookieName = (): string => ADMIN_COOKIE_NAME;

export const verifyAdminToken = (token: string): boolean => {
	const trimmed = token.trim();
	if (!trimmed) {
		return false;
	}

	const { salt, hash } = ensureAdminEnv();
	const candidateHash = hashToken(trimmed, salt);

	const expectedBuffer = toHashBuffer(hash);
	const candidateBuffer = toHashBuffer(candidateHash);

	if (expectedBuffer.length !== candidateBuffer.length) {
		return false;
	}

	return timingSafeEqual(expectedBuffer, candidateBuffer);
};

export const assertValidAdminToken = (token: string): void => {
	const isValid = verifyAdminToken(token);
	if (!isValid) {
		throw createAuthError("Invalid admin token provided");
	}
};

export const createCustomToken = async (): Promise<string> => {
	const auth = getAdminAuth();
	return auth.createCustomToken(ADMIN_USER_ID, {
		role: "admin",
		issuedAt: new Date().toISOString(),
	});
};
