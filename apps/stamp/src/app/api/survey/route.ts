"use server";

import { z } from "zod";
import {
	type AttendeeProfile,
	getAttendeeProfile,
	markSurveyCompleted,
	saveAttendeeProfile,
} from "@/features/profile/models/attendee-profile";
import { recordSurveySubmission } from "@/features/survey/server/record-submission";

const surveySchema = z.object({
	satisfactionPhoto: z.number().int().min(1).max(5),
	satisfactionArt: z.number().int().min(1).max(5),
	satisfactionStamp: z.number().int().min(1).max(5),
	freeText: z.string().max(500).default(""),
});

type SurveyPayload = z.infer<typeof surveySchema>;

const requireEnv = (key: string): string => {
	const value = process.env[key];
	if (!value) {
		throw new Error(`Missing environment variable: ${key}`);
	}
	return value;
};

const resolveUid = (request: Request): string => {
	const headerUid = request.headers.get("x-attendee-id");
	if (headerUid) {
		return headerUid;
	}
	const authHeader = request.headers.get("authorization");
	if (authHeader?.startsWith("Bearer ")) {
		const token = authHeader.slice("Bearer ".length).trim();
		if (token) {
			return token;
		}
	}
	throw new Response("Unauthorized", { status: 401 });
};

const buildFormBody = (payload: SurveyPayload): URLSearchParams => {
	const photoEntry = requireEnv("GOOGLE_FORM_ENTRY_PHOTO_SATISFACTION");
	const artEntry = requireEnv("GOOGLE_FORM_ENTRY_ART_SATISFACTION");
	const stampEntry = requireEnv("GOOGLE_FORM_ENTRY_STAMP_SATISFACTION");
	const textEntry = requireEnv("GOOGLE_FORM_ENTRY_FREE_TEXT");

	const params = new URLSearchParams();
	params.set(photoEntry, String(payload.satisfactionPhoto));
	params.set(artEntry, String(payload.satisfactionArt));
	params.set(stampEntry, String(payload.satisfactionStamp));
	if (payload.freeText.trim().length > 0) {
		params.set(textEntry, payload.freeText.trim());
	}
	params.set("submit", "Submit");
	return params;
};

const submitToGoogleForm = async (
	payload: SurveyPayload,
): Promise<Response> => {
	const formId = requireEnv("GOOGLE_FORM_ID");
	const url = `https://docs.google.com/forms/d/e/${formId}/formResponse`;
	const body = buildFormBody(payload);

	return fetch(url, {
		method: "POST",
		headers: {
			"content-type": "application/x-www-form-urlencoded",
		},
		body: body.toString(),
	});
};

const jsonResponse = (data: unknown, init?: ResponseInit) =>
	new Response(JSON.stringify(data), {
		...init,
		headers: {
			"content-type": "application/json",
			...(init?.headers ?? {}),
		},
	});

export const POST = async (request: Request): Promise<Response> => {
	let uid: string;
	try {
		uid = resolveUid(request);
	} catch (error) {
		if (error instanceof Response) {
			return error;
		}
		return jsonResponse(
			{ status: "error", message: "Unauthorized" },
			{ status: 401 },
		);
	}

	let parsed: SurveyPayload;
	try {
		const json = await request.json();
		const result = surveySchema.safeParse(json);
		if (!result.success) {
			return jsonResponse(
				{
					status: "error",
					message: "Invalid survey payload",
					issues: result.error.issues.map((issue) => issue.message),
				},
				{ status: 400 },
			);
		}
		parsed = result.data;
	} catch {
		return jsonResponse(
			{ status: "error", message: "Malformed JSON payload" },
			{ status: 400 },
		);
	}

	let profile: AttendeeProfile;
	try {
		profile = await getAttendeeProfile(uid);
	} catch (error) {
		const message =
			error instanceof Error
				? error.message
				: "Failed to load attendee profile";
		return jsonResponse({ status: "error", message }, { status: 500 });
	}

	if (profile.surveyCompleted) {
		return jsonResponse(
			{
				status: "already-completed",
				message: "Survey already completed",
			},
			{ status: 409 },
		);
	}

	const submittedAt = Date.now();

	let googleResponse: Response;
	try {
		googleResponse = await submitToGoogleForm(parsed);
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Unknown submission error";
		await recordSurveySubmission({
			uid,
			status: "error",
			payload: parsed,
			submittedAt,
			errorMessage: message,
		});
		return jsonResponse(
			{
				status: "retry",
				message: "Failed to submit survey. Please try again shortly.",
			},
			{ status: 502 },
		);
	}

	if (!googleResponse.ok) {
		const errorText = await googleResponse.text();
		await recordSurveySubmission({
			uid,
			status: "error",
			payload: parsed,
			submittedAt,
			errorMessage:
				errorText || `Google Form responded with ${googleResponse.status}`,
		});
		return jsonResponse(
			{
				status: "retry",
				message: "Survey submission failed. Please try again shortly.",
			},
			{ status: 502 },
		);
	}

	const submission = await recordSurveySubmission({
		uid,
		status: "success",
		payload: parsed,
		submittedAt,
	});

	const updatedProfile = markSurveyCompleted(profile, {
		submissionId: submission.submissionId,
		submittedAt,
	});

	await saveAttendeeProfile(updatedProfile);

	return jsonResponse(
		{
			status: "success",
			message: "Survey submitted successfully. Thank you for your feedback!",
		},
		{ status: 200 },
	);
};
