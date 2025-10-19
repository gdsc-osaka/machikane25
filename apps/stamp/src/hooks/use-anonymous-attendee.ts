"use client";

import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { useEffect, useMemo, useRef, useState } from "react";
import { getFirebaseAuth } from "@/firebase";
import { getLogger } from "@/packages/logger";

type AnonymousAttendeeStatus = "loading" | "ready" | "error";

type AnonymousAttendeeState = {
	status: AnonymousAttendeeStatus;
	attendeeId: string | null;
	error?: string;
};

const INITIAL_STATE: AnonymousAttendeeState = {
	status: "loading",
	attendeeId: null,
};

const useAnonymousAttendee = (): AnonymousAttendeeState => {
	const [state, setState] = useState<AnonymousAttendeeState>(INITIAL_STATE);
	const hasRequestedSignIn = useRef(false);

	useEffect(() => {
		const auth = getFirebaseAuth();
		const unsubscribe = onAuthStateChanged(auth, (user) => {
			if (user) {
				setState({
					status: "ready",
					attendeeId: user.uid,
				});
				return;
			}
			if (hasRequestedSignIn.current) {
				return;
			}
			hasRequestedSignIn.current = true;
			signInAnonymously(auth).catch((error) => {
				getLogger().error(error, "Anonymous authentication failed.");
				setState({
					status: "error",
					attendeeId: null,
					error: "anonymous-auth-failed",
				});
			});
		});
		return () => unsubscribe();
	}, []);

	return useMemo(() => state, [state]);
};

export { useAnonymousAttendee };

export type {
	AnonymousAttendeeState,
	AnonymousAttendeeStatus,
};
