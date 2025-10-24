import {
  GenerationOptionType,
  GenerationOptionsConfig,
  readGenerationOptionsConfig,
  RemoteConfigError,
} from "@/infra/remoteConfig";

type RemoteConfigLike = Parameters<typeof readGenerationOptionsConfig>[0];

export type GenerationOptionsState = Readonly<{
  version: number;
  updatedAt: Date;
  maintenanceMode: boolean;
  options: ReadonlyArray<GenerationOptionsConfig["options"][number]>;
}>;

const CACHE_TTL_MS = 5 * 60 * 1000;

const cache = new Map<
  RemoteConfigLike,
  { value: GenerationOptionsState; expiresAt: number }
>();

const buildState = (
  config: GenerationOptionsConfig,
): GenerationOptionsState => ({
  version: config.version,
  updatedAt: config.updatedAt,
  maintenanceMode: config.maintenanceMode,
  options: config.options.filter((option) => option.isActive),
});

const isRemoteConfigError = (
  value: unknown,
): value is RemoteConfigError => {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const typeValue = Reflect.get(value, "type");
  const messageValue = Reflect.get(value, "message");
  return (
    (typeValue === "missing-key" || typeValue === "invalid-payload") &&
    typeof messageValue === "string"
  );
};

const buildLoadError = (
  error: unknown,
): RemoteConfigError | Error => {
  if (isRemoteConfigError(error)) {
    const details =
      typeof error.details === "string" && error.details.length > 0
        ? ` (${error.details})`
        : "";
    return {
      ...error,
      message: `[${error.type}] ${error.message}${details}`,
    };
  }
  if (error instanceof Error) {
    return error;
  }
  return new Error("Failed to load generation options");
};

export const loadGenerationOptions = (
  remoteConfig: RemoteConfigLike,
  input: { now: Date },
): GenerationOptionsState => {
  const cached = cache.get(remoteConfig);
  if (cached && cached.expiresAt > input.now.getTime()) {
    return cached.value;
  }
  try {
    const config = readGenerationOptionsConfig(remoteConfig);
    const state = buildState(config);
    cache.set(remoteConfig, {
      value: state,
      expiresAt: input.now.getTime() + CACHE_TTL_MS,
    });
    return state;
  } catch (error) {
    if (cache.has(remoteConfig)) {
      cache.delete(remoteConfig);
    }
    throw buildLoadError(error);
  }
};

export const selectOptionsByType = (
  state: GenerationOptionsState,
  type: GenerationOptionType,
) =>
  state.options.filter((option) => option.type === type);

export const resetGenerationOptionsCache = () => {
  cache.clear();
};
