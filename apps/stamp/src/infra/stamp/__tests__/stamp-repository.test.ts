import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
	type PersistStampLedgerInput,
	StampRepositoryError,
} from "@/domain/stamp";

type CollectionRef = { withConverter: (converter: unknown) => unknown };

type DocRef = { id: string };

const collectionMock =
	vi.fn<(firestore: unknown, path: string) => CollectionRef>();
const docMock = vi.fn<(collection: unknown, id: string) => DocRef>();
const getDocMock = vi.fn();
const setDocMock = vi.fn();

vi.mock("firebase/firestore", () => ({
	collection: collectionMock,
	doc: docMock,
	getDoc: getDocMock,
	setDoc: setDocMock,
}));

let createStampRepository: typeof import("../stamp-repository")["createStampRepository"];

beforeAll(async () => {
	({ createStampRepository } = await import("../stamp-repository"));
});

beforeEach(() => {
	collectionMock.mockClear();
	collectionMock.mockImplementation((_firestore, path) => ({
		withConverter: (converter: unknown) => ({ path, converter }),
	}));
	docMock.mockClear();
	docMock.mockImplementation((_collectionRef, documentId) => ({
		id: documentId,
	}));
	getDocMock.mockReset();
	setDocMock.mockReset();
});

describe("createStampRepository.getByUserId", () => {
	it("returns snapshot data when document exists", async () => {
		getDocMock.mockResolvedValue({
			id: "guest-1",
			exists: () => true,
			data: () => ({
				ledger: {
					reception: null,
					photobooth: 100,
					art: null,
					robot: null,
					survey: null,
				},
				createdAt: 1_700_000_000_000,
				lastCollectedAt: 1_700_000_123_000,
			}),
		});

		const repository = createStampRepository({} as never);
		const result = await repository.getByUserId("guest-1");

		expect(result.isOk()).toBe(true);
		const snapshot = result._unsafeUnwrap();
		expect(snapshot?.userId).toBe("guest-1");
		expect(snapshot?.createdAt).toBe(1_700_000_000_000);
		expect(snapshot?.ledger.photobooth).toBe(100);
	});

	it("returns null when document does not exist", async () => {
		getDocMock.mockResolvedValue({
			exists: () => false,
			data: () => ({}),
			id: "guest-2",
		});

		const repository = createStampRepository({} as never);
		const result = await repository.getByUserId("guest-2");

		expect(result.isOk()).toBe(true);
		expect(result._unsafeUnwrap()).toBeNull();
	});

	it("wraps Firestore errors using StampRepositoryError", async () => {
		getDocMock.mockRejectedValue(new Error("boom"));

		const repository = createStampRepository({} as never);
		const result = await repository.getByUserId("guest-3");

		expect(result.isErr()).toBe(true);
		const error = result._unsafeUnwrapErr();
		expect(StampRepositoryError.isFn(error)).toBe(true);
		expect(error.extra?.operation).toBe("get");
	});
});

describe("createStampRepository.save", () => {
	const baseInput: PersistStampLedgerInput = {
		userId: "guest-10",
		ledger: {
			reception: null,
			photobooth: null,
			art: null,
			robot: null,
			survey: null,
		},
		collectedAt: 1_700_000_000_500,
		createdAt: 1_700_000_000_000,
		lastCollectedAt: 1_700_000_000_500,
	};

	it("persists document through setDoc", async () => {
		setDocMock.mockResolvedValue(undefined);

		const repository = createStampRepository({} as never);
		const result = await repository.save(baseInput);

		expect(result.isOk()).toBe(true);
		expect(setDocMock).toHaveBeenCalledTimes(1);
		const payload = setDocMock.mock.calls[0]?.[1] as { createdAt: number };
		expect(payload.createdAt).toBe(1_700_000_000_000);
		expect(setDocMock.mock.calls[0]?.[2]).toEqual({ merge: true });
	});

	it("wraps Firestore errors when setDoc fails", async () => {
		setDocMock.mockRejectedValue(new Error("persist failure"));

		const repository = createStampRepository({} as never);
		const result = await repository.save(baseInput);

		expect(result.isErr()).toBe(true);
		const error = result._unsafeUnwrapErr();
		expect(StampRepositoryError.isFn(error)).toBe(true);
		expect(error.extra?.operation).toBe("save");
	});
});
