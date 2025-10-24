import { describe, expect, test } from "vitest";
import {
  consumePublicAccessToken,
  createPublicAccessToken,
  PublicAccessToken,
} from "@/domain/publicAccessToken";

const now = new Date("2025-01-01T00:00:00.000Z");
const future = new Date("2025-01-01T01:00:00.000Z");

describe("createPublicAccessToken", () => {
  test("returns token for valid input", () => {
    const token = createPublicAccessToken({
      id: "token-1",
      sessionId: "session-1",
      now,
      expiresAt: future,
    });
    const expected: PublicAccessToken = {
      id: "token-1",
      sessionId: "session-1",
      isConsumed: false,
      createdAt: now,
      expiresAt: future,
      consumedAt: null,
    };
    expect(token).toEqual(expected);
  });

  test("throws typed error when identifiers are missing", () => {
    try {
      createPublicAccessToken({
        id: "",
        sessionId: "",
        now,
        expiresAt: future,
      });
      throw new Error("expected failure");
    } catch (error) {
      expect(error).toEqual({
        type: "invalid-argument",
        message: "id and sessionId are required",
      });
    }
  });

  test("throws typed error when expiresAt is not in the future", () => {
    try {
      createPublicAccessToken({
        id: "token-1",
        sessionId: "session-1",
        now: future,
        expiresAt: now,
      });
      throw new Error("expected failure");
    } catch (error) {
      expect(error).toEqual({
        type: "invalid-argument",
        message: "expiresAt must be in the future",
      });
    }
  });
});

describe("consumePublicAccessToken", () => {
  const buildToken = () =>
    createPublicAccessToken({
      id: "token-1",
      sessionId: "session-1",
      now,
      expiresAt: future,
    });

  test("marks token as consumed", () => {
    const token = buildToken();
    const consumed = consumePublicAccessToken(token, { now: future });
    const expected: PublicAccessToken = {
      ...token,
      isConsumed: true,
      consumedAt: future,
    };
    expect(consumed).toEqual(expected);
  });

  test("throws typed error when already consumed", () => {
    const token = consumePublicAccessToken(buildToken(), { now: future });
    try {
      consumePublicAccessToken(token, { now: future });
      throw new Error("expected failure");
    } catch (error) {
      expect(error).toEqual({
        type: "invalid-transition",
        message: "Token already consumed",
      });
    }
  });

  test("throws typed error when expired", () => {
    const token = buildToken();
    try {
      consumePublicAccessToken(token, {
        now: new Date("2025-01-01T02:00:00.000Z"),
      });
      throw new Error("expected failure");
    } catch (error) {
      expect(error).toEqual({
        type: "invalid-transition",
        message: "Token already expired",
      });
    }
  });
});
