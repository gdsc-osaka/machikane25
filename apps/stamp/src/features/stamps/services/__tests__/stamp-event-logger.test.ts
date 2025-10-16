import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { logStampEvent } from "../stamp-event-logger";

const addMock = vi.fn();
const nestedCollectionMock = vi.fn(() => ({ add: addMock }));
const docMock = vi.fn(() => ({ collection: nestedCollectionMock }));
const collectionMock = vi.fn(() => ({ doc: docMock }));

vi.mock("@/lib/firebase/admin", () => ({
	getAdminFirestore: () => ({ collection: collectionMock }),
}));

describe("logStampEvent", () => {
	const originalNow = Date.now;

	beforeEach(() => {
		Date.now = vi.fn(() => 1700000000000);
		addMock.mockClear();
		nestedCollectionMock.mockClear();
		docMock.mockClear();
		collectionMock.mockClear();
	});

	afterEach(() => {
		Date.now = originalNow;
	});

	it("writes an event document with defaults", async () => {
		await logStampEvent("uid-1", { status: "invalid" });

		expect(collectionMock).toHaveBeenCalledWith("users");
		expect(docMock).toHaveBeenCalledWith("uid-1");
		expect(nestedCollectionMock).toHaveBeenCalledWith("stampEvents");
		expect(addMock).toHaveBeenCalledWith({
			stampId: null,
			status: "invalid",
			maintenanceStatus: "online",
			createdAt: 1700000000000,
		});
	});

	it("persists provided stampId and maintenance status", async () => {
		await logStampEvent("uid-2", {
			stampId: "reception",
			status: "granted",
			maintenanceStatus: "degraded",
		});

		expect(addMock).toHaveBeenLastCalledWith({
			stampId: "reception",
			status: "granted",
			maintenanceStatus: "degraded",
			createdAt: 1700000000000,
		});
	});
});
