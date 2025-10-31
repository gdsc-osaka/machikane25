import { errAsync, okAsync } from "neverthrow";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
	ClaimStampAsyncResult,
	ClaimStampInput,
	ClaimStampSuccess,
} from "@/application/stamps/claim-stamp";
import { DuplicateStampError, type StampRepository } from "@/domain/stamp";

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
const collectionMock = vi.fn();
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

const claimMock = vi.fn<(arg: ClaimStampInput) => ClaimStampAsyncResult>();

const createStampRepositoryMock = vi.fn<() => StampRepository>(() => ({
	getByUserId: vi.fn(),
	save: vi.fn(),
}));

const createClaimStampServiceMock = vi.fn<
	(arg: { repository: StampRepository }) => { claim: typeof claimMock }
>(() => ({ claim: claimMock }));

vi.mock("@/infra/stamp/stamp-repository", () => ({
	createStampRepository: createStampRepositoryMock,
}));

vi.mock("@/application/stamps/claim-stamp", () => ({
	createClaimStampService: createClaimStampServiceMock,
}));

const importHelper = async () => {
	vi.resetModules();
	return import("../claim-stamp.client");
};

const expectClaimResultToMatch = async (
	result: ClaimStampAsyncResult,
	expected: ClaimStampSuccess,
) => {
	const resolved = await result;
	expect(resolved.isOk()).toBe(true);
	expect(resolved._unsafeUnwrap()).toEqual(expected);
};

describe("claimStampWithToken", () => {
	beforeEach(() => {
		authStub.currentUser = null;
		claimMock.mockReset();
		signInAnonymouslyMock.mockReset();
		signInAnonymouslyMock.mockResolvedValue({ user: { uid: "anon-user" } });
		createClaimStampServiceMock.mockClear();
		createStampRepositoryMock.mockClear();
		getAuthMock.mockClear();
		getFirestoreMock.mockClear();
	});

	it("signs in anonymously when no user exists and forwards the claim result", async () => {
		const { claimStampWithToken } = await importHelper();
		const success: ClaimStampSuccess = {
			checkpoint: "reception",
			progress: {
				collected: ["reception"],
				remaining: ["photobooth", "art", "robot", "survey"],
				lastCollectedAt: 1_700_000_000_000,
				isComplete: false,
			},
		};
		claimMock.mockReturnValueOnce(okAsync(success));

		const result = claimStampWithToken("token-reception");

		await expectClaimResultToMatch(result, success);

		expect(getAuthMock).toHaveBeenCalledTimes(1);
		expect(signInAnonymouslyMock).toHaveBeenCalledTimes(1);
		expect(claimMock).toHaveBeenCalledWith({
			token: "token-reception",
			userId: "anon-user",
		});
	});

	it("reuses the existing attendee when already signed in", async () => {
		authStub.currentUser = {
			uid: "existing-attendee",
		};
		const { claimStampWithToken } = await importHelper();
		const success: ClaimStampSuccess = {
			checkpoint: "photobooth",
			progress: {
				collected: ["reception", "photobooth"],
				remaining: ["art", "robot", "survey"],
				lastCollectedAt: 1_700_000_001_000,
				isComplete: false,
			},
		};
		claimMock.mockReturnValueOnce(okAsync(success));

		const result = claimStampWithToken("token-photobooth");

		await expectClaimResultToMatch(result, success);
		expect(signInAnonymouslyMock).not.toHaveBeenCalled();
		expect(claimMock).toHaveBeenCalledWith({
			token: "token-photobooth",
			userId: "existing-attendee",
		});
	});

	it("propagates domain errors from the claim service", async () => {
		const { claimStampWithToken } = await importHelper();
		const duplicateError = DuplicateStampError("duplicate", {
			extra: { checkpoint: "robot" },
		});
		claimMock.mockReturnValueOnce(errAsync(duplicateError));

		const result = await claimStampWithToken("token-robot");

		expect(result.isErr()).toBe(true);
		expect(result._unsafeUnwrapErr()).toEqual(duplicateError);
	});
});
