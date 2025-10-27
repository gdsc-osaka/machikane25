import { act, render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const unsubscribeMock = vi.fn();
const collectionMock = vi.fn();
const queryMock = vi.fn();
const orderByMock = vi.fn();
const onSnapshotMock = vi.fn();
const ensureAnonymousSignInMock = vi.fn();

vi.mock("@/lib/firebase/client", () => ({
	getFirebaseFirestore: () => ({ name: "firestore" }),
	initializeFirebaseClient: vi.fn(),
	ensureAnonymousSignIn: ensureAnonymousSignInMock,
}));

vi.mock("firebase/firestore", () => ({
	collection: collectionMock,
	query: queryMock,
	orderBy: orderByMock,
	onSnapshot: onSnapshotMock,
}));

describe("useUploadedPhotos", () => {
	beforeEach(() => {
		unsubscribeMock.mockClear();
		collectionMock.mockReset();
		queryMock.mockReset();
		orderByMock.mockReset();
		onSnapshotMock.mockReset();
		ensureAnonymousSignInMock.mockReset();
		ensureAnonymousSignInMock.mockResolvedValue({ uid: "anon-user" });
	});

	it("subscribes to uploaded photos collection and maps data", async () => {
		const photosCollectionRef = { path: "booths/booth-42/uploadedPhotos" };
		const queryRef = { kind: "query" };
		const snapshotListeners: Array<(snapshot: unknown) => void> = [];

		collectionMock.mockImplementation((firestore, ...segments: unknown[]) => {
			expect(firestore).toEqual({ name: "firestore" });
			expect(segments).toEqual(["booths", "booth-42", "uploadedPhotos"]);
			return photosCollectionRef;
		});

		orderByMock.mockImplementation((field, direction) => {
			expect(field).toBe("createdAt");
			expect(direction).toBe("desc");
			return { field, direction };
		});

		queryMock.mockImplementation((ref, order) => {
			expect(ref).toBe(photosCollectionRef);
			expect(order).toEqual({ field: "createdAt", direction: "desc" });
			return queryRef;
		});

		onSnapshotMock.mockImplementation((ref: unknown, listener: (snapshot: unknown) => void) => {
			expect(ref).toBe(queryRef);
			snapshotListeners.push(listener);
			return unsubscribeMock;
		});

		const { useUploadedPhotos } = await import("@/hooks/useUploadedPhotos");
		let state: ReturnType<typeof useUploadedPhotos> | undefined;

		const TestComponent = () => {
			state = useUploadedPhotos("booth-42");
			return null;
		};

		render(<TestComponent />);

		await waitFor(() => {
			expect(onSnapshotMock).toHaveBeenCalled();
		});

		expect(state?.isLoading).toBe(true);

		const snapshot = {
			docs: [
				{
					id: "photo-1",
					data: () => ({
						imageUrl: "https://cdn/photo-1.png",
						imagePath: "photos/photo-1/photo.png",
					}),
				},
				{
					id: "photo-2",
					data: () => ({
						imageUrl: "https://cdn/photo-2.png",
						imagePath: "photos/photo-2/photo.png",
					}),
				},
			],
		};

		const [listener] = snapshotListeners;
		expect(listener).toBeDefined();
		if (listener) {
			act(() => {
				listener(snapshot);
			});
		}

		await waitFor(() => {
			expect(state?.isLoading).toBe(false);
			expect(state?.photos).toEqual([
				{
					photoId: "photo-1",
					imageUrl: "https://cdn/photo-1.png",
					imagePath: "photos/photo-1/photo.png",
				},
				{
					photoId: "photo-2",
					imageUrl: "https://cdn/photo-2.png",
					imagePath: "photos/photo-2/photo.png",
				},
			]);
		});
	});

	it("unsubscribes on unmount", async () => {
		const photosCollectionRef = { path: "booths/booth-77/uploadedPhotos" };
		const queryRef = { kind: "query" };

		collectionMock.mockReturnValue(photosCollectionRef);
		orderByMock.mockReturnValue({ field: "createdAt", direction: "desc" });
		queryMock.mockReturnValue(queryRef);
		onSnapshotMock.mockReturnValue(unsubscribeMock);

		const { useUploadedPhotos } = await import("@/hooks/useUploadedPhotos");

		const TestComponent = () => {
			useUploadedPhotos("booth-77");
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
