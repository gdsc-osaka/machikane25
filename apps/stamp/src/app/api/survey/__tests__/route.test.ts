import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { POST } from "../route";

const mockGetAttendeeProfile = vi.hoisted(() =>
	vi.fn(async () => ({
		uid: "attendee-001",
		displayLanguage: "ja",
		stamps: {
			reception: true,
			photobooth: true,
			art: true,
			robot: true,
			survey: false,
		},
		completedAt: null,
		surveyCompleted: false,
		surveySubmittedAt: null,
		surveySubmissionId: null,
		rewardQr: null,
		rewardEligible: false,
		rewardRedeemed: false,
		rewardRedeemedAt: null,
		maintenanceBypass: false,
	})),
);
const mockMarkSurveyCompleted = vi.hoisted(() =>
	vi.fn((profile) => ({ ...profile, surveyCompleted: true })),
);
const mockSaveAttendeeProfile = vi.hoisted(() =>
	vi.fn(async () => undefined),
);
const mockRecordSurveySubmission = vi.hoisted(() =>
	vi.fn(async () => ({ submissionId: "submission-xyz", submittedAt: Date.now() })),
);

vi.mock("@/features/profile/models/attendee-profile", () => ({
	getAttendeeProfile: mockGetAttendeeProfile,
	markSurveyCompleted: mockMarkSurveyCompleted,
	saveAttendeeProfile: mockSaveAttendeeProfile,
}));

vi.mock("@/features/survey/server/record-submission", () => ({
	recordSurveySubmission: mockRecordSurveySubmission,
}));

describe("POST /api/survey route (unit)", () => {
	const originalEnv = { ...process.env };

	beforeEach(() => {
		process.env.GOOGLE_FORM_ID = "FORM";
		process.env.GOOGLE_FORM_ENTRY_PHOTO_SATISFACTION = "photo";
		process.env.GOOGLE_FORM_ENTRY_ART_SATISFACTION = "art";
		process.env.GOOGLE_FORM_ENTRY_STAMP_SATISFACTION = "stamp";
		process.env.GOOGLE_FORM_ENTRY_FREE_TEXT = "free";
		vi.spyOn(globalThis, "fetch").mockResolvedValue(
			new Response("ok", { status: 200 }),
		);
	});

	afterEach(() => {
		Object.assign(process.env, originalEnv);
		vi.restoreAllMocks();
	});

	it("returns 401 when attendee id is missing", async () => {
		const request = new Request("http://localhost/api/survey", {
			method: "POST",
			body: JSON.stringify({
				satisfactionPhoto: 5,
				satisfactionArt: 4,
				satisfactionStamp: 5,
				freeText: "",
			}),
			headers: { "content-type": "application/json" },
		});

		const response = await POST(request);
		expect(response.status).toBe(401);
	});

	it("returns 400 for malformed JSON payloads", async () => {
		const request = new Request("http://localhost/api/survey", {
			method: "POST",
			body: "not-json",
			headers: {
				authorization: "Bearer attendee-123",
				"content-type": "application/json",
			},
		});

		const response = await POST(request);
		expect(response.status).toBe(400);
		const payload = await response.json();
		expect(payload.status).toBe("error");
	});

	it("accepts attendee id from custom header", async () => {
		const request = new Request("http://localhost/api/survey", {
			method: "POST",
			body: JSON.stringify({
				satisfactionPhoto: 5,
				satisfactionArt: 5,
				satisfactionStamp: 5,
				freeText: "",
			}),
			headers: {
				"x-attendee-id": "attendee-header",
				"content-type": "application/json",
			},
		});

		const response = await POST(request);
		expect(response.status).toBe(200);
		expect(mockGetAttendeeProfile).toHaveBeenCalledWith("attendee-header");
		expect(mockRecordSurveySubmission).toHaveBeenCalledWith(
			expect.objectContaining({ uid: "attendee-header" }),
		);
	});
});
