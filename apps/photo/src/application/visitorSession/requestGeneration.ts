import {
  selectTheme,
  startGeneration,
  VisitorSession,
} from "@/domain/visitorSession";
import type { VisitorSessionRepository } from "@/application/repositories";
import {
  GenerationQueueConfig,
  PromptSelection,
} from "@/infra/generationQueue";
import { createGenerationTask } from "@/application/generationPipeline";

export type RequestGenerationInput = Readonly<{
  sessionId: string;
  themeId: string;
  promptSelections: ReadonlyArray<PromptSelection>;
  requestedAt: Date;
}>;

export type RequestGenerationError = Readonly<
  | {
      type: "session-not-found";
      message: string;
      sessionId: string;
    }
  | {
      type: "unauthorized";
      message: string;
      sessionId: string;
      requestedUid: string;
    }
  | {
      type: "domain-error";
      message: string;
      cause?: unknown;
    }
  | {
      type: "repository-error";
      message: string;
      cause?: unknown;
    }
  | {
      type: "queue-error";
      message: string;
      cause?: unknown;
    }
>;

export type EnqueueGenerationTask = (
  taskRequest: ReturnType<typeof createGenerationTask>,
) => Promise<void>;

export type RequestGenerationUseCase = (
  anonymousUid: string,
  input: RequestGenerationInput,
) => Promise<VisitorSession>;

export const requestGeneration =
  (
    repository: VisitorSessionRepository,
    enqueueTask: EnqueueGenerationTask,
    queueConfig: GenerationQueueConfig,
  ): RequestGenerationUseCase =>
  async (anonymousUid, input) => {
    try {
      // Fetch existing session
      const session = await repository.findById(input.sessionId);

      if (!session) {
        const error: RequestGenerationError = {
          type: "session-not-found",
          message: "Session not found",
          sessionId: input.sessionId,
        };
        throw error;
      }

      // Verify ownership
      if (session.anonymousUid !== anonymousUid) {
        const error: RequestGenerationError = {
          type: "unauthorized",
          message: "Session does not belong to this user",
          sessionId: input.sessionId,
          requestedUid: anonymousUid,
        };
        throw error;
      }

      // Apply domain logic: first select theme (if not already selected)
      let sessionWithTheme = session;
      if (session.themeId !== input.themeId) {
        sessionWithTheme = selectTheme(session, {
          themeId: input.themeId,
          selectedAt: input.requestedAt,
        });
      }

      // Start generation in domain model
      const generatingSession = startGeneration(sessionWithTheme, {
        requestedAt: input.requestedAt,
      });

      // Create Cloud Task request
      const taskRequest = createGenerationTask(
        {
          session: generatingSession,
          themeId: input.themeId,
          promptSelections: input.promptSelections,
          requestedAt: input.requestedAt,
        },
        queueConfig,
        {
          attempt: 0,
          previousDelaySeconds: 0,
        },
      );

      // Enqueue the task
      try {
        await enqueueTask(taskRequest);
      } catch (queueError) {
        const error: RequestGenerationError = {
          type: "queue-error",
          message: "Failed to enqueue generation task",
          cause: queueError,
        };
        throw error;
      }

      // Persist updated session
      await repository.save(generatingSession);

      return generatingSession;
    } catch (error) {
      // If it's already our error, rethrow
      if (
        typeof error === "object" &&
        error !== null &&
        "type" in error &&
        (error.type === "session-not-found" ||
          error.type === "unauthorized" ||
          error.type === "domain-error" ||
          error.type === "repository-error" ||
          error.type === "queue-error")
      ) {
        throw error;
      }

      // Wrap domain errors
      if (
        typeof error === "object" &&
        error !== null &&
        "type" in error &&
        (error.type === "invalid-argument" || error.type === "invalid-transition")
      ) {
        const domainError: RequestGenerationError = {
          type: "domain-error",
          message:
            typeof error === "object" && error !== null && "message" in error
              ? String(error.message)
              : "Domain validation failed",
          cause: error,
        };
        throw domainError;
      }

      // Wrap repository errors
      const repositoryError: RequestGenerationError = {
        type: "repository-error",
        message: "Failed to update session for generation request",
        cause: error,
      };
      throw repositoryError;
    }
  };
