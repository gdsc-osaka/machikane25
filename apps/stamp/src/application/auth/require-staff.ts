"use client";

import { type Auth, getIdTokenResult, signOut } from "firebase/auth";
import {
	createStaffAccount,
	ensureStaffAuthorization,
	type StaffAccount,
} from "@/domain/auth/staff";
import { getFirebaseAuth } from "@/firebase";
import { getLogger } from "@/packages/logger";

type StaffAccess =
	| { status: "needs-auth" }
	| { status: "authorized"; staff: StaffAccount };

const logger = getLogger();

const signOutQuietly = async (auth: Auth, reason: string) => {
	try {
		await signOut(auth);
	} catch (error) {
		logger.warn("Failed to sign out after staff guard rejection.", {
			reason,
			error:
				error instanceof Error
					? { message: error.message, name: error.name }
					: { message: "unknown" },
		});
	}
};

const toStaffAccount = (user: {
	uid: string;
	email: string | null;
	displayName: string | null;
}) => ({
	uid: user.uid,
	email: user.email,
	displayName: user.displayName,
});

const requireStaff = async (): Promise<StaffAccess> => {
	const auth = getFirebaseAuth();
	const user = auth.currentUser;
	if (user === null) {
		return { status: "needs-auth" };
	}

	const token = await getIdTokenResult(user, true);
	const authorization = ensureStaffAuthorization(token.claims);
	if (authorization.isErr()) {
		const error = authorization._unsafeUnwrapErr();
		logger.warn("Staff guard rejected non-staff user.", {
			reason: error.extra?.reason ?? "unknown",
			uid: user.uid,
		});
		await signOutQuietly(auth, error.extra?.reason ?? "not_staff");
		return { status: "needs-auth" };
	}

	const accountResult = createStaffAccount(
		toStaffAccount({
			uid: user.uid,
			email: user.email ?? null,
			displayName: user.displayName ?? null,
		}),
	);
	if (accountResult.isErr()) {
		const error = accountResult._unsafeUnwrapErr();
		await signOutQuietly(auth, "invalid_account");
		throw error;
	}

	return {
		status: "authorized",
		staff: accountResult._unsafeUnwrap(),
	};
};

export { requireStaff };
export type { StaffAccess };
