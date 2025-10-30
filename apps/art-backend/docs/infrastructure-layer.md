# Infrastructure Layer Implementation Plan

## Objectives
- Bridge application ports to Firebase services with minimal leakage of SDK details.
- Provide deterministic error mapping to application-friendly error objects.
- Keep Firebase initialization centralized and reuse handles across modules.

## Deliverables
- `src/infra/repositories/firestore-fish-repo.ts`
  - Export factory receiving Firestore instance and returning `FishRepository`.
  - Implement CRUD methods using `FirestoreDataConverter` from config.
  - Wrap SDK failures in `RepositoryError` before rethrowing.
- `src/infra/repositories/storage-photo-store.ts`
  - Upload blurred photo buffers to `fish_images/{id}/fish.png`.
  - Return both `imageUrl` (signed or public) and `imagePath`.
  - Handle cleanup on failures (delete partially uploaded files) and throw `StorageError` with context.
- `src/infra/services/image-processor.ts`
  - Wrap chosen library (`sharp`, `opencv4nodejs`, etc.) for blur and HSV extraction.
  - Provide pure output consumed by domain helpers (`hsvHistogram` data).
  - Translate native errors into `ImageProcessingError`.
- `src/infra/logging/cloud-logger.ts`
  - Already outlined in setup; ensure exported factory satisfies application port.
- Unit tests under `src/infra/repositories/__tests__/firestore-fish-repo.test.ts`, `src/infra/repositories/__tests__/storage-photo-store.test.ts`, and `src/infra/services/__tests__/image-processor.test.ts`.

## Public Interfaces
- `type FirestoreDeps = Readonly<{ firestore: FirebaseFirestore.Firestore; converter: FirebaseFirestore.FirestoreDataConverter<FishDocument> }>`
- `type StorageDeps = Readonly<{ storage: admin.storage.Storage; bucketName: string }>`
- `type ImageProcessorDeps = Readonly<{ blurSigma: number; colorSampleSize: number }>`
- `createFirestoreFishRepository(deps: FirestoreDeps): FishRepository`
- `createStoragePhotoStore(deps: StorageDeps): PhotoStorage`
- `createImageProcessor(deps: ImageProcessorDeps): ImageProcessor` with methods:
  - `blur(buffer: Buffer): Promise<Buffer>` — throws `ImageProcessingError`.
  - `extractHSV(buffer: Buffer): Promise<HSVPixel[]>` — throws `ImageProcessingError`.

## Error Contracts
- `createFirestoreFishRepository.save`
  - Throws `RepositoryError` with codes such as `FIRESTORE_WRITE_FAILED`; includes document id in `context`.
- `createFirestoreFishRepository.list`
  - Throws `RepositoryError` with codes such as `FIRESTORE_READ_FAILED`; includes query filters in `context`.
- `createStoragePhotoStore.upload`
  - Throws `StorageError` (`STORAGE_UPLOAD_FAILED`, `STORAGE_SIGNED_URL_FAILED`) and performs best-effort cleanup before propagating.
- `createImageProcessor.blur`
  - Throws `ImageProcessingError` when sharp/OpenCV rejects the buffer; attaches the failing operation in `context.operation`.
- `createImageProcessor.extractHSV`
  - Throws `ImageProcessingError` with `code = 'HSV_EXTRACTION_FAILED'` when color analysis fails.

## Steps
1. Build typed error helpers to normalize Firebase and native library exceptions into `AppError` subclasses.
2. Ensure repositories accept dependencies via constructor injection for testability.
3. Implement retry/backoff strategy (if needed) or note reliance on Firebase automatic retry.
4. Create mocks/stubs for use in unit tests under `__mocks__`.

## Testing
- Unit test each adapter using emulator/mocks (preferred: mocks to avoid heavy dependencies).
- Verify storage adapter handles both success and rollback paths.
- Confirm image processor outputs expected histogram on fixture data.
- Maintain project-wide coverage above 90%.
