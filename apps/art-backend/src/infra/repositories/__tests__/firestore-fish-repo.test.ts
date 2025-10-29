import { Timestamp } from "firebase-admin/firestore";
import { describe, expect, test } from "vitest";
import type { FishDocument } from "../../../domain/fish/fish.js";
import { createFish } from "../../../domain/fish/fish.js";
import { RepositoryError } from "../../../errors/infrastructure-errors.js";
import {
	createFirestoreFishRepository,
	type FirestoreDeps,
} from "../firestore-fish-repo.js";

const fishConverter = {
	toFirestore: (fish: FishDocument) => ({
		imageUrl: fish.imageUrl,
		imagePath: fish.imagePath,
		color: fish.color,
		createdAt: fish.createdAt,
	}),
	fromFirestore: (snapshot: {
		data(): Omit<FishDocument, "id">;
		id: string;
	}) => {
		const data = snapshot.data();
		return Object.freeze({
			id: snapshot.id,
			imageUrl: data.imageUrl,
			imagePath: data.imagePath,
			color: data.color,
			createdAt: data.createdAt,
		});
	},
} satisfies FirestoreDeps["converter"];

type SetOverride = Readonly<{
	set: (
		args: Readonly<{
			id: string;
			document: FishDocument;
		}>,
	) => Promise<void>;
}>;

type GetOverride = Readonly<{
	get: () => Promise<
		Readonly<{
			docs: ReadonlyArray<
				Readonly<{
					id: string;
					data: () => FishDocument;
				}>
			>;
		}>
	>;
}>;

const createFirestoreStub = (
	overrides?: Partial<SetOverride & GetOverride>,
) => {
	const store = new Map<string, FishDocument>();

	const setHandler =
		overrides?.set ??
		(async (params) => {
			store.set(params.id, params.document);
		});

	const getHandler =
		overrides?.get ??
		(async () => ({
			docs: Array.from(store.entries()).map(([docId, document]) =>
				Object.freeze({
					id: docId,
					data: () => document,
				}),
			),
		}));

	const firestore: FirestoreDeps["firestore"] = {
		collection: () =>
			Object.freeze({
				withConverter: () =>
					Object.freeze({
						doc: (id: string) =>
							Object.freeze({
								set: (document: FishDocument) =>
									setHandler({
										id,
										document,
									}),
							}),
						get: getHandler,
					}),
			}),
	};

	return Object.freeze({
		firestore,
		store,
	});
};

describe("createFirestoreFishRepository", () => {
	test("persists and retrieves fish entities", async () => {
		const stub = createFirestoreStub();
		const repo = createFirestoreFishRepository({
			firestore: stub.firestore,
			converter: fishConverter,
		});

		const fish = createFish({
			id: "fish-1",
			imageUrl: "https://storage/fish-1.png",
			imagePath: "fish_images/fish-1/fish.png",
			color: "#AABBCC",
			createdAt: new Date("2024-01-01T00:00:00.000Z"),
		});

		await repo.save(fish);

		const results = await repo.list();

		expect(results).toEqual([fish]);
		const stored = stub.store.get("fish-1");
		expect(stored?.createdAt).toBeInstanceOf(Timestamp);
	});

	test("wraps write failures in RepositoryError", async () => {
		const failure = new Error("firestore unavailable");
		const stub = createFirestoreStub({
			set: async () => {
				throw failure;
			},
		});

		const repo = createFirestoreFishRepository({
			firestore: stub.firestore,
			converter: fishConverter,
		});

		const fish = createFish({
			id: "fish-err",
			imageUrl: "https://storage/fish.png",
			imagePath: "fish_images/fish-err/fish.png",
			color: "#FFFFFF",
			createdAt: new Date(),
		});

		await expect(repo.save(fish)).rejects.toThrow(RepositoryError);
	});

	test("wraps read failures in RepositoryError", async () => {
		const failure = new Error("get failed");
		const stub = createFirestoreStub({
			get: async () => {
				throw failure;
			},
		});

		const repo = createFirestoreFishRepository({
			firestore: stub.firestore,
			converter: fishConverter,
		});

		await expect(repo.list()).rejects.toThrow(RepositoryError);
	});

	test("throws RepositoryError when stored data violates domain rules", async () => {
		const stub = createFirestoreStub();
		stub.store.set("corrupt", {
			id: "corrupt",
			imageUrl: "https://storage/corrupt.png",
			imagePath: "fish_images/corrupt/fish.png",
			color: "invalid-color",
			createdAt: Timestamp.fromDate(new Date()),
		});

		const repo = createFirestoreFishRepository({
			firestore: stub.firestore,
			converter: fishConverter,
		});

		await expect(repo.list()).rejects.toThrow(RepositoryError);
	});
});
