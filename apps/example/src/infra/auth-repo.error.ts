import { errorBuilder, InferError } from "../shared/error";
import { FirebaseAuthError } from "firebase-admin/auth";
import { match } from "ts-pattern";
import z from "zod";

export const AuthUserNotFoundError = errorBuilder("AuthUserNotFoundError");
export type AuthUserNotFoundError = InferError<typeof AuthUserNotFoundError>;

export const AuthUserDisabledError = errorBuilder("AuthUserDisabledError");
export type AuthUserDisabledError = InferError<typeof AuthUserDisabledError>;

export const AuthTokenRevokedError = errorBuilder("AuthTokenRevokedError");
export type AuthTokenRevokedError = InferError<typeof AuthTokenRevokedError>;

export const AuthUnknownError = errorBuilder(
  "AuthUnknownError",
  z.object({
    code: z.string(),
  })
);
export type AuthUnknownError = InferError<typeof AuthUnknownError>;

export type AuthError =
  | AuthUserNotFoundError
  | AuthUserDisabledError
  | AuthTokenRevokedError
  | AuthUnknownError;

export const handleFirebaseAuthError = (error: unknown): AuthError => {
  if (error instanceof FirebaseAuthError) {
    const Error = match(error.code)
      .with("auth/user-not-found", () => AuthUserNotFoundError)
      .with("auth/user-disabled", () => AuthUserDisabledError)
      .with("auth/id-token-revoked", () => AuthTokenRevokedError)
      .otherwise(() => undefined);

    if (Error === undefined) {
      return AuthUnknownError(error.message, {
        cause: error.cause,
        stack: error.stack,
        extra: { code: error.code },
      });
    }

    return Error(error.message, { cause: error.cause, stack: error.stack });
  }

  if (error instanceof Error) {
    return AuthUnknownError(error.message, {
      cause: error.cause,
      stack: error.stack,
      extra: { code: "unknown" },
    });
  }

  return AuthUnknownError(JSON.stringify(error, null, 2), {
    cause: error,
    extra: { code: "unknown" },
  });
};
