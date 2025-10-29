import { ok, okAsync, type ResultAsync } from "neverthrow";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
	SubmitSurveyFailure,
	SubmitSurveySuccess,
} from "@/application/survey/submit-survey";

process.env.NEXT_PUBLIC_FIREBASE_CONFIG = JSON.stringify({
	apiKey: "test-key",
	authDomain: "localhost",
	projectId: "demo-project",
	appId: "demo-app",
});

const authStub: { currentUser: { uid: string } | null } = { currentUser: null };
const firestoreStub: Record<string, unknown> = {};

const getAppsMock = vi.fn(() => []);
const getAppMock = vi.fn(() => ({}));
const initializeAppMock = vi.fn(() => ({}));

vi.mock("firebase/app", () => ({
	getApps: getAppsMock,
	getApp: getAppMock,
	initializeApp: initializeAppMock,
}));

const getAuthMock = vi.fn(() => authStub);
const connectAuthEmulatorMock = vi.fn();
const signInAnonymouslyMock = vi.fn<
	() => Promise<{
		user: { uid: string };
	}>
>(() => Promise.resolve({ user: { uid: "anon-user" } }));

vi.mock("firebase/auth", () => ({
	getAuth: getAuthMock,
	connectAuthEmulator: connectAuthEmulatorMock,
	signInAnonymously: signInAnonymouslyMock,
}));

const getFirestoreMock = vi.fn(() => firestoreStub);
const connectFirestoreEmulatorMock = vi.fn();

const withConverterMock = vi.fn((converter) => ({
	converter,
	doc: docMock,
	getDoc: getDocMock,
	setDoc: setDocMock,
}));

const collectionMock = vi.fn((firestore, path) => ({
	firestore,
	path,
	withConverter: withConverterMock,
}));

const docMock = vi.fn();
const getDocMock = vi.fn();
const setDocMock = vi.fn();

vi.mock("firebase/firestore", () => ({
	getFirestore: getFirestoreMock,
	connectFirestoreEmulator: connectFirestoreEmulatorMock,
	collection: collectionMock,
	doc: docMock,
	getDoc: getDocMock,
	setDoc: setDocMock,
}));

const getRemoteConfigMock = vi.fn(() => ({
	settings: {},
	defaultConfig: {},
}));

vi.mock("firebase/remote-config", () => ({
	getRemoteConfig: getRemoteConfigMock,
}));

const getAnalyticsMock = vi.fn();
const isSupportedMock = vi.fn(async () => false);

vi.mock("firebase/analytics", () => ({
	getAnalytics: getAnalyticsMock,
	isSupported: isSupportedMock,
}));

type SurveyAnswers = {
	ratingPhotobooth: number;
	ratingAquarium: number;
	ratingStampRally: number;
	freeComment: string | null;
};

const { getSurveyFormConfigMock } = vi.hoisted(() => {
	const mock = vi.fn();
	return { getSurveyFormConfigMock: mock };
});

type SubmitSurveyService = {
	submit: (input: {
		attendeeId: string;
		answers: SurveyAnswers;
		responseId: string;
	}) => ResultAsync<SubmitSurveySuccess, SubmitSurveyFailure>;
};

const { createSubmitSurveyServiceMock, submitMock } = vi.hoisted(() => {
	const submit =
		vi.fn<
			(input: {
				attendeeId: string;
				answers: SurveyAnswers;
				responseId: string;
			}) => ResultAsync<SubmitSurveySuccess, SubmitSurveyFailure>
		>();
	const factory = vi.fn<() => SubmitSurveyService>(() => ({
		submit,
	}));
	return { createSubmitSurveyServiceMock: factory, submitMock: submit };
});

vi.mock("@/infra/remote-config/survey", () => ({
	getSurveyFormConfig: getSurveyFormConfigMock,
}));

vi.mock("@/application/survey/submit-survey", () => ({
	createSubmitSurveyService: createSubmitSurveyServiceMock,
}));

describe("submitSurveyAction", () => {
	const formConfig = {
		formResponseUrl: "https://forms.example.com/formResponse",
		entryIds: {
			attendeeId: "entry.attendee",
			ratingPhotobooth: "entry.photobooth",
			ratingAquarium: "entry.aquarium",
			ratingStampRally: "entry.rally",
			freeComment: "entry.comment",
		},
	};

	const answers: SurveyAnswers = {
		ratingPhotobooth: 5,
		ratingAquarium: 4,
		ratingStampRally: 5,
		freeComment: "Great exhibits!",
	};

	beforeEach(() => {
		authStub.currentUser = null;
		getAuthMock.mockClear();
		signInAnonymouslyMock.mockReset();
		signInAnonymouslyMock.mockResolvedValue({ user: { uid: "anon-user" } });
		getFirestoreMock.mockClear();
		collectionMock.mockClear();
		withConverterMock.mockClear();
		docMock.mockClear();
		getDocMock.mockClear();
		setDocMock.mockClear();
		getSurveyFormConfigMock.mockReturnValue(ok(formConfig));
		createSubmitSurveyServiceMock.mockClear();
		submitMock.mockReset();
		vi.unstubAllGlobals();
	});

	it("posts survey answers to Google Forms before persisting reward state", async () => {
		const fetchMock = vi.fn<
			(
				input: RequestInfo | URL,
				init?: RequestInit | undefined,
			) => Promise<Response>
		>(async () => new Response(null, { status: 200 }));
		vi.stubGlobal("fetch", fetchMock);

		const success: SubmitSurveySuccess = {
			attendeeId: "guest-42",
			surveyStatus: "submitted",
			rewardStatus: "issued",
			rewardQr: "qr-guest-42",
		};

		submitMock.mockReturnValueOnce(okAsync(success));

		const { submitSurveyAction } = await import("../submit-survey");
		const result = await submitSurveyAction({
			attendeeId: "guest-42",
			answers,
		});

		expect(result).toEqual(success);
		expect(fetchMock).toHaveBeenCalledTimes(1);
		const [url, init] = fetchMock.mock.calls[0];
		expect(String(url)).toBe(formConfig.formResponseUrl);

		expect(init?.method).toBe("POST");
		const { body } = init ?? {};
		expect(body instanceof FormData).toBe(true);
		if (body instanceof FormData) {
			expect(body.get(formConfig.entryIds.attendeeId)).toBe("guest-42");
			expect(body.get(formConfig.entryIds.ratingPhotobooth)).toBe("5");
			expect(body.get(formConfig.entryIds.ratingAquarium)).toBe("4");
			expect(body.get(formConfig.entryIds.ratingStampRally)).toBe("5");
			expect(body.get(formConfig.entryIds.freeComment)).toBe("Great exhibits!");
		}

		expect(createSubmitSurveyServiceMock).toHaveBeenCalledTimes(1);
		expect(submitMock).toHaveBeenCalledWith({
			attendeeId: "guest-42",
			answers,
			responseId: expect.stringContaining("guest-42"),
		});
	});

	it("throws an error when Google Forms rejects the submission", async () => {
		const fetchMock = vi.fn<
			(
				input: RequestInfo | URL,
				init?: RequestInit | undefined,
			) => Promise<Response>
		>(async () => new Response(null, { status: 500 }));
		vi.stubGlobal("fetch", fetchMock);

		const { submitSurveyAction } = await import("../submit-survey");

		await expect(
			submitSurveyAction({
				attendeeId: "guest-13",
				answers: {
					ratingPhotobooth: 3,
					ratingAquarium: 4,
					ratingStampRally: 5,
					freeComment: null,
				},
			}),
		).rejects.toThrowError("Failed to submit survey to Google Forms.");
		expect(submitMock).not.toHaveBeenCalled();
	});
});
