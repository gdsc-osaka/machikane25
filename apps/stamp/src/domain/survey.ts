import type { ResultAsync } from "neverthrow";
import { errorBuilder, type InferError } from "obj-err";
import { z } from "zod";

const SurveyLedgerError = errorBuilder(
	"SurveyLedgerError",
	z.object({
		operation: z.literal("markCompleted"),
	}),
);

type SurveyLedgerError = InferError<typeof SurveyLedgerError>;

type MarkSurveyCompletedInput = {
	attendeeId: string;
	completedAt: number;
	responseId: string;
};

type SurveyLedgerPort = {
	markCompleted: (
		input: MarkSurveyCompletedInput,
	) => ResultAsync<void, SurveyLedgerError>;
};

export { SurveyLedgerError };
export type { MarkSurveyCompletedInput, SurveyLedgerPort };
