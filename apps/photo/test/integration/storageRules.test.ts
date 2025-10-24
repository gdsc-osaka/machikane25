import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
} from "vitest";

const shouldRunEmulatorTests =
  process.env.FIREBASE_EMULATORS === "true";

if (!shouldRunEmulatorTests) {
  describe.skip("Storage security rules", () => {
    it("requires Firebase emulators", () => {
      expect(true).toBe(true);
    });
  });
} else {
  const projectId = "photo-storage-security-test";
  const rulesPath = join(__dirname, "../../storage.rules");
  const firestoreRulesPath = join(__dirname, "../../firestore.rules");

  let testEnv: Awaited<ReturnType<typeof initializeTestEnvironment>>;

  const loadRules = (path: string) => readFileSync(path, "utf8");

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId,
      firestore: {
        rules: loadRules(firestoreRulesPath),
      },
      storage: {
        rules: loadRules(rulesPath),
      },
    });
  });

  afterEach(async () => {
    await testEnv.clearFirestore();
    await testEnv.clearStorage();
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  describe("Storage security rules", () => {
    it("permits original uploads for the owning session and blocks others", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().doc("visitorSessions/session-10").set({
          anonymousUid: "anon-10",
          status: "capturing",
          themeId: null,
          originalImageRef: null,
          generatedImageRef: null,
          publicTokenId: null,
          aquariumEventId: null,
          expiresAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      });
      const ownerStorage = testEnv.authenticatedContext("anon-10").storage();
      const ownerFile = ownerStorage.ref(
        "originals/session-10/source.jpg",
      );
      await assertSucceeds(
        Promise.resolve(
          ownerFile.putString("binary-data", "raw", {
            contentType: "image/jpeg",
          }),
        ),
      );

      const strangerStorage = testEnv.authenticatedContext("anon-stranger").storage();
      const strangerFile = strangerStorage.ref(
        "originals/session-10/source.jpg",
      );
      await assertFails(
        Promise.resolve(
          strangerFile.putString("binary-data", "raw", {
            contentType: "image/jpeg",
          }),
        ),
      );
    });

    it("allows generated asset reads for session owners while keeping originals private", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().doc("visitorSessions/session-11").set({
          anonymousUid: "anon-11",
          status: "completed",
          themeId: "theme",
          originalImageRef: "originals/session-11/source.jpg",
          generatedImageRef: "generated/session-11/result.png",
          publicTokenId: "token-11",
          aquariumEventId: null,
          expiresAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      });
      const ownerStorage = testEnv.authenticatedContext("anon-11").storage();
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const storage = context.storage();
        await Promise.resolve(
          storage
            .ref("generated/session-11/result.png")
            .putString("png-data", "raw", { contentType: "image/png" }),
        );
        await Promise.resolve(
          storage
            .ref("originals/session-11/source.jpg")
            .putString("jpeg-data", "raw", { contentType: "image/jpeg" }),
        );
      });
      const generatedRef = ownerStorage.ref("generated/session-11/result.png");
      await assertSucceeds(generatedRef.getDownloadURL());
      const originalRef = ownerStorage.ref("originals/session-11/source.jpg");
      await assertFails(originalRef.getDownloadURL());
    });

    it("rejects non-JPEG/PNG uploads even for the owning session", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().doc("visitorSessions/session-12").set({
          anonymousUid: "anon-12",
          status: "capturing",
          themeId: null,
          originalImageRef: null,
          generatedImageRef: null,
          publicTokenId: null,
          aquariumEventId: null,
          expiresAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      });
      const ownerStorage = testEnv.authenticatedContext("anon-12").storage();
      const fileRef = ownerStorage.ref("originals/session-12/source.gif");
      await assertFails(
        Promise.resolve(
          fileRef.putString("binary-data", "raw", {
            contentType: "image/gif",
          }),
        ),
      );
    });

    it("rejects original uploads larger than 20MB for session owners", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().doc("visitorSessions/session-13").set({
          anonymousUid: "anon-13",
          status: "capturing",
          themeId: null,
          originalImageRef: null,
          generatedImageRef: null,
          publicTokenId: null,
          aquariumEventId: null,
          expiresAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      });
      const ownerStorage = testEnv.authenticatedContext("anon-13").storage();
      const fileRef = ownerStorage.ref("originals/session-13/oversized.jpg");
      const oversizedPayload = "x".repeat(21 * 1024 * 1024);
      await assertFails(
        Promise.resolve(
          fileRef.putString(oversizedPayload, "raw", {
            contentType: "image/jpeg",
          }),
        ),
      );
    });
  });
}
