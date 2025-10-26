import { getAuth, onAuthStateChanged, type User } from "firebase/auth";
import { beforeAll, describe, expect, it, vi } from "vitest";
import {
	ensureAnonymousSignIn,
	initializeFirebaseClient,
} from "@/lib/firebase/client";

/**
 * T202 [P] [FOUND] Integration Test (Anonymous Auth)
 *
 * ensureAnonymousSignIn() を呼び出す。
 * onAuthStateChangedが発火し、user.isAnonymousがtrueのユーザーオブジェクトが取得できることをwaitForで検証 (FR-001)。
 * 2回呼び出しても、サインインは1回しか実行されないこと（既存ユーザーが返る）を検証。
 */
describe("Anonymous Authentication", () => {
	beforeAll(() => {
		// Initialize Firebase client before tests
		initializeFirebaseClient();
	});

	it("should sign in anonymously and return user with isAnonymous=true (FR-001)", async () => {
		const auth = getAuth();

		// Create a promise to wait for auth state change
		const authStatePromise = new Promise<User>((resolve, reject) => {
			const unsubscribe = onAuthStateChanged(
				auth,
				(user) => {
					if (user) {
						unsubscribe();
						resolve(user);
					}
				},
				(error) => {
					unsubscribe();
					reject(error);
				},
			);
		});

		// Call ensureAnonymousSignIn
		await ensureAnonymousSignIn();

		// Wait for auth state to change and verify user is anonymous
		const user = await authStatePromise;
		expect(user).toBeDefined();
		expect(user.isAnonymous).toBe(true);
	});

	it("should not sign in again when called twice (idempotent)", async () => {
		const auth = getAuth();

		// First call
		const user1 = await ensureAnonymousSignIn();
		expect(user1).toBeDefined();
		expect(user1.isAnonymous).toBe(true);

		const uid1 = user1.uid;

		// Second call should return the same user without creating a new one
		const user2 = await ensureAnonymousSignIn();
		expect(user2).toBeDefined();
		expect(user2.uid).toBe(uid1);
	});

	it("should fire onAuthStateChanged with anonymous user", async () => {
		const auth = getAuth();
		const authStateCallback = vi.fn();

		// Set up listener
		const unsubscribe = onAuthStateChanged(auth, authStateCallback);

		// Ensure anonymous sign-in
		await ensureAnonymousSignIn();

		// Wait a bit for the callback to fire
		await new Promise((resolve) => setTimeout(resolve, 100));

		// Verify callback was called with anonymous user
		expect(authStateCallback).toHaveBeenCalled();
		const callArgs = authStateCallback.mock.calls[0];
		expect(callArgs).toBeDefined();
		const user = callArgs?.[0];
		expect(user).toBeDefined();
		expect(user.isAnonymous).toBe(true);

		unsubscribe();
	});
});
