import { Ok, Result } from "neverthrow";
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

const CACHE_KEY = "generation-options";
const CACHE_TTL_MS = 5 * 60 * 1000;

const cache = new Map<
  string,
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

export const loadGenerationOptions = (
  remoteConfig: RemoteConfigLike,
  input: { now: Date },
): Result<GenerationOptionsState, RemoteConfigError> => {
  const cached = cache.get(CACHE_KEY);
  if (cached && cached.expiresAt > input.now.getTime()) {
    return Ok(cached.value);
  }
  const configResult = readGenerationOptionsConfig(remoteConfig);
  if (configResult.isErr()) {
    return configResult;
  }
  const state = buildState(configResult.value);
  cache.set(CACHE_KEY, {
    value: state,
    expiresAt: input.now.getTime() + CACHE_TTL_MS,
  });
  return Ok(state);
};

export const selectOptionsByType = (
  state: GenerationOptionsState,
  type: GenerationOptionType,
) =>
  state.options.filter((option) => option.type === type);

export const resetGenerationOptionsCache = () => {
  cache.clear();
};
