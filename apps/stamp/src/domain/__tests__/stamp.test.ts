import { describe, expect, it } from "vitest";
import {
  STAMP_SEQUENCE,
  createEmptyLedger,
  createStampProgress,
  isStampCollected,
  markStampCollected,
  resolveStampToken,
  type StampCheckpoint,
} from "@/domain/stamp";

describe("stamp domain model", () => {
  it("resolves known tokens to checkpoints and rejects unknown tokens", () => {
    const validToken = `token-${STAMP_SEQUENCE[0]}`;
    expect(resolveStampToken(validToken)).toBe(STAMP_SEQUENCE[0]);
    expect(resolveStampToken("token-unknown")).toBeNull();
  });

  it("marks checkpoints without mutating the original ledger", () => {
    const initialLedger = createEmptyLedger();
    const collectedAt = 1_700_000_000_000;
    const updatedLedger = markStampCollected({
      ledger: initialLedger,
      checkpoint: "photobooth",
      collectedAt,
    });

    expect(initialLedger.photobooth).toBeNull();
    expect(updatedLedger.photobooth).toBe(collectedAt);

    const progress = createStampProgress(updatedLedger);
    expect(progress.collected).toEqual(["photobooth"]);
    expect(progress.remaining).toEqual(
      STAMP_SEQUENCE.filter((checkpoint) => checkpoint !== "photobooth"),
    );
    expect(progress.isComplete).toBe(false);
  });

  it("detects duplicate tokens using the ledger state", () => {
    const checkpoints: ReadonlyArray<StampCheckpoint> = STAMP_SEQUENCE.slice(0, 2);
    const ledger = checkpoints.reduce(
      (acc, checkpoint, index) =>
        markStampCollected({
          ledger: acc,
          checkpoint,
          collectedAt: 1_700_000_000_000 + index * 1_000,
        }),
      createEmptyLedger(),
    );

    expect(isStampCollected(ledger, "reception")).toBe(true);
    expect(isStampCollected(ledger, "robot")).toBe(false);
  });
});
