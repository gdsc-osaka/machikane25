import { act, render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const unsubscribeMock = vi.fn();
const docMock = vi.fn();
const onSnapshotMock = vi.fn();
const getDocMock = vi.fn();
const ensureAnonymousSignInMock = vi.fn();

class MockTimestamp {
	constructor(private readonly value: Date) {}

	toDate(): Date {
		return this.value;
	}

	static fromDate(date: Date): MockTimestamp {
		return new MockTimestamp(date);
	}
}

vi.mock("@/lib/firebase/client", () => ({
	getFirebaseFirestore: () => ({ name: "firestore" }),
	initializeFirebaseClient: vi.fn(),
	ensureAnonymousSignIn: ensureAnonymousSignInMock,
}));

vi.mock("firebase/firestore", () => ({
	doc: docMock,
	onSnapshot: onSnapshotMock,
	getDoc: getDocMock,
	Timestamp: MockTimestamp,
}));

describe("useBoothState", () => {
	beforeEach(() => {
		unsubscribeMock.mockClear();
		docMock.mockReset();
		onSnapshotMock.mockReset();
		getDocMock.mockReset();
		ensureAnonymousSignInMock.mockReset();
		ensureAnonymousSignInMock.mockResolvedValue({ uid: "anon-user" });
	});

	it("subscribes to booth document and returns state with latest photo URL", async () => {
		const boothDocRef = { path: "booths/booth-123" };
		const generatedDocRef = { path: "generatedPhotos/photo-555" };
		const boothSnapshotListeners: Array<(snapshot: unknown) => void> = [];

		docMock.mockImplementation((firestore, collection, docId) => {
			if (collection === "booths") {
				expect(firestore).toEqual({ name: "firestore" });
				expect(docId).toBe("booth-123");
				return boothDocRef;
			}
			if (collection === "generatedPhotos") {
				expect(docId).toBe("photo-555");
				return generatedDocRef;
			}
			throw new Error("Unexpected doc call");
		});

		onSnapshotMock.mockImplementation((_ref: unknown, listener: (snapshot: unknown) => void) => {
			boothSnapshotListeners.push(listener);
			return unsubscribeMock;
		});

		getDocMock.mockResolvedValue({
			exists: () => true,
			data: () => ({
				imageUrl: "https://example.com/generated.png",
			}),
		});

		const { useBoothState } = await import("@/hooks/useBoothState");
		let currentState: ReturnType<typeof useBoothState> | undefined;

		const TestComponent = () => {
			currentState = useBoothState("booth-123");
			return null;
		};

		render(<TestComponent />);

		await waitFor(() => {
			expect(onSnapshotMock).toHaveBeenCalledWith(
				boothDocRef,
				expect.any(Function),
				expect.any(Function),
			);
		});

		expect(currentState?.isLoading).toBe(true);

		const timestamp = MockTimestamp.fromDate(new Date("2025-01-01T00:00:00Z"));
		const boothSnapshot = {
			exists: () => true,
			data: () => ({
				id: "booth-123",
				state: "menu",
				latestPhotoId: "photo-555",
				lastTakePhotoAt: timestamp,
			}),
		};

		const [listener] = boothSnapshotListeners;
		expect(listener).toBeDefined();
		if (listener) {
			act(() => {
				listener(boothSnapshot);
			});
		}

		await waitFor(() => {
			expect(currentState?.isLoading).toBe(false);
			expect(currentState?.booth?.state).toBe("menu");
			expect(currentState?.booth?.lastTakePhotoAt?.toISOString()).toBe("2025-01-01T00:00:00.000Z");
			expect(currentState?.latestGeneratedPhotoUrl).toBe("https://example.com/generated.png");
		});

		expect(getDocMock).toHaveBeenCalledWith(generatedDocRef);
	});

	it("cleans up subscription on unmount", async () => {
		const boothDocRef = { path: "booths/booth-999" };
		docMock.mockReturnValue(boothDocRef);
		onSnapshotMock.mockReturnValue(unsubscribeMock);

		const { useBoothState } = await import("@/hooks/useBoothState");
		let currentState: ReturnType<typeof useBoothState> | undefined;

		const TestComponent = () => {
			currentState = useBoothState("booth-999");
			return null;
		};

		const { unmount } = render(<TestComponent />);

		await waitFor(() => {
			expect(onSnapshotMock).toHaveBeenCalled();
		});

		expect(currentState?.isLoading).toBe(true);
		unmount();
		expect(unsubscribeMock).toHaveBeenCalled();
	});
});
