import { err, ok, type Result } from "neverthrow";
import {
	claimStamp,
	createEmptyLedger,
	mergeLedger,
	type ClaimStampResult as DomainClaimResult,
	type StampCheckpoint,
	type StampProgress,
} from "@/domain/stamp";
import type { StampRepository } from "@/infra/firestore/stamp-repository";

type ResolveCheckpoint = (token: string) => StampCheckpoint | null;

type ClaimStampRequest = {
	token: string;
	userId: string;
};

type ClaimStampSuccess = {
	progress: StampProgress;
};

type ClaimStampDuplicateError = {
	reason: "duplicate";
	progress: StampProgress;
};

type ClaimStampInvalidTokenError = {
	reason: "invalid-token";
};

type ClaimStampError = ClaimStampDuplicateError | ClaimStampInvalidTokenError;

type ClaimStampResponse = Result<ClaimStampSuccess, ClaimStampError>;

type ClaimStampService = {
	claim: (request: ClaimStampRequest) => Promise<ClaimStampResponse>;
};

type CreateClaimStampServiceOptions = {
	repository: StampRepository;
	resolveCheckpoint: ResolveCheckpoint;
	clock: () => number;
};

const toSuccessResponse = (
	result: Extract<DomainClaimResult, { outcome: "claimed" }>,
): ClaimStampSuccess => ({
	progress: result.progress,
});

const toDuplicateError = (
	result: Extract<DomainClaimResult, { outcome: "duplicate" }>,
): ClaimStampDuplicateError => ({
	reason: "duplicate",
	progress: result.progress,
});

const createClaimStampService = ({
	repository,
	resolveCheckpoint,
	clock,
}: CreateClaimStampServiceOptions): ClaimStampService => {
	const claim = async ({
		token,
		userId,
	}: ClaimStampRequest): Promise<ClaimStampResponse> => {
		const checkpoint = resolveCheckpoint(token);
		if (!checkpoint) {
			return err({ reason: "invalid-token" });
		}

		const existing = await repository.getByUserId(userId);
		const ledger = mergeLedger(existing?.ledger ?? createEmptyLedger());
		const collectedAt = clock();
		const result = claimStamp(ledger, {
			checkpoint,
			collectedAt,
		});

		if (result.outcome === "duplicate") {
			return err(toDuplicateError(result));
		}

		await repository.save({
			userId,
			ledger: result.ledger,
			collectedAt,
		});

		return ok(toSuccessResponse(result));
	};

	return { claim };
};

export { createClaimStampService };
export type {
	ClaimStampError,
	ClaimStampRequest,
	ClaimStampResponse,
	ClaimStampService,
	ClaimStampSuccess,
	CreateClaimStampServiceOptions,
	ResolveCheckpoint,
};
