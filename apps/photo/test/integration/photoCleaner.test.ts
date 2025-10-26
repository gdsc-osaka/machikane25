import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import {
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  Timestamp,
} from "firebase/firestore";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  getBytes,
} from "firebase/storage";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * T205 [P] [FOUND] Integration Test (Photo Cleaner)
 *
 * Setup: EmulatorのFirestore/Storageを使用。
 * uploadedPhotos Cに2件のドキュメントを追加: photo_old（createdAtが20分前）、photo_new（createdAtが5分前）。対応するダミーファイルをStorageにアップロード。
 * photoCleaner Function を実行。
 * photo_oldのドキュメントとStorageファイルが削除されていることをアサート (FR-006)。
 * photo_newのドキュメントとStorageファイルが残存していることをアサート。
 * photoCleanerAudit Cに実行結果（deletedCount: 1, skippedCount: 1）が記録されていることをアサート。
 */

const PROJECT_ID = "photo-cleaner-test";
const FIRESTORE_RULES_PATH = join(process.cwd(), "firestore.rules");
const STORAGE_RULES_PATH = join(process.cwd(), "storage.rules");

let testEnv: RulesTestEnvironment;

// Helper to create a dummy image buffer
const createDummyImage = (): Buffer => {
  // Create a 1x1 pixel PNG (minimal valid PNG)
  const png = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
    0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
    0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
    0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
    0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
  ]);
  return png;
};

describe("Photo Cleaner Function", () => {
  beforeAll(async () => {
    // Load security rules
    const firestoreRules = readFileSync(FIRESTORE_RULES_PATH, "utf8");
    const storageRules = readFileSync(STORAGE_RULES_PATH, "utf8");

    // Initialize test environment
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        rules: firestoreRules,
        host: "localhost",
        port: 8080,
      },
      storage: {
        rules: storageRules,
        host: "localhost",
        port: 9199,
      },
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  beforeEach(async () => {
    // Clear all data before each test
    await testEnv.clearFirestore();
  });

  it("should delete old uploaded photos (>15 minutes) and keep new ones (<15 minutes)", async () => {
    // Setup: Create booth and uploaded photos as admin
    const adminContext = testEnv.authenticatedContext("admin-user", {
      role: "admin",
    });
    const adminDb = adminContext.firestore();
    const adminStorage = adminContext.storage();

    // Create booth
    await setDoc(doc(adminDb, "booths", "booth-1"), {
      state: "idle",
      latestPhotoId: null,
      lastTakePhotoAt: null,
      createdAt: Timestamp.now(),
    });

    // Create old photo (20 minutes ago) - should be deleted
    const twentyMinutesAgo = Timestamp.fromMillis(
      Date.now() - 20 * 60 * 1000
    );
    const photoOldId = "photo-old";
    const photoOldPath = `photos/${photoOldId}/photo.png`;

    await setDoc(doc(adminDb, `booths/booth-1/uploadedPhotos/${photoOldId}`), {
      imagePath: photoOldPath,
      imageUrl: `https://storage.example.com/${photoOldPath}`,
      createdAt: twentyMinutesAgo,
    });

    // Upload dummy image to Storage for old photo
    const oldPhotoRef = ref(adminStorage, photoOldPath);
    await uploadBytes(oldPhotoRef, createDummyImage());

    // Verify old photo exists in Storage
    const oldPhotoUrl = await getDownloadURL(oldPhotoRef);
    expect(oldPhotoUrl).toBeDefined();

    // Create new photo (5 minutes ago) - should be kept
    const fiveMinutesAgo = Timestamp.fromMillis(Date.now() - 5 * 60 * 1000);
    const photoNewId = "photo-new";
    const photoNewPath = `photos/${photoNewId}/photo.png`;

    await setDoc(doc(adminDb, `booths/booth-1/uploadedPhotos/${photoNewId}`), {
      imagePath: photoNewPath,
      imageUrl: `https://storage.example.com/${photoNewPath}`,
      createdAt: fiveMinutesAgo,
    });

    // Upload dummy image to Storage for new photo
    const newPhotoRef = ref(adminStorage, photoNewPath);
    await uploadBytes(newPhotoRef, createDummyImage());

    // Verify new photo exists in Storage
    const newPhotoUrl = await getDownloadURL(newPhotoRef);
    expect(newPhotoUrl).toBeDefined();

    // Act: Execute Photo Cleaner Function
    // Note: This would normally be triggered via HTTP or scheduled
    // For testing, we'll import and call the function directly
    const { cleanUploadedPhotos } = await import(
      "@photo-cleaner/cleanUploadedPhotos"
    );
    const result = await cleanUploadedPhotos();

    // Assert: Old photo should be deleted
    const oldPhotoDoc = await getDoc(
      doc(adminDb, `booths/booth-1/uploadedPhotos/${photoOldId}`)
    );
    expect(oldPhotoDoc.exists()).toBe(false);

    // Old photo should be deleted from Storage
    await expect(async () => {
      await getBytes(oldPhotoRef);
    }).rejects.toThrow();

    // Assert: New photo should still exist
    const newPhotoDoc = await getDoc(
      doc(adminDb, `booths/booth-1/uploadedPhotos/${photoNewId}`)
    );
    expect(newPhotoDoc.exists()).toBe(true);

    // New photo should still exist in Storage
    const newPhotoBytes = await getBytes(newPhotoRef);
    expect(newPhotoBytes).toBeDefined();
    expect(newPhotoBytes.byteLength).toBeGreaterThan(0);

    // Assert: Audit log should be created
    const auditDocs = await getDocs(collection(adminDb, "photoCleanerAudit"));
    expect(auditDocs.size).toBe(1);

    const auditData = auditDocs.docs[0]?.data();
    expect(auditData).toBeDefined();
    expect(auditData?.deletedCount).toBe(1);
    expect(auditData?.skippedCount).toBe(1);
    expect(auditData?.executedAt).toBeDefined();

    // Verify function result
    expect(result).toEqual({
      deletedCount: 1,
      skippedCount: 1,
    });
  });

  it("should delete used photos immediately after generation (FR-006)", async () => {
    // Setup: Create booth, uploaded photo, and generated photo
    const adminContext = testEnv.authenticatedContext("admin-user", {
      role: "admin",
    });
    const adminDb = adminContext.firestore();
    const adminStorage = adminContext.storage();

    // Create booth
    await setDoc(doc(adminDb, "booths", "booth-1"), {
      state: "completed",
      latestPhotoId: "generated-1",
      lastTakePhotoAt: Timestamp.now(),
      createdAt: Timestamp.now(),
    });

    // Create uploaded photo (5 minutes ago) that was used for generation
    const fiveMinutesAgo = Timestamp.fromMillis(Date.now() - 5 * 60 * 1000);
    const photoUsedId = "photo-used";
    const photoUsedPath = `photos/${photoUsedId}/photo.png`;

    await setDoc(doc(adminDb, `booths/booth-1/uploadedPhotos/${photoUsedId}`), {
      imagePath: photoUsedPath,
      imageUrl: `https://storage.example.com/${photoUsedPath}`,
      createdAt: fiveMinutesAgo,
      used: true, // Mark as used
    });

    // Upload dummy image to Storage
    const usedPhotoRef = ref(adminStorage, photoUsedPath);
    await uploadBytes(usedPhotoRef, createDummyImage());

    // Create a generated photo to indicate the uploaded photo was used
    await setDoc(doc(adminDb, `booths/booth-1/generatedPhotos/generated-1`), {
      imageUrl: "https://storage.example.com/generated.png",
      imagePath: "generated_photos/generated-1/photo.png",
      createdAt: Timestamp.now(),
    });

    // Act: Execute Photo Cleaner
    const { cleanUploadedPhotos } = await import(
      "@photo-cleaner/cleanUploadedPhotos"
    );
    await cleanUploadedPhotos();

    // Assert: Used photo should be deleted immediately (even though <15 min old)
    const usedPhotoDoc = await getDoc(
      doc(adminDb, `booths/booth-1/uploadedPhotos/${photoUsedId}`)
    );
    expect(usedPhotoDoc.exists()).toBe(false);

    // Used photo should be deleted from Storage
    await expect(async () => {
      await getBytes(usedPhotoRef);
    }).rejects.toThrow();
  });

  it("should handle no photos to delete", async () => {
    // Setup: Create booth with no uploaded photos
    const adminContext = testEnv.authenticatedContext("admin-user", {
      role: "admin",
    });
    const adminDb = adminContext.firestore();

    await setDoc(doc(adminDb, "booths", "booth-1"), {
      state: "idle",
      latestPhotoId: null,
      lastTakePhotoAt: null,
      createdAt: Timestamp.now(),
    });

    // Act: Execute Photo Cleaner
    const { cleanUploadedPhotos } = await import(
      "@photo-cleaner/cleanUploadedPhotos"
    );
    const result = await cleanUploadedPhotos();

    // Assert: No deletions
    expect(result).toEqual({
      deletedCount: 0,
      skippedCount: 0,
    });

    // Audit log should still be created
    const auditDocs = await getDocs(collection(adminDb, "photoCleanerAudit"));
    expect(auditDocs.size).toBe(1);
  });
});
