import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/firebase/admin", () => ({
	getAdminFirestore: vi.fn(),
}));

import { getAdminFirestore } from "@/lib/firebase/admin";
import { logStampEvent } from "../stamp-event-logger";

const setupFirestore = () => {
	const add = vi.fn().mockResolvedValue(undefined);
	const stampEventsCollection = { add };
	const nestedCollection = vi.fn().mockReturnValue(stampEventsCollection);
	const doc = vi.fn().mockReturnValue({
		collection: nestedCollection,
	});
	const collection = vi.fn().mockImplementation((collectionName: string) => {
		if (collectionName !== "users") {
			throw new Error(`Unexpected collection name ${collectionName}`);
		}
		return { doc };
	});

	vi.mocked(getAdminFirestore).mockReturnValue({
		collection,
	} as unknown as { collection: typeof collection });

	return { add, collection, doc, nestedCollection };
};

afterEach(() => {
	vi.restoreAllMocks();
});

describe("logStampEvent", () => {
	it("persists the payload with defaults applied", async () => {
		const { add, collection, doc, nestedCollection } = setupFirestore();
		const now = vi.spyOn(Date, "now").mockReturnValue(1700000000000);

		await logStampEvent("user-42", {
			stampId: "reception",
			status: "granted",
		});

		expect(collection).toHaveBeenCalledWith("users");
		expect(doc).toHaveBeenCalledWith("user-42");
		expect(nestedCollection).toHaveBeenCalledWith("stampEvents");
		expect(add).toHaveBeenCalledWith({
			stampId: "reception",
			status: "granted",
			maintenanceStatus: "online",
			createdAt: 1700000000000,
		});

		now.mockRestore();
	});

	it("honours the provided maintenance status and omits stampId", async () => {
		const { add } = setupFirestore();
		const now = vi.spyOn(Date, "now").mockReturnValue(1700001000000);

		await logStampEvent("user-99", {
			status: "maintenance",
			maintenanceStatus: "maintenance",
		});

		expect(add).toHaveBeenCalledWith({
			stampId: null,
			status: "maintenance",
			maintenanceStatus: "maintenance",
			createdAt: 1700001000000,
		});

		now.mockRestore();
	});
});
