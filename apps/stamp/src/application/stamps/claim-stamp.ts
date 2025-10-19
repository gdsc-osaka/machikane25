import type { Result, ResultAsync } from "neverthrow";
import {
	collectStamp,
	createEmptyLedger,
	type DuplicateStampError,
	type InvalidStampTokenError,
	type PersistStampLedgerInput,
	resolveStampTokenResult,
	type StampCheckpoint,
	type StampProgress,
	type StampRepository,
	type StampRepositoryError,
} from "@/domain/stamp";

type ClaimStampInput = {
	token: string;
	userId: string;
};

type ClaimStampSuccess = {
	checkpoint: StampCheckpoint;
	progress: StampProgress;
};

type ClaimStampError =
	| InvalidStampTokenError
	| DuplicateStampError
	| StampRepositoryError;

type ClaimStampResult = Result<ClaimStampSuccess, ClaimStampError>;
type ClaimStampAsyncResult = ResultAsync<ClaimStampSuccess, ClaimStampError>;

type Clock = () => number;

type ResolveCheckpoint = (
	token: string,
) => Result<StampCheckpoint, InvalidStampTokenError>;

type Dependencies = {
	repository: StampRepository;
	resolveCheckpoint?: ResolveCheckpoint;
	clock?: Clock;
};

const createClaimStampService = ({
	repository,
	resolveCheckpoint = resolveStampTokenResult,
	clock = Date.now,
}: Dependencies) => {
	const claim = ({ token, userId }: ClaimStampInput): ClaimStampAsyncResult =>
		resolveCheckpoint(token).asyncAndThen((checkpoint) =>
			repository
				.getByUserId(userId)
				.mapErr((error): ClaimStampError => error)
				.andThen((snapshot) => {
					const ledger = snapshot?.ledger ?? createEmptyLedger();
					const collectedAt = clock();

					return collectStamp({
						ledger,
						checkpoint,
						collectedAt,
					}).asyncAndThen(({ ledger: updatedLedger, progress }) => {
						const persistInput: PersistStampLedgerInput = {
							userId,
							ledger: updatedLedger,
							collectedAt,
							createdAt: snapshot?.createdAt,
							lastCollectedAt: progress.lastCollectedAt,
						};

						return repository
							.save(persistInput)
							.mapErr((error): ClaimStampError => error)
							.map(() => ({
								checkpoint,
								progress,
							}));
					});
				}),
		);

	return {
		claim,
	};
};

export { createClaimStampService };
export type {
	ClaimStampError,
	ClaimStampInput,
	ClaimStampAsyncResult,
	ClaimStampResult,
	ClaimStampSuccess,
};
