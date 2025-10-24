import { Err, Ok, Result } from "neverthrow";

export type PublicAccessToken = Readonly<{
  id: string;
  sessionId: string;
  isConsumed: boolean;
  createdAt: Date;
  expiresAt: Date;
  consumedAt: Date | null;
}>;

export type PublicAccessTokenError =
  | {
      type: "invalid-argument";
      message: string;
    }
  | {
      type: "invalid-transition";
      message: string;
    };

export const createPublicAccessToken = (input: {
  id: string;
  sessionId: string;
  now: Date;
  expiresAt: Date;
}): Result<PublicAccessToken, PublicAccessTokenError> => {
  if (!input.id || !input.sessionId) {
    return Err({
      type: "invalid-argument",
      message: "id and sessionId are required",
    });
  }
  if (input.expiresAt.getTime() <= input.now.getTime()) {
    return Err({
      type: "invalid-argument",
      message: "expiresAt must be in the future",
    });
  }
  return Ok({
    id: input.id,
    sessionId: input.sessionId,
    isConsumed: false,
    createdAt: input.now,
    expiresAt: input.expiresAt,
    consumedAt: null,
  });
};

export const consumePublicAccessToken = (
  token: PublicAccessToken,
  input: { now: Date },
): Result<PublicAccessToken, PublicAccessTokenError> => {
  if (token.isConsumed) {
    return Err({
      type: "invalid-transition",
      message: "Token already consumed",
    });
  }
  if (token.expiresAt.getTime() < input.now.getTime()) {
    return Err({
      type: "invalid-transition",
      message: "Token already expired",
    });
  }
  return Ok({
    ...token,
    isConsumed: true,
    consumedAt: input.now,
  });
};
