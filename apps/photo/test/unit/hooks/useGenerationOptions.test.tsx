import { act, render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const unsubscribeMock = vi.fn();
const collectionMock = vi.fn();
const onSnapshotMock = vi.fn(() => unsubscribeMock);

vi.mock("@/lib/firebase/client", () => ({
	getFirebaseFirestore: () => ({ name: "firestore" }),
	initializeFirebaseClient: vi.fn(),
}));

vi.mock("firebase/firestore", () => ({
	collection: (...args: unknown[]) => collectionMock(...args),
	onSnapshot: (...args: unknown[]) => onSnapshotMock(...args),
}));

describe("useGenerationOptions", () => {
	beforeEach(() => {
		unsubscribeMock.mockClear();
		collectionMock.mockReset();
		onSnapshotMock.mockReset();
	});

	it("subscribes to options collection and groups by typeId", async () => {
		const optionsCollectionRef = { path: "options" };
		const snapshotListeners: Array<(snapshot: unknown) => void> = [];

		collectionMock.mockImplementation((firestore, collectionName) => {
			expect(firestore).toEqual({ name: "firestore" });
			expect(collectionName).toBe("options");
			return optionsCollectionRef;
		});

		onSnapshotMock.mockImplementation((ref, listener) => {
			expect(ref).toBe(optionsCollectionRef);
			snapshotListeners.push(listener);
			return unsubscribeMock;
		});

		const { useGenerationOptions } = await import("@/hooks/useGenerationOptions");
		let state: ReturnType<typeof useGenerationOptions> | undefined;

		const TestComponent = () => {
			state = useGenerationOptions();
			return null;
		};

		render(<TestComponent />);

		expect(state?.isLoading).toBe(true);

		const snapshot = {
			docs: [
				{
					id: "location-1",
					data: () => ({
						typeId: "location",
						displayName: "Campus",
						imageUrl: null,
						imagePath: null,
					}),
				},
				{
					id: "style-1",
					data: () => ({
						typeId: "style",
						displayName: "Vivid",
						imageUrl: null,
						imagePath: null,
					}),
				},
				{
					id: "location-2",
					data: () => ({
						typeId: "location",
						displayName: "Hall",
						imageUrl: null,
						imagePath: null,
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
			expect(state?.options).toEqual({
				location: [
					{
						id: "location-1",
						typeId: "location",
						displayName: "Campus",
						imageUrl: null,
						imagePath: null,
					},
					{
						id: "location-2",
						typeId: "location",
						displayName: "Hall",
						imageUrl: null,
						imagePath: null,
					},
				],
				style: [
					{
						id: "style-1",
						typeId: "style",
						displayName: "Vivid",
						imageUrl: null,
						imagePath: null,
					},
				],
			});
		});
	});

	it("unsubscribes when component unmounts", async () => {
		const optionsCollectionRef = { path: "options" };
		collectionMock.mockReturnValue(optionsCollectionRef);
		onSnapshotMock.mockReturnValue(unsubscribeMock);

		const { useGenerationOptions } = await import("@/hooks/useGenerationOptions");

		const TestComponent = () => {
			useGenerationOptions();
			return null;
		};

		const { unmount } = render(<TestComponent />);
		unmount();

		expect(unsubscribeMock).toHaveBeenCalled();
	});
});
