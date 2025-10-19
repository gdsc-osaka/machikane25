import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { StampLedger } from "@/domain/stamp";

type MockTimestampInstance = {
  readonly value: number;
  toMillis: () => number;
};

const fromMillisSpy = vi.fn((value: number) =>
  new MockTimestamp(value),
);

class MockTimestamp implements MockTimestampInstance {
  readonly value: number;

  constructor(value: number) {
    this.value = value;
  }

  toMillis() {
    return this.value;
  }

  static fromMillis = fromMillisSpy;
}

vi.mock("firebase/firestore", () => ({
  Timestamp: MockTimestamp,
}));

let stampLedgerConverter: typeof import("../stamp-converter")['stampLedgerConverter'];

beforeAll(async () => {
  ({ stampLedgerConverter } = await import("../stamp-converter"));
});

beforeEach(() => {
  fromMillisSpy.mockClear();
});

describe("stampLedgerConverter.toFirestore", () => {
  it("wraps millis values with Timestamp instances", () => {
    const ledger: StampLedger = {
      reception: null,
      photobooth: 1_111,
      art: null,
      robot: null,
      survey: null,
    };

    const record = stampLedgerConverter.toFirestore({
      createdAt: 1_700_000_000_000,
      lastCollectedAt: 1_700_000_123_000,
      ledger,
    });

    expect(fromMillisSpy).toHaveBeenCalledWith(1_700_000_000_000);
    expect(fromMillisSpy).toHaveBeenCalledWith(1_700_000_123_000);
    expect(record.createdAt).toBeInstanceOf(MockTimestamp);
    expect(record.lastCollectedAt).toBeInstanceOf(MockTimestamp);
    expect(record.stamps).toBe(ledger);
  });

  it("keeps null lastCollectedAt without converting", () => {
    const ledger: StampLedger = {
      reception: null,
      photobooth: null,
      art: null,
      robot: null,
      survey: null,
    };

    const record = stampLedgerConverter.toFirestore({
      createdAt: 1_700_000_000_000,
      lastCollectedAt: null,
      ledger,
    });

    expect(fromMillisSpy).toHaveBeenCalledWith(1_700_000_000_000);
    expect(record.lastCollectedAt).toBeNull();
  });
});

describe("stampLedgerConverter.fromFirestore", () => {
  it("converts Firestore timestamps back to ledger millis", () => {
    const snapshot = {
      id: "guest-1",
      data: () => ({
        createdAt: new MockTimestamp(1_700_000_000_000),
        lastCollectedAt: new MockTimestamp(1_700_000_456_000),
        stamps: {
          reception: new MockTimestamp(1_700_000_111_000),
          photobooth: null,
          art: new MockTimestamp(1_700_000_222_000),
          robot: undefined,
          survey: null,
        },
      }),
    };

    const record = stampLedgerConverter.fromFirestore(
      snapshot as unknown as import("firebase/firestore").QueryDocumentSnapshot<Record<string, unknown>>,
    );

    expect(record.createdAt).toBe(1_700_000_000_000);
    expect(record.lastCollectedAt).toBe(1_700_000_456_000);
    expect(record.ledger.reception).toBe(1_700_000_111_000);
    expect(record.ledger.art).toBe(1_700_000_222_000);
    expect(record.ledger.photobooth).toBeNull();
    expect(record.ledger.robot).toBeNull();
    expect(record.ledger.survey).toBeNull();
  });
});
