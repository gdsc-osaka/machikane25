import { err, ok, type Result } from "neverthrow";
import { Timestamp } from "firebase/firestore";
import {
	buildStampProgress,
	type StampCheckpointKey,
	type StampProgress,
} from "@/domain/stamp";
import type {
	ClaimOutcome,
	ClaimStampInput,
	StampRepository,
} from "@/infra/firestore/stamp-repository";

type ResolveCheckpoint = (token: string) => StampCheckpointKey | null;

type CreateClaimStampServiceOptions = {
	repository: StampRepository;
	resolveCheckpoint: ResolveCheckpoint;
	order: ReadonlyArray<StampCheckpointKey>;
	clock: () => Timestamp;
};

type ClaimStampRequest = {
	token: string;
	userId: string;
};

type ClaimStampSuccess = {
	progress: StampProgress;
};

type ClaimStampError =
	| { reason: "invalid-token" }
	| { reason: "duplicate"; progress: StampProgress };

type ClaimStampResult = Result<ClaimStampSuccess, ClaimStampError>;

const toClaimInput = ({
	userId,
	checkpoint,
	collectedAt,
}: {
	userId: string;
	checkpoint: StampCheckpointKey;
	collectedAt: Timestamp;
}): ClaimStampInput => ({
	userId,
	checkpoint,
	collectedAt,
});

const toProgress = ({
	document,
	order,
}: {
	document: ClaimOutcome["document"];
	order: ReadonlyArray<StampCheckpointKey>;
}): StampProgress =>
	buildStampProgress({
		entries: document.entries,
		order,
	});

const createDuplicateError = ({
	document,
	order,
}: {
	document: ClaimOutcome["document"];
	order: ReadonlyArray<StampCheckpointKey>;
}): ClaimStampError => ({
	reason: "duplicate",
	progress: toProgress({ document, order }),
});

const createClaimStampService = ({
	repository,
	resolveCheckpoint,
	order,
	clock,
}: CreateClaimStampServiceOptions) => {
	const claim = async ({
		token,
		userId,
	}: ClaimStampRequest): Promise<ClaimStampResult> => {
		const checkpoint = resolveCheckpoint(token);
		if (!checkpoint) {
			return err({ reason: "invalid-token" });
		}
		const collectedAt = clock();
		const outcome = await repository.claim(
			toClaimInput({
				userId,
				checkpoint,
				collectedAt,
			}),
		);
		if (outcome.kind === "duplicate") {
			return err(
				createDuplicateError({
					document: outcome.document,
					order,
				}),
			);
		}
		return ok({
			progress: toProgress({
				document: outcome.document,
				order,
			}),
		});
	};
	return { claim };
};

export { createClaimStampService };
export type {
	ClaimStampError,
	ClaimStampRequest,
	ClaimStampResult,
	ClaimStampSuccess,
	CreateClaimStampServiceOptions,
	ResolveCheckpoint,
};
