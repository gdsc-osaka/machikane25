import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as surveySubmitRoute } from "@/app/api/survey/route";
import type { AttendeeProfile } from "@/features/profile/models/attendee-profile";

const mockGetAttendeeProfile = vi.hoisted(() =>
	vi.fn<() => Promise<AttendeeProfile>>(),
);
const mockMarkSurveyCompleted = vi.hoisted(() =>
	vi.fn<
		(
			profile: AttendeeProfile,
			options: { submissionId: string; submittedAt: number },
		) => AttendeeProfile
	>(),
);
const mockSaveAttendeeProfile = vi.hoisted(() =>
	vi.fn<(profile: AttendeeProfile) => Promise<void>>(),
);

vi.mock("@/features/profile/models/attendee-profile", async () => {
	const actual = await vi.importActual<{
		createBlankAttendeeProfile: (uid: string) => AttendeeProfile;
	}>("@/features/profile/models/attendee-profile");
	return {
		...actual,
		getAttendeeProfile: mockGetAttendeeProfile,
		markSurveyCompleted: mockMarkSurveyCompleted,
		saveAttendeeProfile: mockSaveAttendeeProfile,
	};
});

const mockRecordSurveySubmission = vi.hoisted(() =>
	vi.fn<
		(args: {
			uid: string;
			status: "success" | "error";
			submittedAt: number;
			payload: Record<string, unknown>;
			googleResponseId?: string;
			errorMessage?: string;
		}) => Promise<{ submissionId: string }>
	>(),
);

vi.mock("@/features/survey/server/record-submission", () => ({
	recordSurveySubmission: mockRecordSurveySubmission,
}));

describe("POST /api/survey", () => {
	const originalEnv = { ...process.env };
	const surveyPayload = {
		satisfactionPhoto: 5,
		satisfactionArt: 4,
		satisfactionStamp: 5,
		freeText: "Great festival!",
	};

	beforeEach(() => {
		process.env.GOOGLE_FORM_ID = "FORM_ID";
		process.env.GOOGLE_FORM_ENTRY_PHOTO_SATISFACTION = "entry.photo";
		process.env.GOOGLE_FORM_ENTRY_ART_SATISFACTION = "entry.art";
		process.env.GOOGLE_FORM_ENTRY_STAMP_SATISFACTION = "entry.stamp";
		process.env.GOOGLE_FORM_ENTRY_FREE_TEXT = "entry.freeText";

		const baseProfile: AttendeeProfile = {
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
		};

		mockGetAttendeeProfile.mockResolvedValue(baseProfile);
		mockMarkSurveyCompleted.mockImplementation((profile, options) => ({
			...profile,
			surveyCompleted: true,
			surveySubmittedAt: options.submittedAt,
			surveySubmissionId: options.submissionId,
		}));
		mockSaveAttendeeProfile.mockResolvedValue(undefined);
		mockRecordSurveySubmission.mockResolvedValue({
			submissionId: "submission-123",
		});

		vi.spyOn(globalThis, "fetch").mockResolvedValue(
			new Response("OK", { status: 200 }),
		);
	});

	afterEach(() => {
		Object.assign(process.env, originalEnv);
		vi.restoreAllMocks();
	});

	const createRequest = (body: unknown) =>
		new Request("http://localhost/api/survey", {
			method: "POST",
			headers: {
				"content-type": "application/json",
				authorization: "Bearer attendee-001",
			},
			body: JSON.stringify(body),
		});

	it("records submission, updates profile, and proxies to Google Form", async () => {
		const response = await surveySubmitRoute(createRequest(surveyPayload));
		expect(response.status).toBe(200);

		const json = await response.json();
		expect(json.status).toBe("success");

		expect(mockGetAttendeeProfile).toHaveBeenCalledWith("attendee-001");
		expect(mockRecordSurveySubmission).toHaveBeenCalledWith(
			expect.objectContaining({
				uid: "attendee-001",
				status: "success",
				payload: surveyPayload,
			}),
		);
		expect(mockMarkSurveyCompleted).toHaveBeenCalledWith(
			expect.objectContaining({ uid: "attendee-001" }),
			expect.objectContaining({
				submissionId: "submission-123",
			}),
		);
		expect(mockSaveAttendeeProfile).toHaveBeenCalledWith(
			expect.objectContaining({
				surveyCompleted: true,
				surveySubmissionId: "submission-123",
			}),
		);

		expect(globalThis.fetch).toHaveBeenCalledWith(
			"https://docs.google.com/forms/d/e/FORM_ID/formResponse",
			expect.objectContaining({
				method: "POST",
				headers: {
					"content-type": "application/x-www-form-urlencoded",
				},
			}),
		);
	});

	it("returns 409 when the attendee already completed the survey", async () => {
		mockGetAttendeeProfile.mockResolvedValueOnce({
			uid: "attendee-001",
			displayLanguage: "ja",
			stamps: {
				reception: true,
				photobooth: true,
				art: true,
				robot: true,
				survey: true,
			},
			completedAt: Date.now(),
			surveyCompleted: true,
			surveySubmittedAt: Date.now(),
			surveySubmissionId: "submission-123",
			rewardQr: null,
			rewardEligible: true,
			rewardRedeemed: false,
			rewardRedeemedAt: null,
			maintenanceBypass: false,
		});

		const response = await surveySubmitRoute(createRequest(surveyPayload));
		expect(response.status).toBe(409);
		expect(mockRecordSurveySubmission).not.toHaveBeenCalled();
		expect(mockSaveAttendeeProfile).not.toHaveBeenCalled();
	});

	it("returns 502 when Google Form responds with failure", async () => {
		vi.mocked(globalThis.fetch).mockResolvedValueOnce(
			new Response("Upstream error", { status: 500 }),
		);

		const response = await surveySubmitRoute(createRequest(surveyPayload));
		expect(response.status).toBe(502);
		expect(mockRecordSurveySubmission).toHaveBeenCalledWith(
			expect.objectContaining({
				status: "error",
				errorMessage: "Upstream error",
			}),
		);
	});

	it("returns 400 when required fields are missing", async () => {
		const response = await surveySubmitRoute(
			createRequest({ ...surveyPayload, satisfactionArt: 9 }),
		);

		expect(response.status).toBe(400);
		expect(mockRecordSurveySubmission).not.toHaveBeenCalled();
		expect(mockSaveAttendeeProfile).not.toHaveBeenCalled();
	});
});
