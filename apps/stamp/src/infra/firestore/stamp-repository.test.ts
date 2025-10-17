import { beforeEach, describe, expect, test, vi } from "vitest";
import { createStampRepository } from "./stamp-repository";
import { createEmptyLedger } from "@/domain/stamp";

const docMock = vi.fn();
const getDocMock = vi.fn();
const setDocMock = vi.fn();

vi.mock("firebase/firestore", () => ({
	doc: (...args: Array<unknown>) => docMock(...args),
	getDoc: (...args: Array<unknown>) => getDocMock(...args),
	setDoc: (...args: Array<unknown>) => setDocMock(...args),
}));

const FIRESTORE = { name: "firestore-instance" } as never;
const COLLECTION = "users";

describe("stamp repository (infra)", () => {
	beforeEach(() => {
		docMock.mockReset();
		getDocMock.mockReset();
		setDocMock.mockReset();
	});

	test("returns null when user document does not exist", async () => {
		docMock.mockReturnValueOnce({ id: "doc-ref" });
		getDocMock.mockResolvedValueOnce({
			exists: () => false,
		});

		const repository = createStampRepository({
			firestore: FIRESTORE,
			collectionPath: COLLECTION,
		});

		const result = await repository.getByUserId("guest-1");
		expect(result).toBeNull();
		expect(docMock).toHaveBeenCalledWith(FIRESTORE, COLLECTION, "guest-1");
	});

	test("parses ledger values from existing document", async () => {
		docMock.mockReturnValueOnce({ id: "doc-ref" });
		getDocMock.mockResolvedValueOnce({
			exists: () => true,
			data: () => ({
				createdAt: 1,
				lastCollectedAt: 2,
				stamps: {
					reception: 3,
					photobooth: null,
					robot: "invalid",
				},
			}),
		});

		const repository = createStampRepository({
			firestore: FIRESTORE,
			collectionPath: COLLECTION,
		});

		const result = await repository.getByUserId("guest-2");
		expect(result?.ledger.reception).toBe(3);
		expect(result?.ledger.photobooth).toBeNull();
		expect(result?.ledger.robot).toBeNull();
		expect(result?.createdAt).toBe(1);
		expect(result?.lastCollectedAt).toBe(2);
	});

	test("saves ledger data with fallback creation timestamp", async () => {
		docMock.mockReturnValue({ id: "doc-ref" });
		getDocMock.mockResolvedValue({
			exists: () => false,
		});
		setDocMock.mockResolvedValue(undefined);

		const repository = createStampRepository({
			firestore: FIRESTORE,
			collectionPath: COLLECTION,
		});
		const ledger = createEmptyLedger();
		ledger.reception = 100;

		await repository.save({
			userId: "guest-3",
			ledger,
			collectedAt: 100,
		});

		expect(setDocMock).toHaveBeenCalledWith(
			{ id: "doc-ref" },
			expect.objectContaining({
				stamps: ledger,
				lastCollectedAt: 100,
			}),
		);
	});

	test("preserves existing collected timestamp when none provided", async () => {
		docMock.mockReturnValue({ id: "doc-ref" });
		getDocMock.mockResolvedValueOnce({
			exists: () => true,
			data: () => ({
				createdAt: 10,
				lastCollectedAt: 20,
				stamps: {
					reception: 10,
					photobooth: null,
					art: null,
					robot: null,
					survey: null,
				},
			}),
		});
		setDocMock.mockResolvedValue(undefined);

		const repository = createStampRepository({
			firestore: FIRESTORE,
			collectionPath: COLLECTION,
		});

		const ledger = createEmptyLedger();
		ledger.photobooth = 30;

		await repository.save({
			userId: "guest-4",
			ledger,
			collectedAt: null,
		});

		expect(setDocMock).toHaveBeenCalledWith(
			{ id: "doc-ref" },
			expect.objectContaining({
				lastCollectedAt: 20,
			}),
		);
	});
});
