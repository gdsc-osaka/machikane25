import { drizzle, PostgresJsQueryResultHKT } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import schema, { authSchema } from "./schema";
import env from "../env";
import type { PgTransaction } from "drizzle-orm/pg-core/session";
import { ExtractTablesWithRelations } from "drizzle-orm";

function getDBUrl(): string {
  if (env.NODE_ENV === "production") {
    return env.DATABASE_URL ?? "";
  }
  return "postgres://user:password@localhost:5432/db";
}
const db = drizzle(postgres(getDBUrl()), { schema });

function getAuthDBUrl(): string {
  if (env.NODE_ENV === "production") {
    return env.AUTH_DATABASE_URL ?? "";
  }
  return "postgres://user:password@localhost:5432/auth_db";
}

export const authDB = drizzle(postgres(getAuthDBUrl()), { schema: authSchema });

export type Transaction = PgTransaction<
  PostgresJsQueryResultHKT,
  typeof schema,
  ExtractTablesWithRelations<typeof schema>
>;

export type DB = typeof db;
export type DBorTx = DB | Transaction;

export default db;
