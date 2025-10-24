import { VisitorSession } from "@/domain/visitorSession";
import {
  CloudTaskRequest,
  GenerationQueueConfig,
  PromptSelection,
  RetryContext,
  buildGenerationTaskRequest,
} from "@/infra/generationQueue";

export type GenerationPipelineInput = Readonly<{
  session: VisitorSession;
  themeId: string;
  promptSelections: ReadonlyArray<PromptSelection>;
  requestedAt: Date;
}>;

export const createGenerationTask = (
  input: GenerationPipelineInput,
  queueConfig: GenerationQueueConfig,
  retryContext: RetryContext,
): CloudTaskRequest =>
  buildGenerationTaskRequest({
    session: input.session,
    themeId: input.themeId,
    promptSelections: input.promptSelections,
    queueConfig,
    retryContext,
    requestedAt: input.requestedAt,
  });
