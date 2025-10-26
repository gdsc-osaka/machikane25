# Implementation Exclusions

This document lists features and components that are explicitly excluded from implementation for this project (`apps/photo`).

## PhotoCleaner Function Integration

**Status**: Not Implemented in `apps/photo`

**Reason**: The PhotoCleaner function (automatic deletion of uploaded photos after 15 minutes or immediate deletion after use) is implemented as a separate Firebase Function in `apps/photo-cleaner`, but is NOT integrated or tested within the `apps/photo` application scope.

**Impact**:
- `apps/photo` does NOT implement PhotoCleaner logic
- `apps/photo` does NOT include PhotoCleaner integration tests
- PhotoCleaner functionality is delegated to the separate `apps/photo-cleaner` Firebase Function

**Manual Cleanup**:
- Uploaded photos cleanup is handled by `apps/photo-cleaner` (separate application)
- If `apps/photo-cleaner` is not deployed, operators must manually delete old photos from Firebase Console
- Storage quotas should be monitored manually

**Related Requirements Affected**:
- FR-006: System MUST UploadedPhoto データについて、生成に使用された場合は生成完了後速やかに削除し（Firestoreドキュメントと photos/{photoId}/photo.png の両方）、使用されなかった場合は createdAt から15分後に自動削除する（PhotoCleaner Firebase Functionによる）。
  - **Status**: Implementation is in `apps/photo-cleaner`, NOT in `apps/photo`

**Excluded from `apps/photo` scope**:
- PhotoCleaner integration in `apps/photo` application
- PhotoCleaner integration tests in `apps/photo/test`

**Note**: `apps/photo-cleaner` is a separate Firebase Function application that handles photo cleanup independently.

**Date**: 2025-10-26
