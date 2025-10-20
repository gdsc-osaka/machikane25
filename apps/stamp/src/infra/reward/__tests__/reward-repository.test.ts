import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { RewardRepositoryError } from "@/domain/reward";

type CollectionReference = { withConverter: (converter: unknown) => unknown };
type DocumentReference = { id: string };

const collectionMock =
	vi.fn<(firestore: unknown, path: string) => CollectionReference>();
const docMock = vi.fn<(collectionRef: unknown, id: string) => DocumentReference>();
const getDocMock = vi.fn();
const setDocMock = vi.fn();

vi.mock("firebase/firestore", () => ({
	collection: collectionMock,
	doc: docMock,
	getDoc: getDocMock,
	setDoc: setDocMock,
}));

let createRewardRepository: typeof import("../reward-repository")["createRewardRepository"];
let REWARDS_COLLECTION: typeof import("../reward-repository")["REWARDS_COLLECTION"];

beforeAll(async () => {
	({ createRewardRepository, REWARDS_COLLECTION } = await import(
		"../reward-repository"
	));
});

beforeEach(() => {
	collectionMock.mockReset();
	collectionMock.mockImplementation((_firestore, path) => ({
		withConverter: (converter: unknown) => ({ path, converter }),
	}));
	docMock.mockReset();
	docMock.mockImplementation((_collectionRef, id) => ({ id }));
	getDocMock.mockReset();
	setDocMock.mockReset();
});

describe("createRewardRepository.findByAttendeeId", () => {
	it("returns reward record when snapshot exists", async () => {
		getDocMock.mockResolvedValue({
			exists: () => true,
			data: () => ({
				attendeeId: "guest-1",
				qrPayload: "qr-123",
				issuedAt: 1_700_000_000_000,
				redeemedAt: null,
			}),
		});

		const repository = createRewardRepository({} as never);
		const result = await repository.findByAttendeeId("guest-1");

		expect(collectionMock).toHaveBeenCalledWith(expect.anything(), REWARDS_COLLECTION);
		expect(result.isOk()).toBe(true);
		const record = result._unsafeUnwrap();
		expect(record).not.toBeNull();
		expect(record?.attendeeId).toBe("guest-1");
		expect(record?.qrPayload).toBe("qr-123");
	});

	it("returns null when snapshot is missing", async () => {
		getDocMock.mockResolvedValue({
			exists: () => false,
			data: () => ({}),
		});

		const repository = createRewardRepository({} as never);
		const result = await repository.findByAttendeeId("guest-2");

		expect(result.isOk()).toBe(true);
		expect(result._unsafeUnwrap()).toBeNull();
	});

	it("wraps Firestore errors using RewardRepositoryError", async () => {
		getDocMock.mockRejectedValue(new Error("read failure"));

		const repository = createRewardRepository({} as never);
		const result = await repository.findByAttendeeId("guest-3");

		expect(result.isErr()).toBe(true);
		const error = result._unsafeUnwrapErr();
		expect(RewardRepositoryError.isFn(error)).toBe(true);
		expect(error.extra?.operation).toBe("find");
	});
});

describe("createRewardRepository.save", () => {
	const record = {
		attendeeId: "guest-10",
		qrPayload: "qr-987",
		issuedAt: 1_700_000_000_000,
		redeemedAt: null,
	};

	it("persists reward record with merge semantics", async () => {
		setDocMock.mockResolvedValue(undefined);

		const repository = createRewardRepository({} as never);
		const result = await repository.save(record);

		expect(result.isOk()).toBe(true);
		expect(setDocMock).toHaveBeenCalledTimes(1);
		expect(setDocMock.mock.calls[0]?.[2]).toEqual({ merge: true });
	});

	it("wraps Firestore errors when persisting fails", async () => {
		setDocMock.mockRejectedValue(new Error("write failure"));

		const repository = createRewardRepository({} as never);
		const result = await repository.save(record);

		expect(result.isErr()).toBe(true);
		const error = result._unsafeUnwrapErr();
		expect(RewardRepositoryError.isFn(error)).toBe(true);
		expect(error.extra?.operation).toBe("save");
	});
});
