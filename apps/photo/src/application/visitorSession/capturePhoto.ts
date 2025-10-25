import {
  captureOriginalImage,
  VisitorSession,
} from "@/domain/visitorSession";
import type { VisitorSessionRepository } from "@/application/repositories";

export type CapturePhotoInput = Readonly<{
  sessionId: string;
  originalImageRef: string;
  capturedAt: Date;
  retentionMinutes?: number;
}>;

export type CapturePhotoError = Readonly<
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
>;

export type CapturePhotoUseCase = (
  anonymousUid: string,
  input: CapturePhotoInput,
) => Promise<VisitorSession>;

export const capturePhoto =
  (
    repository: VisitorSessionRepository,
  ): CapturePhotoUseCase =>
  async (anonymousUid, input) => {
    try {
      // Fetch existing session
      const session = await repository.findById(input.sessionId);

      if (!session) {
        const error: CapturePhotoError = {
          type: "session-not-found",
          message: "Session not found",
          sessionId: input.sessionId,
        };
        throw error;
      }

      // Verify ownership
      if (session.anonymousUid !== anonymousUid) {
        const error: CapturePhotoError = {
          type: "unauthorized",
          message: "Session does not belong to this user",
          sessionId: input.sessionId,
          requestedUid: anonymousUid,
        };
        throw error;
      }

      // Apply domain logic to capture photo
      const updatedSession = captureOriginalImage(session, {
        storagePath: input.originalImageRef,
        capturedAt: input.capturedAt,
        retentionMinutes: input.retentionMinutes,
      });

      // Persist updated session
      await repository.save(updatedSession);

      return updatedSession;
    } catch (error) {
      // If it's already our error, rethrow
      if (
        typeof error === "object" &&
        error !== null &&
        "type" in error &&
        (error.type === "session-not-found" ||
          error.type === "unauthorized" ||
          error.type === "domain-error" ||
          error.type === "repository-error")
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
        const domainError: CapturePhotoError = {
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
      const repositoryError: CapturePhotoError = {
        type: "repository-error",
        message: "Failed to update session with captured photo",
        cause: error,
      };
      throw repositoryError;
    }
  };
