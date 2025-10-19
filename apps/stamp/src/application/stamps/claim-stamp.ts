import { err, ok, type Result } from "neverthrow";
import {
	createEmptyLedger,
	createStampProgress,
	isStampCollected,
	markStampCollected,
	resolveStampToken,
	type StampCheckpoint,
	type StampLedger,
	type StampProgress,
} from "@/domain/stamp";
import {
	createStampRepository,
	type StampRepository,
} from "@/infra/stamp/stamp-repository";
import { getLogger } from "@/packages/logger";

type ClaimStampErrorCode =
	| "invalid-token"
	| "duplicate-stamp"
	| "persistence-error";

type ClaimStampError = {
	code: ClaimStampErrorCode;
};

type ClaimStampSuccess = {
	checkpoint: StampCheckpoint;
	progress: StampProgress;
};

type ClaimStampResult = Result<ClaimStampSuccess, ClaimStampError>;

type ClaimStampDeps = {
	repository: StampRepository;
	resolveCheckpoint: (token: string) => StampCheckpoint | null;
	clock: () => number;
};

type ClaimStampInput = {
	userId: string;
	token: string;
};

const createClaimStampService = (deps?: Partial<ClaimStampDeps>) => {
	const repositoryPromise: Promise<StampRepository> =
		deps?.repository !== undefined
			? Promise.resolve(deps.repository)
			: import("@/firebase").then((module) =>
					createStampRepository({
						firestore: module.getFirestoreClient(),
					}),
				);

	const resolveCheckpoint =
		deps?.resolveCheckpoint ?? resolveStampToken;

	const clock = deps?.clock ?? (() => Date.now());

	const claim = async ({
		userId,
		token,
	}: ClaimStampInput): Promise<ClaimStampResult> => {
		const repository = await repositoryPromise;
		const checkpoint = resolveCheckpoint(token);
		if (checkpoint === null) {
			return err({ code: "invalid-token" });
		}

		try {
			const existing = await repository.getByUserId(userId);
			const baseLedger: StampLedger =
				existing?.ledger ?? createEmptyLedger();
			if (isStampCollected(baseLedger, checkpoint)) {
				return err({ code: "duplicate-stamp" });
			}

			const collectedAt = clock();
			const nextLedger = markStampCollected({
				ledger: baseLedger,
				checkpoint,
				collectedAt,
			});

			await repository.save({
				userId,
				ledger: nextLedger,
				collectedAt,
			});

			const progress = createStampProgress(nextLedger);
			return ok({
				checkpoint,
				progress,
			});
		} catch (error) {
			getLogger().error(error, "Failed to persist stamp claim.");
			return err({ code: "persistence-error" });
		}
	};

	return {
		claim,
	};
};

export { createClaimStampService };

export type {
	ClaimStampInput,
	ClaimStampResult,
	ClaimStampError,
	ClaimStampSuccess,
	ClaimStampErrorCode,
};
