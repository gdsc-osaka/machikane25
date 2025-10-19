import { ForUpdate } from "./shared/types";
import { storeApiKeys } from "../db/schema/app/store-api-keys";
import { z } from "@hono/zod-openapi";
import { DBStore } from "./store";
import { ok, Result } from "neverthrow";
import { randomBytes } from "crypto";
import { Timestamp, toTimestamp } from "./timestamp";

export type DBStoreApiKey = typeof storeApiKeys.$inferSelect;
export type DBStoreApiKeyForCreate = typeof storeApiKeys.$inferInsert;
export type DBStoreApiKeyForUpdate = ForUpdate<DBStoreApiKey>;

export const ApiKey = z.string().brand("API_KEY");
export type ApiKey = z.infer<typeof ApiKey>;

export const StoreApiKey = z
  .object({
    apiKey: ApiKey,
    createdAt: Timestamp,
  })
  .openapi("StoreApiKey");
export type StoreApiKey = z.infer<typeof StoreApiKey>;

export const createDBStoreApiKey = (
  store: DBStore
): Result<DBStoreApiKeyForCreate, never> => {
  const randomData = randomBytes(32);
  const apiKeyBase64Url = randomData.toString("base64url");

  return ok({
    apiKey: `recall_live_${apiKeyBase64Url}`,
    storeId: store.id,
  });
};

export const validateStoreApiKey = (
  storeApiKey: DBStoreApiKey
): Result<StoreApiKey, never> => {
  return ok({
    apiKey: storeApiKey.apiKey as ApiKey,
    createdAt: toTimestamp(storeApiKey.createdAt),
  });
};
