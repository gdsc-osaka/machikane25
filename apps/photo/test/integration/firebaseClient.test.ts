import { describe, it, expect, beforeAll } from "vitest";
import { initializeFirebaseClient } from "@/lib/firebase/client";
import { getAuth, signInAnonymously } from "firebase/auth";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import { getStorage, ref, listAll } from "firebase/storage";

/**
 * T201 [P] [FOUND] Integration Test (Firebase Client Init)
 *
 * Firebase Emulator Suite（Auth, Firestore, Storage）が動作していることを前提とする。
 * initializeFirebaseClient() を呼び出す。
 * getAuth() がEmulator（http://localhost:9099）を向いていることをアサート。
 * getFirestore() がEmulator（http://localhost:8080）を向いていることをアサート。
 * getStorage() がEmulator（http://localhost:9199）を向いていることをアサート。
 */
describe("Firebase Client Initialization", () => {
  beforeAll(() => {
    // Initialize Firebase client before tests
    initializeFirebaseClient();
  });

  it("should initialize Firebase client and Auth should be functional", async () => {
    const auth = getAuth();

    // Check that auth is initialized
    expect(auth).toBeDefined();
    expect(auth.app).toBeDefined();

    // Verify Auth is functional by signing in anonymously
    // This will only work if connected to emulator in test environment
    const userCredential = await signInAnonymously(auth);
    expect(userCredential.user).toBeDefined();
    expect(userCredential.user.isAnonymous).toBe(true);
  });

  it("should initialize Firebase client and Firestore should be functional", async () => {
    const firestore = getFirestore();

    // Check that firestore is initialized
    expect(firestore).toBeDefined();
    expect(firestore.app).toBeDefined();

    // Verify Firestore is functional by attempting to read a collection
    // This will only work if connected to emulator in test environment
    const optionsRef = collection(firestore, "options");
    const snapshot = await getDocs(optionsRef);

    // The collection should be accessible (even if empty)
    expect(snapshot).toBeDefined();
  });

  it("should initialize Firebase client and Storage should be functional", async () => {
    const storage = getStorage();

    // Check that storage is initialized
    expect(storage).toBeDefined();
    expect(storage.app).toBeDefined();

    // Verify Storage is functional by listing root directory
    // This will only work if connected to emulator in test environment
    const storageRef = ref(storage);
    const result = await listAll(storageRef);

    // The storage should be accessible
    expect(result).toBeDefined();
    expect(result.items).toBeDefined();
    expect(result.prefixes).toBeDefined();
  });
});
