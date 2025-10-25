import type { Result, ResultAsync } from "neverthrow";
import {
	createStampProgress,
	type StampProgress,
	type StampRepository,
	type StampRepositoryError,
} from "@/domain/stamp";

type FetchStampProgressInput = {
	userId: string;
};

type FetchStampProgressSuccess = StampProgress | null;

type FetchStampProgressError = StampRepositoryError;

type FetchStampProgressResult = Result<
	FetchStampProgressSuccess,
	FetchStampProgressError
>;
type FetchStampProgressAsyncResult = ResultAsync<
	FetchStampProgressSuccess,
	FetchStampProgressError
>;

type Dependencies = {
	repository: StampRepository;
};

const createFetchStampProgressService = ({ repository }: Dependencies) => {
	const fetch = ({
		userId,
	}: FetchStampProgressInput): FetchStampProgressAsyncResult =>
		repository
			.getByUserId(userId)
			.map((snapshot) =>
				snapshot === null ? null : createStampProgress(snapshot.ledger),
			);

	return { fetch };
};

export { createFetchStampProgressService };
export type {
	FetchStampProgressAsyncResult,
	FetchStampProgressError,
	FetchStampProgressInput,
	FetchStampProgressResult,
	FetchStampProgressSuccess,
};
