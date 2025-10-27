/**
 * T210 [FOUND] Application: GenerationService (Options)
 *
 * Service for managing generation options
 * Server-side only (uses Admin SDK)
 */

import type { GroupedGenerationOptions } from "@/domain/generationOption";
import { fetchAllOptions } from "@/infra/firebase/generationOptionRepository";
import { getAdminFirestore } from "@/lib/firebase/admin";

const ONE_DAY_IN_MS = 24 * 60 * 60 * 1000;

type FirestoreTimestamp = {
  toMillis: () => number;
};

type FirestoreGeneratedPhoto = {
  imageUrl?: unknown;
  createdAt?: unknown;
};

type GeneratedPhoto = {
  id: string;
  imageUrl: string;
};

const hasToMillis = (value: unknown): value is FirestoreTimestamp => {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const maybeToMillis = Reflect.get(value, "toMillis");
  return typeof maybeToMillis === "function";
};

const isFirestoreGeneratedPhoto = (
  value: unknown,
): value is FirestoreGeneratedPhoto => typeof value === "object" && value !== null;

const createNamedError = (name: string, message: string): Error => {
  const error = new Error(message);
  error.name = name;
  return error;
};

const isNamedError = (value: unknown, expectedName: string): boolean => {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const name = Reflect.get(value, "name");
  return name === expectedName;
};

export const isPhotoNotFoundError = (value: unknown): boolean =>
  isNamedError(value, "PhotoNotFoundError");

export const isPhotoExpiredError = (value: unknown): boolean =>
  isNamedError(value, "PhotoExpiredError");

/**
 * Get all generation options grouped by typeId
 * Uses reduce to group options by typeId (AGENTS.md: prefer array methods over loops)
 *
 * @returns Promise resolving to grouped generation options
 *          Example: { location: [...], outfit: [...], style: [...] }
 */
export const getOptions = async (): Promise<GroupedGenerationOptions> => {
  const options = await fetchAllOptions();

  // Group options by typeId using reduce (AGENTS.md: prefer functional programming)
  const grouped = options.reduce<GroupedGenerationOptions>(
    (accumulator, option) => {
      const typeId = option.typeId;
      const existingGroup = accumulator[typeId] ?? [];
      return {
        ...accumulator,
        [typeId]: [...existingGroup, option],
      };
    },
    {},
  );

  return grouped;
};

/**
 * Placeholder for Gemini generation (implemented in later tasks).
 */
export const generateImage = async (
  boothId: string,
  uploadedPhotoId: string,
  options: Record<string, string>,
): Promise<void> => {
  const apiKey = process.env.GEMINI_API_KEY ?? "";
  const endpoint =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent";

  await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
    },
    body: JSON.stringify({
      boothId,
      uploadedPhotoId,
      options,
    }),
  });
};

/**
 * Retrieve generated photo metadata by id.
 * Throws PhotoNotFoundError when document is missing and PhotoExpiredError when older than 24 hours.
 */
export const getGeneratedPhoto = async (photoId: string): Promise<GeneratedPhoto> => {
  const firestore = getAdminFirestore();
  const snapshot = await firestore.collection("generatedPhotos").doc(photoId).get();

  if (!snapshot.exists) {
    throw createNamedError("PhotoNotFoundError", "Generated photo not found");
  }

  const data = snapshot.data();

  if (!isFirestoreGeneratedPhoto(data)) {
    throw createNamedError(
      "PhotoNotFoundError",
      "Generated photo document is missing required fields",
    );
  }

  const rawImageUrl = data.imageUrl;
  const rawCreatedAt = data.createdAt;

  if (typeof rawImageUrl !== "string" || rawImageUrl.length === 0) {
    throw createNamedError(
      "PhotoNotFoundError",
      "Generated photo document has no imageUrl",
    );
  }

  if (!hasToMillis(rawCreatedAt)) {
    throw createNamedError(
      "PhotoNotFoundError",
      "Generated photo document has invalid createdAt",
    );
  }

  const ageInMs = Date.now() - rawCreatedAt.toMillis();

  if (ageInMs > ONE_DAY_IN_MS) {
    throw createNamedError("PhotoExpiredError", "Generated photo download expired");
  }

  return {
    id: photoId,
    imageUrl: rawImageUrl,
  };
};
