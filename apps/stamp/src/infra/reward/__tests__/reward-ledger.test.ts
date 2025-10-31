import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { RewardLedgerError } from "@/domain/reward";

type CollectionReference = { withConverter?: unknown };
type DocumentReference = { id: string };

const collectionMock =
	vi.fn<(firestore: unknown, path: string) => CollectionReference>();
const docMock = vi.fn<(collection: unknown, id: string) => DocumentReference>();
const setDocMock =
	vi.fn<
		(
			arg1: DocumentReference,
			arg2: Record<string, unknown>,
			arg3: { merge: boolean },
		) => Promise<unknown>
	>();
const fromMaybeMillisMock = vi.fn<(value: number) => unknown>();

vi.mock("firebase/firestore", () => ({
	collection: collectionMock,
	doc: docMock,
	setDoc: setDocMock,
}));

vi.mock("@/infra/timestamp", () => ({
	timestampUtils: {
		fromMaybeMillis: fromMaybeMillisMock,
	},
}));

let createRewardLedger: typeof import("../reward-ledger")["createRewardLedger"];
let USERS_COLLECTION: typeof import("../reward-ledger")["USERS_COLLECTION"];

beforeAll(async () => {
	({ createRewardLedger, USERS_COLLECTION } = await import("../reward-ledger"));
});

beforeEach(() => {
	collectionMock.mockReset();
	docMock.mockReset();
	setDocMock.mockReset();
	fromMaybeMillisMock.mockReset();

	collectionMock.mockImplementation((_firestore, path) => ({ path }));
	docMock.mockImplementation((_collection, id) => ({ id }));
	setDocMock.mockResolvedValue(undefined);
	fromMaybeMillisMock.mockImplementation((value) => `timestamp:${value}`);
});

describe("createRewardLedger.markRedeemed", () => {
	it("persists giftReceivedAt timestamp with merge semantics", async () => {
		const ledger = createRewardLedger(JSON.parse("{}"));

		const result = await ledger.markRedeemed({
			attendeeId: "guest-123",
			redeemedAt: 1_700_000_600_000,
		});

		expect(result.isOk()).toBe(true);
		expect(fromMaybeMillisMock).toHaveBeenCalledWith(1_700_000_600_000);
		expect(collectionMock).toHaveBeenCalledWith(
			expect.anything(),
			USERS_COLLECTION,
		);
		expect(docMock).toHaveBeenCalledWith(expect.anything(), "guest-123");
		expect(setDocMock).toHaveBeenCalledWith(
			expect.objectContaining({ id: "guest-123" }),
			{
				giftReceivedAt: "timestamp:1700000600000",
			},
			{ merge: true },
		);
	});

	it("wraps Firestore failures in RewardLedgerError", async () => {
		setDocMock.mockRejectedValue(new Error("write failure"));
		const ledger = createRewardLedger(JSON.parse("{}"));

		const result = await ledger.markRedeemed({
			attendeeId: "guest-error",
			redeemedAt: 1_700_000_700_000,
		});

		expect(result.isErr()).toBe(true);
		const error = result._unsafeUnwrapErr();
		expect(RewardLedgerError.isFn(error)).toBe(true);
		expect(error.extra?.operation).toBe("markRedeemed");
	});
});
