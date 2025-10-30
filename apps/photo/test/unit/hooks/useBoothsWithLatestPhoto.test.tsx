import { act, render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
	initializeFirebaseClientMock,
	ensureAnonymousSignInMock,
	getFirebaseFirestoreMock,
	collectionMock,
	onSnapshotMock,
	docMock,
	getDocMock,
	unsubscribeMock,
} = vi.hoisted(() => ({
	initializeFirebaseClientMock: vi.fn(),
	ensureAnonymousSignInMock: vi.fn(),
	getFirebaseFirestoreMock: vi.fn(),
	collectionMock: vi.fn(),
	onSnapshotMock: vi.fn(),
	docMock: vi.fn(),
	getDocMock: vi.fn(),
	unsubscribeMock: vi.fn(),
}));

class MockTimestamp {
	constructor(private readonly value: Date) {}

	toDate(): Date {
		return this.value;
	}

	static fromDate(date: Date) {
		return new MockTimestamp(date);
	}
}

vi.mock("@/lib/firebase/client", () => ({
	initializeFirebaseClient: initializeFirebaseClientMock,
	ensureAnonymousSignIn: ensureAnonymousSignInMock,
	getFirebaseFirestore: getFirebaseFirestoreMock,
}));

vi.mock("firebase/firestore", () => ({
	collection: collectionMock,
	onSnapshot: onSnapshotMock,
	doc: docMock,
	getDoc: getDocMock,
	Timestamp: MockTimestamp,
}));

describe("useBoothsWithLatestPhoto", () => {
	beforeEach(() => {
		initializeFirebaseClientMock.mockReset();
		ensureAnonymousSignInMock.mockReset();
		getFirebaseFirestoreMock.mockReset();
		collectionMock.mockReset();
		onSnapshotMock.mockReset();
		docMock.mockReset();
		getDocMock.mockReset();
		unsubscribeMock.mockReset();

		ensureAnonymousSignInMock.mockResolvedValue({ uid: "anon-user" });
		getFirebaseFirestoreMock.mockReturnValue({ name: "firestore" });
		collectionMock.mockImplementation((firestore, path: string) => {
			expect(firestore).toEqual({ name: "firestore" });
			expect(path).toBe("booths");
			return { path: "booths-collection" };
		});
		onSnapshotMock.mockImplementation(
			(
				_ref: unknown,
				next: (snapshot: unknown) => void,
				error?: (reason: Error) => void,
			) => {
				expect(typeof next).toBe("function");
				if (error) {
					expect(typeof error).toBe("function");
				}
				return unsubscribeMock;
			},
		);
		docMock.mockImplementation(
			(_firestore, segmentOne: string, segmentTwo: string, ...rest: string[]) => ({
				path: [segmentOne, segmentTwo, ...rest].join("/"),
			}),
		);
	});

	it("subscribes to booths and resolves latest photos", async () => {
		getDocMock.mockImplementation(async (ref: { path: string }) => {
			if (ref.path === "booths/booth-1/generatedPhotos/photo-1") {
				return {
					exists: () => true,
					data: () => ({
						imageUrl: "https://example.com/photo-1.png",
						createdAt: MockTimestamp.fromDate(
							new Date("2025-01-01T10:00:00Z"),
						),
					}),
				};
			}
			return {
				exists: () => false,
				data: () => ({}),
			};
		});

		const snapshotListeners: Array<(snapshot: unknown) => void> = [];
		onSnapshotMock.mockImplementation(
			(
				_ref: unknown,
				next: (snapshot: unknown) => void,
				error?: (reason: Error) => void,
			) => {
				snapshotListeners.push(next);
				return unsubscribeMock;
			},
		);

		const { useBoothsWithLatestPhoto } = await import(
			"@/hooks/useBoothsWithLatestPhoto"
		);
		let state: ReturnType<typeof useBoothsWithLatestPhoto> | undefined;

		const TestComponent = () => {
			state = useBoothsWithLatestPhoto();
			return null;
		};

		render(<TestComponent />);

		expect(state?.isLoading).toBe(true);
		expect(initializeFirebaseClientMock).toHaveBeenCalled();
		expect(ensureAnonymousSignInMock).toHaveBeenCalled();

		await waitFor(() => {
			expect(collectionMock).toHaveBeenCalled();
			expect(onSnapshotMock).toHaveBeenCalled();
		});

		const snapshot = {
			docs: [
				{
					id: "booth-1",
					data: () => ({
						latestPhotoId: "photo-1",
					}),
				},
				{
					id: "booth-2",
					data: () => ({
						latestPhotoId: null,
					}),
				},
			],
		};

		const [listener] = snapshotListeners;
		expect(listener).toBeDefined();
		if (listener) {
			await act(async () => {
				await listener(snapshot);
			});
		}

		await waitFor(() => {
			expect(state?.isLoading).toBe(false);
			expect(state?.error).toBeNull();
			expect(state?.booths).toEqual([
				{
					boothId: "booth-1",
					latestPhoto: {
						photoId: "photo-1",
						imageUrl: "https://example.com/photo-1.png",
						createdAt: new Date("2025-01-01T10:00:00.000Z"),
					},
				},
				{
					boothId: "booth-2",
					latestPhoto: null,
				},
			]);
		});
	});

	it("records initialization error when Firebase setup fails", async () => {
		ensureAnonymousSignInMock.mockRejectedValueOnce(
			new Error("permission denied"),
		);

		const { useBoothsWithLatestPhoto } = await import(
			"@/hooks/useBoothsWithLatestPhoto"
		);
		let state: ReturnType<typeof useBoothsWithLatestPhoto> | undefined;

		const TestComponent = () => {
			state = useBoothsWithLatestPhoto();
			return null;
		};

		render(<TestComponent />);

		await waitFor(() => {
			expect(state?.isLoading).toBe(false);
			expect(state?.error?.message).toBe("permission denied");
			expect(state?.booths).toEqual([]);
		});
	});

	it("cleans up snapshot subscription on unmount", async () => {
		onSnapshotMock.mockReturnValue(unsubscribeMock);

		const { useBoothsWithLatestPhoto } = await import(
			"@/hooks/useBoothsWithLatestPhoto"
		);

		const TestComponent = () => {
			useBoothsWithLatestPhoto();
			return null;
		};

		const { unmount } = render(<TestComponent />);
		await waitFor(() => {
			expect(onSnapshotMock).toHaveBeenCalled();
		});

		unmount();

		expect(unsubscribeMock).toHaveBeenCalled();
	});
});
