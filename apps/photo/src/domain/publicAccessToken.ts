export type PublicAccessToken = Readonly<{
  id: string;
  sessionId: string;
  isConsumed: boolean;
  createdAt: Date;
  expiresAt: Date;
  consumedAt: Date | null;
}>;

export type PublicAccessTokenError = Readonly<
  | {
      type: "invalid-argument";
      message: string;
    }
  | {
      type: "invalid-transition";
      message: string;
    }
>;

export const createPublicAccessToken = (input: {
  id: string;
  sessionId: string;
  now: Date;
  expiresAt: Date;
}): PublicAccessToken => {
  if (!input.id || !input.sessionId) {
    const error: PublicAccessTokenError = {
      type: "invalid-argument",
      message: "id and sessionId are required",
    };
    throw error;
  }
  if (input.expiresAt.getTime() <= input.now.getTime()) {
    const error: PublicAccessTokenError = {
      type: "invalid-argument",
      message: "expiresAt must be in the future",
    };
    throw error;
  }
  const token: PublicAccessToken = {
    id: input.id,
    sessionId: input.sessionId,
    isConsumed: false,
    createdAt: input.now,
    expiresAt: input.expiresAt,
    consumedAt: null,
  };
  return token;
};

export const consumePublicAccessToken = (
  token: PublicAccessToken,
  input: { now: Date },
): PublicAccessToken => {
  if (token.isConsumed) {
    const error: PublicAccessTokenError = {
      type: "invalid-transition",
      message: "Token already consumed",
    };
    throw error;
  }
  if (token.expiresAt.getTime() < input.now.getTime()) {
    const error: PublicAccessTokenError = {
      type: "invalid-transition",
      message: "Token already expired",
    };
    throw error;
  }
  const consumedToken: PublicAccessToken = {
    ...token,
    isConsumed: true,
    consumedAt: input.now,
  };
  return consumedToken;
};
