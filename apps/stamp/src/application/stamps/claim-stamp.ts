import { errAsync, type Result, type ResultAsync } from "neverthrow";
import { errorBuilder } from "obj-err";
import { z } from "zod";
import {
	createEmptyLedger,
	createStampProgress,
	isStampCollected,
	markStampCollected,
	resolveStampToken,
	type StampCheckpoint,
	type StampProgress,
} from "@/domain/stamp";
import type {
	StampRepository,
	StampRepositoryError,
} from "@/infra/stamp/stamp-repository";

type ClaimStampInput = {
	token: string;
	userId: string;
};

type ClaimStampSuccess = {
	checkpoint: StampCheckpoint;
	progress: StampProgress;
};

const invalidTokenErrorBuilder = errorBuilder(
	"InvalidStampTokenError",
	z.object({
		token: z.string(),
	}),
);

type InvalidStampTokenError = ReturnType<typeof invalidTokenErrorBuilder> & {
	code: "invalid-stamp-token";
	token: string;
};

const duplicateStampErrorBuilder = errorBuilder(
	"DuplicateStampError",
	z.object({
		checkpoint: z.string(),
	}),
);

type DuplicateStampError = ReturnType<typeof duplicateStampErrorBuilder> & {
	code: "duplicate-stamp";
	checkpoint: StampCheckpoint;
};

type ClaimStampError =
	| InvalidStampTokenError
	| DuplicateStampError
	| StampRepositoryError;

type ClaimStampResult = Result<ClaimStampSuccess, ClaimStampError>;
type ClaimStampAsyncResult = ResultAsync<ClaimStampSuccess, ClaimStampError>;

type Clock = () => number;

type Dependencies = {
	repository: StampRepository;
	resolveCheckpoint?: (token: string) => StampCheckpoint | null;
	clock?: Clock;
};

const createInvalidTokenError = (token: string): InvalidStampTokenError => {
	const base = invalidTokenErrorBuilder("Unknown stamp token provided.", {
		extra: { token },
	});
	return {
		...base,
		code: "invalid-stamp-token",
		token,
	};
};

const createDuplicateStampError = (
	checkpoint: StampCheckpoint,
): DuplicateStampError => {
	const base = duplicateStampErrorBuilder(
		"Stamp already collected for this attendee.",
		{ extra: { checkpoint } },
	);
	return {
		...base,
		code: "duplicate-stamp",
		checkpoint,
	};
};

const createClaimStampService = ({
	repository,
	resolveCheckpoint = resolveStampToken,
	clock = Date.now,
}: Dependencies) => {
	const claim = ({ token, userId }: ClaimStampInput): ClaimStampAsyncResult => {
		const checkpoint = resolveCheckpoint(token);
		if (checkpoint === null) {
			return errAsync(createInvalidTokenError(token));
		}

		return repository
			.getByUserId(userId)
			.mapErr((error): ClaimStampError => error)
			.andThen((document) => {
				const ledger = document?.ledger ?? createEmptyLedger();

				if (isStampCollected(ledger, checkpoint)) {
					return errAsync(createDuplicateStampError(checkpoint));
				}

				const collectedAt = clock();
				const updatedLedger = markStampCollected({
					ledger,
					checkpoint,
					collectedAt,
				});
				const progress = createStampProgress(updatedLedger);

				return repository
					.save({
						userId,
						ledger: updatedLedger,
						collectedAt,
						createdAt: document?.createdAt,
						lastCollectedAt: progress.lastCollectedAt,
					})
					.mapErr((error): ClaimStampError => error)
					.map(() => ({
						checkpoint,
						progress,
					}));
			});
	};

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
