"use server";

import { cookies } from "next/headers";
import { z } from "zod";
import {
	assertValidAdminToken,
	createCustomToken,
	getAdminCookieName,
} from "@/application/authService";

const loginSchema = z.object({
	token: z.string().min(1, "token is required"),
});

const ADMIN_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 12; // 12 hours

export const loginWithAdminTokenAction = async (input: {
	token: string;
}) => {
	const { token } = loginSchema.parse(input);

	await assertValidAdminToken(token);

	const customToken = await createCustomToken();

	const cookieStore = await cookies();
	cookieStore.set({
		name: getAdminCookieName(),
		value: token,
		httpOnly: true,
		secure: true,
		sameSite: "strict",
		path: "/",
		maxAge: ADMIN_COOKIE_MAX_AGE_SECONDS,
	});

	return { customToken };
};
