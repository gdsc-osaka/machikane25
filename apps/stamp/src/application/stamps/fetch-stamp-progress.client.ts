"use client";

import { signInAnonymously } from "firebase/auth";
import { ResultAsync } from "neverthrow";
import {
	createFetchStampProgressService,
	type FetchStampProgressAsyncResult,
} from "@/application/stamps/fetch-stamp-progress";
import { StampRepositoryError } from "@/domain/stamp";
import { getFirebaseAuth, getFirestoreClient } from "@/firebase";
import { createStampRepository } from "@/infra/stamp/stamp-repository";

const fetchStampProgressService = createFetchStampProgressService({
	repository: createStampRepository(getFirestoreClient()),
});

const fetchStampProgressForCurrentUser = (): FetchStampProgressAsyncResult =>
	ResultAsync.fromPromise(
		getFirebaseAuth()
			.authStateReady()
			.then(() => getFirebaseAuth().currentUser),
		(cause) =>
			StampRepositoryError("Failed to resolve attendee identity.", {
				cause,
				extra: { operation: "get" },
			}),
	).andThen((user) =>
		user === null
			? ResultAsync.fromPromise(Promise.resolve(null), () => undefined as never)
			: fetchStampProgressService.fetch({ userId: user.uid }),
	);

export { fetchStampProgressForCurrentUser };
