import { beforeEach, describe, expect, it, vi } from "vitest";
import { recordSurveySubmission } from "../record-submission";

const setSpy = vi.fn();
const docSpy = vi.fn(() => ({
	set: setSpy,
}));
const collectionSpy = vi.fn(() => ({
	doc: docSpy,
}));

const mockGetAdminFirestore = vi.hoisted(() =>
	vi.fn(() => ({
		collection: collectionSpy,
	})),
);

vi.mock("@/lib/firebase/admin", () => ({
	getAdminFirestore: mockGetAdminFirestore,
}));

describe("recordSurveySubmission", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		setSpy.mockResolvedValue(undefined);
		docSpy.mockReturnValue({
			id: "generated-id",
			set: setSpy,
		});
	});

	it("persists submission payload with audit metadata", async () => {
		const result = await recordSurveySubmission({
			uid: "attendee-1",
			status: "success",
			payload: { satisfactionPhoto: 5 },
			submittedAt: 1000,
			googleResponseId: "response-9",
		});

		expect(collectionSpy).toHaveBeenCalledWith("surveySubmissions");
		expect(docSpy).toHaveBeenCalled();
		expect(setSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				uid: "attendee-1",
				status: "success",
				googleResponseId: "response-9",
				payload: { satisfactionPhoto: 5 },
			}),
		);
		expect(result).toEqual({
			submissionId: "generated-id",
			submittedAt: 1000,
		});
	});

	it("stores error details when status is error", async () => {
		await recordSurveySubmission({
			uid: "attendee-2",
			status: "error",
			payload: {},
			submittedAt: 2000,
			errorMessage: "Upstream failed",
		});

		expect(setSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				errorMessage: "Upstream failed",
				status: "error",
			}),
		);
	});
});
