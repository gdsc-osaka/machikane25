"use client";

import { signInAnonymously } from "firebase/auth";
import { ResultAsync } from "neverthrow";
import {
	type ClaimStampAsyncResult,
	createClaimStampService,
} from "@/application/stamps/claim-stamp";
import { StampRepositoryError } from "@/domain/stamp";
import { getFirebaseAuth, getFirestoreClient } from "@/firebase";
import { createStampRepository } from "@/infra/stamp/stamp-repository";

const claimStampService = createClaimStampService({
	repository: createStampRepository(getFirestoreClient()),
});

const resolveAttendeeId = (): ResultAsync<string, StampRepositoryError> =>
	ResultAsync.fromPromise(
		(async () => {
			const auth = getFirebaseAuth();
			const existingUser = auth.currentUser;
			if (existingUser !== null) {
				return existingUser.uid;
			}
			const credentials = await signInAnonymously(auth);
			return credentials.user.uid;
		})(),
		(cause) =>
			StampRepositoryError("Failed to resolve attendee identity.", {
				cause,
				extra: { operation: "get" },
			}),
	);

const claimStampWithToken = (token: string): ClaimStampAsyncResult =>
	resolveAttendeeId().andThen((userId) =>
		claimStampService.claim({ token, userId }),
	);

export { claimStampWithToken };
