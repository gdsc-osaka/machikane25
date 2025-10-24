import type { RemoteConfig } from "firebase/remote-config";
import { Err, Ok, Result } from "neverthrow";

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

export type RemoteConfigError =
  | {
      type: "missing-key";
      message: string;
    }
  | {
      type: "invalid-payload";
      message: string;
      details?: string;
    };

const REMOTE_CONFIG_OPTIONS_KEY = "PHOTO_GENERATION_OPTIONS";

const isStringRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const mapResultArray = <T, U>(
  items: ReadonlyArray<T>,
  mapper: (item: T, index: number) => Result<U, RemoteConfigError>,
): Result<ReadonlyArray<U>, RemoteConfigError> => {
  const mapped: U[] = [];
  for (const [index, item] of items.entries()) {
    const result = mapper(item, index);
    if (result.isErr()) {
      return result;
    }
    mapped.push(result.value);
  }
  return Ok(mapped);
};

const parseOption = (
  raw: unknown,
  index: number,
): Result<GenerationOption, RemoteConfigError> => {
  if (!isStringRecord(raw)) {
    return Err({
      type: "invalid-payload",
      message: `Option at index ${index} must be an object`,
    });
  }
  const id = raw.id;
  const type = raw.type;
  const displayName = raw.displayName;
  const imagePathValue = raw.imagePath ?? null;
  const isActiveValue = raw.isActive;

  if (typeof id !== "string" || id.length === 0) {
    return Err({
      type: "invalid-payload",
      message: `Option at index ${index} is missing id`,
    });
  }
  if (
    typeof type !== "string" ||
    !Object.values(GenerationOptionType).some((value) => value === type)
  ) {
    return Err({
      type: "invalid-payload",
      message: `Option ${id} has invalid type`,
    });
  }
  if (!isStringRecord(displayName)) {
    return Err({
      type: "invalid-payload",
      message: `Option ${id} displayName must be an object`,
    });
  }
  const displayNameJa = displayName.ja;
  const displayNameEn = displayName.en;
  if (typeof displayNameJa !== "string" || typeof displayNameEn !== "string") {
    return Err({
      type: "invalid-payload",
      message: `Option ${id} displayName requires ja and en strings`,
    });
  }
  if (imagePathValue !== null && typeof imagePathValue !== "string") {
    return Err({
      type: "invalid-payload",
      message: `Option ${id} imagePath must be string or null`,
    });
  }
  if (typeof isActiveValue !== "boolean") {
    return Err({
      type: "invalid-payload",
      message: `Option ${id} isActive must be boolean`,
    });
  }
  return Ok({
    id,
    type,
    displayName: {
      ja: displayNameJa,
      en: displayNameEn,
    },
    imagePath: imagePathValue,
    isActive: isActiveValue,
  });
};

export const parseGenerationOptionsPayload = (
  payload: string,
): Result<GenerationOptionsConfig, RemoteConfigError> => {
  if (!payload) {
    return Err({
      type: "missing-key",
      message: `${REMOTE_CONFIG_OPTIONS_KEY} is empty`,
    });
  }
  try {
    const parsed = JSON.parse(payload);
    if (!isStringRecord(parsed)) {
      return Err({
        type: "invalid-payload",
        message: "Payload is not an object",
      });
    }
    const version = parsed.version;
    const updatedAtValue = parsed.updatedAt;
    const maintenanceModeValue =
      "maintenanceMode" in parsed ? parsed.maintenanceMode : false;
    const optionsValue = parsed.options ?? [];

    if (typeof version !== "number" || Number.isNaN(version)) {
      return Err({
        type: "invalid-payload",
        message: "version must be a number",
      });
    }
    if (typeof updatedAtValue !== "string") {
      return Err({
        type: "invalid-payload",
        message: "updatedAt must be ISO string",
      });
    }
    const updatedAt = new Date(updatedAtValue);
    if (Number.isNaN(updatedAt.getTime())) {
      return Err({
        type: "invalid-payload",
        message: "updatedAt is not a valid date",
      });
    }
    if (!Array.isArray(optionsValue)) {
      return Err({
        type: "invalid-payload",
        message: "options must be an array",
      });
    }
    const parsedOptions = mapResultArray(
      optionsValue,
      (option, index) => parseOption(option, index),
    );
    if (parsedOptions.isErr()) {
      return parsedOptions;
    }
    return Ok({
      version,
      updatedAt,
      maintenanceMode: Boolean(maintenanceModeValue),
      options: parsedOptions.value,
    });
  } catch (error) {
    return Err({
      type: "invalid-payload",
      message: "Failed to parse payload",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

type RemoteConfigLike = Pick<RemoteConfig, "getValue">;

export const readGenerationOptionsConfig = (
  source: RemoteConfigLike,
): Result<GenerationOptionsConfig, RemoteConfigError> => {
  const payload = source.getValue(REMOTE_CONFIG_OPTIONS_KEY).asString();
  return parseGenerationOptionsPayload(payload);
};

export const REMOTE_CONFIG_KEYS = {
  generationOptions: REMOTE_CONFIG_OPTIONS_KEY,
};
