import { createVisitorSession, VisitorSession } from "@/domain/visitorSession";
import type { VisitorSessionRepository } from "@/application/repositories";

export type CreateSessionInput = Readonly<{
  anonymousUid: string;
  boothId: string;
  now: Date;
  ttlHours?: number;
}>;

export type CreateSessionError = Readonly<
  | {
      type: "session-exists";
      message: string;
      sessionId: string;
    }
  | {
      type: "repository-error";
      message: string;
      cause?: unknown;
    }
  | {
      type: "domain-error";
      message: string;
      cause?: unknown;
    }
>;

export type CreateSessionUseCase = (
  input: CreateSessionInput,
) => Promise<VisitorSession>;

const generateSessionId = (boothId: string, anonymousUid: string): string => {
  const timestamp = Date.now();
  const sanitizedBoothId = boothId.replace(/[^a-zA-Z0-9-]/g, "");
  const uidPrefix = anonymousUid.substring(0, 8);
  return `session-${sanitizedBoothId}-${uidPrefix}-${timestamp}`;
};

export const createSession =
  (
    repository: VisitorSessionRepository,
  ): CreateSessionUseCase =>
  async (input) => {
    try {
      // Check if user already has an active session
      const existingSession = await repository.findActiveByAnonymousUid(
        input.anonymousUid,
      );

      if (existingSession) {
        const error: CreateSessionError = {
          type: "session-exists",
          message: "User already has an active session",
          sessionId: existingSession.id,
        };
        throw error;
      }

      // Generate unique session ID
      const sessionId = generateSessionId(input.boothId, input.anonymousUid);

      // Create domain session object
      const session = createVisitorSession({
        id: sessionId,
        anonymousUid: input.anonymousUid,
        now: input.now,
        ttlHours: input.ttlHours,
      });

      // Persist session
      await repository.save(session);

      return session;
    } catch (error) {
      // If it's already our error, rethrow
      if (
        typeof error === "object" &&
        error !== null &&
        "type" in error &&
        (error.type === "session-exists" ||
          error.type === "repository-error" ||
          error.type === "domain-error")
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
        const domainError: CreateSessionError = {
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
      const repositoryError: CreateSessionError = {
        type: "repository-error",
        message: "Failed to create session",
        cause: error,
      };
      throw repositoryError;
    }
  };
