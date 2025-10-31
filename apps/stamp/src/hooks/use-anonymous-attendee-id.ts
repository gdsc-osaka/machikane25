"use client";

import { signInAnonymously } from "firebase/auth";
import { useEffect, useMemo, useState } from "react";
import { getFirebaseAuth } from "@/firebase";
import { getLogger } from "@/packages/logger";

type UseAnonymousAttendeeIdResult = {
	attendeeId: string | null;
	isLoading: boolean;
};

const INITIAL_STATE: UseAnonymousAttendeeIdResult = {
	attendeeId: null,
	isLoading: true,
};

const useAnonymousAttendeeId = (): UseAnonymousAttendeeIdResult => {
	const [state, setState] =
		useState<UseAnonymousAttendeeIdResult>(INITIAL_STATE);

	useEffect(() => {
		const auth = getFirebaseAuth();
		const existingUser = auth.currentUser;
		if (existingUser !== null) {
			setState({
				attendeeId: existingUser.uid,
				isLoading: false,
			});
			return;
		}

		const controller = new AbortController();

		signInAnonymously(auth)
			.then((credentials) => {
				if (!controller.signal.aborted) {
					setState({
						attendeeId: credentials.user.uid,
						isLoading: false,
					});
				}
			})
			.catch((error) => {
				if (!controller.signal.aborted) {
					getLogger().error(
						error,
						"Failed to sign in anonymously while resolving attendee identity.",
					);
					setState({
						attendeeId: null,
						isLoading: false,
					});
				}
			});

		return () => {
			controller.abort();
		};
	}, []);

	return useMemo(() => state, [state]);
};

export { useAnonymousAttendeeId };
