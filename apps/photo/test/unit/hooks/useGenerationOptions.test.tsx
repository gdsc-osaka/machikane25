import { act, render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const unsubscribeMock = vi.fn();
const collectionMock = vi.fn();
const onSnapshotMock = vi.fn();

vi.mock("@/lib/firebase/client", () => ({
	getFirebaseFirestore: () => ({ name: "firestore" }),
	initializeFirebaseClient: vi.fn(),
}));

vi.mock("firebase/firestore", () => ({
	collection: collectionMock,
	onSnapshot: onSnapshotMock,
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

		onSnapshotMock.mockImplementation(
			(ref: unknown, listener: (snapshot: unknown) => void) => {
				expect(ref).toBe(optionsCollectionRef);
				snapshotListeners.push(listener);
				return unsubscribeMock;
			},
		);

		const { useGenerationOptions } = await import(
			"@/hooks/useGenerationOptions"
		);
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

		const { useGenerationOptions } = await import(
			"@/hooks/useGenerationOptions"
		);

		const TestComponent = () => {
			useGenerationOptions();
			return null;
		};

		const { unmount } = render(<TestComponent />);
		unmount();

		expect(unsubscribeMock).toHaveBeenCalled();
	});

	it("handles snapshot errors correctly", async () => {
		const optionsCollectionRef = { path: "options" };
		const errorListeners: Array<(error: Error) => void> = [];

		collectionMock.mockReturnValue(optionsCollectionRef);
		onSnapshotMock.mockImplementation(
			(
				_ref: unknown,
				_successListener: (snapshot: unknown) => void,
				errorListener: (error: Error) => void,
			) => {
				errorListeners.push(errorListener);
				return unsubscribeMock;
			},
		);

		const { useGenerationOptions } = await import(
			"@/hooks/useGenerationOptions"
		);
		let state: ReturnType<typeof useGenerationOptions> | undefined;

		const TestComponent = () => {
			state = useGenerationOptions();
			return null;
		};

		render(<TestComponent />);

		const testError = new Error("Firestore connection failed");
		const [errorListener] = errorListeners;
		expect(errorListener).toBeDefined();

		if (errorListener) {
			act(() => {
				errorListener(testError);
			});
		}

		await waitFor(() => {
			expect(state?.isLoading).toBe(false);
			expect(state?.error).toBe(testError);
		});
	});

	it("resetOptions clears state and sets loading to true", async () => {
		const optionsCollectionRef = { path: "options" };
		const snapshotListeners: Array<(snapshot: unknown) => void> = [];

		collectionMock.mockReturnValue(optionsCollectionRef);
		onSnapshotMock.mockImplementation(
			(_ref: unknown, listener: (snapshot: unknown) => void) => {
				snapshotListeners.push(listener);
				return unsubscribeMock;
			},
		);

		const { useGenerationOptions } = await import(
			"@/hooks/useGenerationOptions"
		);
		let state: ReturnType<typeof useGenerationOptions> | undefined;
		const TestComponent = () => {
			state = useGenerationOptions();
			return null;
		};

		render(<TestComponent />);

		// 初期データを設定
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
			],
		};

		const [listener] = snapshotListeners;
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
				],
			});
		});

		// resetOptionsを呼び出す
		act(() => {
			state?.resetOptions();
		});

		await waitFor(() => {
			expect(state?.options).toEqual({});
			expect(state?.isLoading).toBe(true);
			expect(state?.error).toBeNull();
		});
	});

	it("handles invalid data types gracefully", async () => {
		const optionsCollectionRef = { path: "options" };
		const snapshotListeners: Array<(snapshot: unknown) => void> = [];

		collectionMock.mockReturnValue(optionsCollectionRef);
		onSnapshotMock.mockImplementation(
			(_ref: unknown, listener: (snapshot: unknown) => void) => {
				snapshotListeners.push(listener);
				return unsubscribeMock;
			},
		);

		const { useGenerationOptions } = await import(
			"@/hooks/useGenerationOptions"
		);
		let state: ReturnType<typeof useGenerationOptions> | undefined;

		const TestComponent = () => {
			state = useGenerationOptions();
			return null;
		};

		render(<TestComponent />);

		// 不正なデータ型を含むスナップショット
		const snapshot = {
			docs: [
				{
					id: "invalid-1",
					data: () => ({
						typeId: 123, // 数値（文字列であるべき）
						displayName: null, // null（文字列であるべき）
						imageUrl: ["not", "a", "string"], // 配列（文字列またはnullであるべき）
						imagePath: { invalid: "object" }, // オブジェクト（文字列またはnullであるべき）
					}),
				},
				{
					id: "valid-1",
					data: () => ({
						typeId: "location",
						displayName: "Campus",
						imageUrl: "https://example.com/image.jpg",
						imagePath: "/path/to/image",
					}),
				},
			],
		};

		const [listener] = snapshotListeners;
		if (listener) {
			act(() => {
				listener(snapshot);
			});
		}

		await waitFor(() => {
			expect(state?.isLoading).toBe(false);
			expect(state?.options).toEqual({
				unknown: [
					{
						id: "invalid-1",
						typeId: "unknown",
						displayName: "",
						imageUrl: null,
						imagePath: null,
					},
				],
				location: [
					{
						id: "valid-1",
						typeId: "location",
						displayName: "Campus",
						imageUrl: "https://example.com/image.jpg",
						imagePath: "/path/to/image",
					},
				],
			});
		});
	});

	it("groups multiple options with the same typeId together", async () => {
		const optionsCollectionRef = { path: "options" };
		const snapshotListeners: Array<(snapshot: unknown) => void> = [];

		collectionMock.mockReturnValue(optionsCollectionRef);
		onSnapshotMock.mockImplementation(
			(_ref: unknown, listener: (snapshot: unknown) => void) => {
				snapshotListeners.push(listener);
				return unsubscribeMock;
			},
		);

		const { useGenerationOptions } = await import(
			"@/hooks/useGenerationOptions"
		);
		let state: ReturnType<typeof useGenerationOptions> | undefined;

		const TestComponent = () => {
			state = useGenerationOptions();
			return null;
		};

		render(<TestComponent />);

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
					id: "location-2",
					data: () => ({
						typeId: "location",
						displayName: "Hall",
						imageUrl: null,
						imagePath: null,
					}),
				},
				{
					id: "location-3",
					data: () => ({
						typeId: "location",
						displayName: "Library",
						imageUrl: null,
						imagePath: null,
					}),
				},
			],
		};

		const [listener] = snapshotListeners;
		if (listener) {
			act(() => {
				listener(snapshot);
			});
		}

		await waitFor(() => {
			expect(state?.isLoading).toBe(false);
			expect(state?.options.location).toHaveLength(3);
			expect(state?.options.location?.map((opt) => opt.displayName)).toEqual([
				"Campus",
				"Hall",
				"Library",
			]);
		});
	});

	it("does not update state after unmount", async () => {
		const optionsCollectionRef = { path: "options" };
		const snapshotListeners: Array<(snapshot: unknown) => void> = [];

		collectionMock.mockReturnValue(optionsCollectionRef);
		onSnapshotMock.mockImplementation(
			(_ref: unknown, listener: (snapshot: unknown) => void) => {
				snapshotListeners.push(listener);
				return unsubscribeMock;
			},
		);

		const { useGenerationOptions } = await import(
			"@/hooks/useGenerationOptions"
		);

		const TestComponent = () => {
			useGenerationOptions();
			return null;
		};

		const { unmount } = render(<TestComponent />);

		// コンポーネントをアンマウント
		unmount();

		// アンマウント後にスナップショットを送信
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
			],
		};

		const [listener] = snapshotListeners;
		if (listener) {
			// アンマウント後にリスナーが呼ばれても、状態更新でエラーが発生しないことを確認
			expect(() => {
				act(() => {
					listener(snapshot);
				});
			}).not.toThrow();
		}
	});
});
