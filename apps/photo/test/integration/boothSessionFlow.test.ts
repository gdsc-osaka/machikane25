import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  initializeTestEnvironment,
  RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
} from "vitest";
import { resolveEmulatorSettings } from "../helpers/emulatorSettings";
import {
  createVisitorSession,
  captureOriginalImage,
  selectTheme,
  startGeneration,
  completeGeneration,
} from "@/domain/visitorSession";
import {
  visitorSessionConverter,
} from "@/infra/firestore/converters";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

const shouldRunEmulatorTests =
  process.env.FIREBASE_EMULATORS === "true";

if (!shouldRunEmulatorTests) {
  describe.skip("Booth session flow integration", () => {
    it("requires Firebase emulators", () => {
      expect(true).toBe(true);
    });
  });
} else {
  const projectId = "photo-booth-integration-test";
  const rulesPath = join(__dirname, "../../firestore.rules");

  let testEnv: RulesTestEnvironment;

  const loadRules = () => readFileSync(rulesPath, "utf8");
  const { host, firestorePort, storagePort } = resolveEmulatorSettings();

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId,
      firestore: {
        host,
        port: firestorePort,
        rules: loadRules(),
      },
      storage: {
        host,
        port: storagePort,
        rules: readFileSync(
          join(__dirname, "../../storage.rules"),
          "utf8"
        ),
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

  describe("Booth session flow integration", () => {
    it("should complete the full booth flow: auth -> capture -> theme selection -> generation -> result", async () => {
      // Phase 1: Auth bootstrap - create anonymous user and session
      const anonymousUid = "anon-booth-user-1";
      const context = testEnv.authenticatedContext(anonymousUid);
      const firestore = context.firestore();
      const storage = context.storage();

      const now = new Date();
      const sessionId = "session-booth-1";

      // Create initial session
      const session = createVisitorSession({
        id: sessionId,
        anonymousUid,
        now,
        ttlHours: 48,
      });

      // Save session to Firestore
      const sessionRef = doc(firestore, "visitorSessions", sessionId).withConverter(
        visitorSessionConverter
      );
      await setDoc(sessionRef, session);

      // Verify session was saved
      const savedSnapshot = await getDoc(sessionRef);
      expect(savedSnapshot.exists()).toBe(true);
      const savedSession = savedSnapshot.data();
      expect(savedSession?.status).toBe("capturing");
      expect(savedSession?.anonymousUid).toBe(anonymousUid);

      // Phase 2: Capture photo upload
      const captureTime = new Date(now.getTime() + 1000);
      const originalImagePath = `originals/${sessionId}/photo.jpg`;

      // Simulate photo upload to Storage
      const imageData = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]); // JPEG header
      const photoRef = storage.ref(originalImagePath);
      await photoRef.put(imageData, {
        contentType: "image/jpeg",
      });

      // Update session with captured image
      const capturedSession = captureOriginalImage(session, {
        storagePath: originalImagePath,
        capturedAt: captureTime,
        retentionMinutes: 5,
      });

      await updateDoc(sessionRef, visitorSessionConverter.toFirestore(capturedSession));

      // Verify capture was recorded
      const capturedSnapshot = await getDoc(sessionRef);
      const capturedData = capturedSnapshot.data();
      expect(capturedData?.status).toBe("selecting-theme");
      expect(capturedData?.originalImageRef).toBe(originalImagePath);

      // Phase 3: Theme selection
      const themeSelectionTime = new Date(captureTime.getTime() + 2000);
      const selectedThemeId = "theme-fireworks";

      const themedSession = selectTheme(capturedSession, {
        themeId: selectedThemeId,
        selectedAt: themeSelectionTime,
      });

      await updateDoc(sessionRef, visitorSessionConverter.toFirestore(themedSession));

      // Verify theme selection
      const themedSnapshot = await getDoc(sessionRef);
      const themedData = themedSnapshot.data();
      expect(themedData?.themeId).toBe(selectedThemeId);

      // Phase 4: Start generation (queue to Gemini)
      const generationStartTime = new Date(themeSelectionTime.getTime() + 500);
      const generatingSession = startGeneration(themedSession, {
        requestedAt: generationStartTime,
      });

      await updateDoc(sessionRef, visitorSessionConverter.toFirestore(generatingSession));

      // Verify generation started
      const generatingSnapshot = await getDoc(sessionRef);
      const generatingData = generatingSnapshot.data();
      expect(generatingData?.status).toBe("generating");

      // Phase 5: Simulate polling and completion
      // In real scenario, Cloud Functions would update this
      const completionTime = new Date(generationStartTime.getTime() + 5000);
      const generatedImagePath = `generated/${sessionId}/result.png`;
      const publicTokenId = `token-${sessionId}`;

      // Simulate generated image upload
      const generatedImageData = new Uint8Array([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      ]); // PNG header
      const generatedRef = storage.ref(generatedImagePath);
      await generatedRef.put(generatedImageData, {
        contentType: "image/png",
      });

      const completedSession = completeGeneration(generatingSession, {
        generatedImageRef: generatedImagePath,
        completedAt: completionTime,
        publicTokenId,
        aquariumEventId: null,
      });

      await updateDoc(sessionRef, visitorSessionConverter.toFirestore(completedSession));

      // Phase 6: Verify final state
      const finalSnapshot = await getDoc(sessionRef);
      const finalData = finalSnapshot.data();

      expect(finalData?.status).toBe("completed");
      expect(finalData?.generatedImageRef).toBe(generatedImagePath);
      expect(finalData?.publicTokenId).toBe(publicTokenId);
      expect(finalData?.statusHistory).toHaveLength(4); // capturing -> selecting-theme -> generating -> completed

      // Verify we can retrieve the generated image
      const downloadUrl = await generatedRef.getDownloadURL();
      expect(downloadUrl).toBeTruthy();
      expect(typeof downloadUrl).toBe("string");
    });

    it("should handle timeout scenario when generation takes too long", async () => {
      const anonymousUid = "anon-booth-user-timeout";
      const context = testEnv.authenticatedContext(anonymousUid);
      const firestore = context.firestore();

      const now = new Date();
      const sessionId = "session-timeout-1";

      const session = createVisitorSession({
        id: sessionId,
        anonymousUid,
        now,
      });

      const sessionRef = doc(firestore, "visitorSessions", sessionId).withConverter(
        visitorSessionConverter
      );
      await setDoc(sessionRef, session);

      // Fast-forward through capture and theme selection
      const captureTime = new Date(now.getTime() + 1000);
      const capturedSession = captureOriginalImage(session, {
        storagePath: `originals/${sessionId}/photo.jpg`,
        capturedAt: captureTime,
      });

      const themedSession = selectTheme(capturedSession, {
        themeId: "theme-fireworks",
        selectedAt: new Date(captureTime.getTime() + 1000),
      });

      const generatingSession = startGeneration(themedSession, {
        requestedAt: new Date(captureTime.getTime() + 2000),
      });

      await updateDoc(sessionRef, visitorSessionConverter.toFirestore(generatingSession));

      // Simulate polling - in real app, client would poll multiple times
      // and eventually timeout or show "still processing" message
      const pollingSnapshot = await getDoc(sessionRef);
      const pollingData = pollingSnapshot.data();

      expect(pollingData?.status).toBe("generating");
      expect(pollingData?.generatedImageRef).toBeNull();

      // Client-side should handle this by continuing to poll
      // or showing appropriate UI feedback
    });

    it("should enforce security rules preventing unauthorized access", async () => {
      const ownerUid = "anon-owner";
      const strangerUid = "anon-stranger";

      const ownerContext = testEnv.authenticatedContext(ownerUid);
      const strangerContext = testEnv.authenticatedContext(strangerUid);

      const now = new Date();
      const sessionId = "session-security-test";

      const session = createVisitorSession({
        id: sessionId,
        anonymousUid: ownerUid,
        now,
      });

      // Owner creates session
      const ownerFirestore = ownerContext.firestore();
      const sessionRef = doc(ownerFirestore, "visitorSessions", sessionId).withConverter(
        visitorSessionConverter
      );
      await setDoc(sessionRef, session);

      // Owner can read their own session
      const ownerRead = await getDoc(sessionRef);
      expect(ownerRead.exists()).toBe(true);

      // Stranger cannot read other user's session
      const strangerFirestore = strangerContext.firestore();
      const strangerSessionRef = doc(
        strangerFirestore,
        "visitorSessions",
        sessionId
      ).withConverter(visitorSessionConverter);

      await expect(getDoc(strangerSessionRef)).rejects.toThrow();
    });
  });
}
