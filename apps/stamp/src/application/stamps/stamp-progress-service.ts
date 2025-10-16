import { errAsync, okAsync, type ResultAsync } from "neverthrow";
import { match } from "ts-pattern";
import {
	emptyStampProgress,
	type StampProgress,
	type StampProgressError,
	type StampProgressRepository,
} from "@/domain/stamps/progress";
import { resolveStampProgressRepository } from "@/infra/stamps/firestore-stamp-progress-repository";

export type StampProgressService = {
	fetch: (uid: string) => ResultAsync<StampProgress, StampProgressError>;
};

export const createStampProgressService = (
	repository: StampProgressRepository = resolveStampProgressRepository(),
): StampProgressService => ({
	fetch: (uid: string) =>
		repository.getByUserId(uid).orElse((error) =>
			match(error.extra?.reason)
				.with("not_found", () => okAsync(emptyStampProgress()))
				.otherwise(() => errAsync(error)),
		),
});

export const stampProgressService = createStampProgressService();
