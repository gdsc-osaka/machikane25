import type { RemoteConfig } from "firebase/remote-config";

export type GenerationOptionType =
  | "location"
  | "outfit"
  | "person"
  | "style"
  | "pose";

export const GenerationOptionType = {
  Location: "location",
  Outfit: "outfit",
  Person: "person",
  Style: "style",
  Pose: "pose",
} satisfies Record<string, GenerationOptionType>;

export type GenerationOption = Readonly<{
  id: string;
  type: GenerationOptionType;
  displayName: Readonly<{
    ja: string;
    en: string;
  }>;
  imagePath: string | null;
  isActive: boolean;
}>;

export type GenerationOptionsConfig = Readonly<{
  version: number;
  updatedAt: Date;
  maintenanceMode: boolean;
  options: ReadonlyArray<GenerationOption>;
}>;

export type RemoteConfigError = Readonly<
  | {
      type: "missing-key";
      message: string;
    }
  | {
      type: "invalid-payload";
      message: string;
      details?: string;
    }
>;

const REMOTE_CONFIG_OPTIONS_KEY = "PHOTO_GENERATION_OPTIONS";

const isStringRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const buildRemoteConfigError = (
  type: RemoteConfigError["type"],
  message: string,
  details?: string,
): RemoteConfigError => {
  const error: RemoteConfigError = {
    type,
    message,
    details,
  };
  return error;
};

const isRemoteConfigError = (value: unknown): value is RemoteConfigError => {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const typeValue = Reflect.get(value, "type");
  const messageValue = Reflect.get(value, "message");
  if (
    messageValue === undefined ||
    typeof messageValue !== "string"
  ) {
    return false;
  }
  return (
    typeValue === "missing-key" ||
    typeValue === "invalid-payload"
  );
};

const extractErrorMessage = (value: unknown): string => {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "object" && value !== null) {
    const candidate = Reflect.get(value, "message");
    if (typeof candidate === "string") {
      return candidate;
    }
  }
  return "Unknown error";
};

const isGenerationOptionType = (
  value: unknown,
): value is GenerationOptionType =>
  typeof value === "string" &&
  Object.values(GenerationOptionType).some((candidate) => candidate === value);

const parseOption = (
  raw: unknown,
  index: number,
): GenerationOption => {
  if (!isStringRecord(raw)) {
    const error = buildRemoteConfigError(
      "invalid-payload",
      `Option at index ${index} must be an object`,
    );
    throw error;
  }
  const id = raw.id;
  const type = raw.type;
  const displayName = raw.displayName;
  const imagePathValue = raw.imagePath ?? null;
  const isActiveValue = raw.isActive;

  if (typeof id !== "string" || id.length === 0) {
    const error = buildRemoteConfigError(
      "invalid-payload",
      `Option at index ${index} is missing id`,
    );
    throw error;
  }
  if (!isGenerationOptionType(type)) {
    const error = buildRemoteConfigError(
      "invalid-payload",
      `Option ${id} has invalid type`,
    );
    throw error;
  }
  if (!isStringRecord(displayName)) {
    const error = buildRemoteConfigError(
      "invalid-payload",
      `Option ${id} displayName must be an object`,
    );
    throw error;
  }
  const displayNameJa = displayName.ja;
  const displayNameEn = displayName.en;
  if (typeof displayNameJa !== "string" || typeof displayNameEn !== "string") {
    const error = buildRemoteConfigError(
      "invalid-payload",
      `Option ${id} displayName requires ja and en strings`,
    );
    throw error;
  }
  if (imagePathValue !== null && typeof imagePathValue !== "string") {
    const error = buildRemoteConfigError(
      "invalid-payload",
      `Option ${id} imagePath must be string or null`,
    );
    throw error;
  }
  if (typeof isActiveValue !== "boolean") {
    const error = buildRemoteConfigError(
      "invalid-payload",
      `Option ${id} isActive must be boolean`,
    );
    throw error;
  }
  const option: GenerationOption = {
    id,
    type,
    displayName: {
      ja: displayNameJa,
      en: displayNameEn,
    },
    imagePath: imagePathValue,
    isActive: isActiveValue,
  };
  return option;
};

export const parseGenerationOptionsPayload = (
  payload: string,
): GenerationOptionsConfig => {
  if (!payload) {
    const error = buildRemoteConfigError(
      "missing-key",
      `${REMOTE_CONFIG_OPTIONS_KEY} is empty`,
    );
    throw error;
  }
  try {
    const parsed = JSON.parse(payload);
    if (!isStringRecord(parsed)) {
      const error = buildRemoteConfigError(
        "invalid-payload",
        "Payload is not an object",
      );
      throw error;
    }
    const version = parsed.version;
    const updatedAtValue = parsed.updatedAt;
    const maintenanceModeValue =
      "maintenanceMode" in parsed ? parsed.maintenanceMode : false;
    const optionsValue = parsed.options ?? [];

    if (typeof version !== "number" || Number.isNaN(version)) {
      const error = buildRemoteConfigError(
        "invalid-payload",
        "version must be a number",
      );
      throw error;
    }
    if (typeof updatedAtValue !== "string") {
      const error = buildRemoteConfigError(
        "invalid-payload",
        "updatedAt must be ISO string",
      );
      throw error;
    }
    const updatedAt = new Date(updatedAtValue);
    if (Number.isNaN(updatedAt.getTime())) {
      const error = buildRemoteConfigError(
        "invalid-payload",
        "updatedAt is not a valid date",
      );
      throw error;
    }
    if (!Array.isArray(optionsValue)) {
      const error = buildRemoteConfigError(
        "invalid-payload",
        "options must be an array",
      );
      throw error;
    }
    const parsedOptions = optionsValue.map((option, index) =>
      parseOption(option, index),
    );
    const config: GenerationOptionsConfig = {
      version,
      updatedAt,
      maintenanceMode: Boolean(maintenanceModeValue),
      options: parsedOptions,
    };
    return config;
  } catch (error) {
    if (isRemoteConfigError(error)) {
      throw error;
    }
    const fallback = buildRemoteConfigError(
      "invalid-payload",
      "Failed to parse payload",
      extractErrorMessage(error),
    );
    throw fallback;
  }
};

type RemoteConfigLike = {
  getValue: (key: string) => { asString: () => string };
};

export const readGenerationOptionsConfig = (
  source: RemoteConfigLike,
): GenerationOptionsConfig => {
  const payload = source.getValue(REMOTE_CONFIG_OPTIONS_KEY).asString();
  return parseGenerationOptionsPayload(payload);
};

export const REMOTE_CONFIG_KEYS = {
  generationOptions: REMOTE_CONFIG_OPTIONS_KEY,
};

