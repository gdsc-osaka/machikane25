import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
	getAdminCookieName,
	verifyAdminToken,
} from "@/application/authService";

const redirectToLogin = (request: NextRequest) =>
	NextResponse.redirect(new URL("/login", request.url));

export const middleware = async (request: NextRequest) => {
	const cookie = request.cookies.get(getAdminCookieName());
	const token = cookie?.value ?? "";

	if (!token) {
		return redirectToLogin(request);
	}

	const isValid = await verifyAdminToken(token);

	if (!isValid) {
		return redirectToLogin(request);
	}

	return NextResponse.next();
};

export const config = {
	matcher: [
		"/admin/:path*",
		"/control/:path*",
		"/display/:path*",
		"/photos/:path*",
	],
};
