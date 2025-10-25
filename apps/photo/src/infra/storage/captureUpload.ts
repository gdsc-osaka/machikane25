import {
  FirebaseStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  UploadMetadata,
} from "firebase/storage";

export type UploadConfig = Readonly<{
  maxSizeBytes: number;
  allowedMimeTypes: ReadonlyArray<string>;
  storageBucket: string;
}>;

export type UploadResult = Readonly<{
  storagePath: string;
  downloadUrl: string;
  uploadedAt: Date;
}>;

export type UploadError = Readonly<
  | {
      type: "invalid-mime-type";
      message: string;
      receivedMimeType: string;
      allowedMimeTypes: ReadonlyArray<string>;
    }
  | {
      type: "file-too-large";
      message: string;
      fileSize: number;
      maxSize: number;
    }
  | {
      type: "upload-failed";
      message: string;
      cause?: unknown;
    }
  | {
      type: "invalid-file";
      message: string;
    }
>;

const BYTES_PER_MB = 1024 * 1024;
const DEFAULT_MAX_SIZE_BYTES = 10 * BYTES_PER_MB; // 10MB
const DEFAULT_ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

export const defaultUploadConfig: UploadConfig = {
  maxSizeBytes: DEFAULT_MAX_SIZE_BYTES,
  allowedMimeTypes: DEFAULT_ALLOWED_MIME_TYPES,
  storageBucket: "originals",
};

const validateMimeType = (
  file: File,
  allowedTypes: ReadonlyArray<string>,
): void => {
  if (!allowedTypes.includes(file.type)) {
    const error: UploadError = {
      type: "invalid-mime-type",
      message: `File type ${file.type} is not allowed`,
      receivedMimeType: file.type,
      allowedMimeTypes: allowedTypes,
    };
    throw error;
  }
};

const validateFileSize = (file: File, maxSize: number): void => {
  if (file.size > maxSize) {
    const error: UploadError = {
      type: "file-too-large",
      message: `File size ${file.size} bytes exceeds maximum ${maxSize} bytes`,
      fileSize: file.size,
      maxSize,
    };
    throw error;
  }
};

const buildStoragePath = (
  sessionId: string,
  fileName: string,
  bucket: string,
): string => {
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
  const timestamp = Date.now();
  return `${bucket}/${sessionId}/${timestamp}-${sanitizedFileName}`;
};

export const uploadCapturedPhoto =
  (storage: FirebaseStorage, config: UploadConfig = defaultUploadConfig) =>
  async (sessionId: string, file: File): Promise<UploadResult> => {
    try {
      // Validate file
      if (!file || file.size === 0) {
        const error: UploadError = {
          type: "invalid-file",
          message: "File is required and cannot be empty",
        };
        throw error;
      }

      // Validate MIME type
      validateMimeType(file, config.allowedMimeTypes);

      // Validate file size
      validateFileSize(file, config.maxSizeBytes);

      // Build storage path
      const storagePath = buildStoragePath(
        sessionId,
        file.name,
        config.storageBucket,
      );

      // Create reference and metadata
      const storageRef = ref(storage, storagePath);
      const metadata: UploadMetadata = {
        contentType: file.type,
        customMetadata: {
          sessionId,
          originalFileName: file.name,
          uploadedAt: new Date().toISOString(),
        },
      };

      // Upload file
      let uploadedAt: Date;
      try {
        const uploadResult = await uploadBytes(storageRef, file, metadata);
        uploadedAt = new Date(uploadResult.metadata.timeCreated);
      } catch (uploadError) {
        const error: UploadError = {
          type: "upload-failed",
          message: "Failed to upload file to storage",
          cause: uploadError,
        };
        throw error;
      }

      // Get download URL
      let downloadUrl: string;
      try {
        downloadUrl = await getDownloadURL(storageRef);
      } catch (urlError) {
        // If we can't get the download URL, try to clean up the uploaded file
        try {
          await deleteObject(storageRef);
        } catch {
          // Ignore deletion errors
        }
        const error: UploadError = {
          type: "upload-failed",
          message: "Failed to retrieve download URL",
          cause: urlError,
        };
        throw error;
      }

      return {
        storagePath,
        downloadUrl,
        uploadedAt,
      };
    } catch (error) {
      // If it's already our error, rethrow
      if (
        typeof error === "object" &&
        error !== null &&
        "type" in error &&
        (error.type === "invalid-mime-type" ||
          error.type === "file-too-large" ||
          error.type === "upload-failed" ||
          error.type === "invalid-file")
      ) {
        throw error;
      }

      // Wrap unexpected errors
      const wrappedError: UploadError = {
        type: "upload-failed",
        message: "Unexpected error during upload",
        cause: error,
      };
      throw wrappedError;
    }
  };

export const deleteUploadedPhoto =
  (storage: FirebaseStorage) =>
  async (storagePath: string): Promise<void> => {
    try {
      const storageRef = ref(storage, storagePath);
      await deleteObject(storageRef);
    } catch (error) {
      // Log error but don't throw - deletion is best-effort
      console.error("Failed to delete uploaded photo:", storagePath, error);
    }
  };
