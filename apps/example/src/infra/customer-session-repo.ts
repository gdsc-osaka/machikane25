import {
  DBCustomerSession,
  DBCustomerSessionForCreate,
} from "../domain/customer-session";
import { DBorTx } from "../db/db";
import { errAsync, okAsync, ResultAsync } from "neverthrow";
import { DBInternalError } from "./shared/db-error";
import { errorBuilder, InferError } from "../shared/error";
import { customerSessions } from "../db/schema/app/customer-sessions";
import { infraLogger } from "../logger";
import { eq } from "drizzle-orm";

export const DBCustomerSessionAlreadyExistsError = errorBuilder(
  "DBCustomerSessionAlreadyExistsError"
);
export type DBCustomerSessionAlreadyExistsError = InferError<
  typeof DBCustomerSessionAlreadyExistsError
>;

export const DBCustomerSessionNotFoundError = errorBuilder(
  "DBCustomerSessionNotFoundError"
);
export type DBCustomerSessionNotFoundError = InferError<
  typeof DBCustomerSessionNotFoundError
>;

const logger = infraLogger("customer-session-repo");

export type InsertDBCustomerSession = (
  db: DBorTx
) => (
  session: DBCustomerSessionForCreate
) => ResultAsync<
  DBCustomerSession,
  DBInternalError | DBCustomerSessionAlreadyExistsError
>;
export const insertDBCustomerSession: InsertDBCustomerSession =
  (db) => (session) =>
    ResultAsync.fromPromise(
      db.insert(customerSessions).values(session).returning(),
      DBInternalError.handle
    )
      .andThen((records) =>
        records.length > 0
          ? okAsync(records[0])
          : errAsync(
              DBCustomerSessionAlreadyExistsError(
                "Customer session already exists"
              )
            )
      )
      .andTee((record) =>
        logger.info(`Inserted customer session: ${record.id}`)
      )
      .orTee(logger.error);

export type FetchDBCustomerSessionByToken = (
  db: DBorTx
) => (
  token: string
) => ResultAsync<
  DBCustomerSession,
  DBInternalError | DBCustomerSessionNotFoundError
>;
export const fetchDBCustomerSessionByToken: FetchDBCustomerSessionByToken =
  (db) => (token) =>
    ResultAsync.fromPromise(
      db
        .select()
        .from(customerSessions)
        .where(eq(customerSessions.token, token)),
      DBInternalError.handle
    )
      .andThen((records) =>
        records.length > 0
          ? okAsync(records[0])
          : errAsync(
              DBCustomerSessionNotFoundError("Customer session not found")
            )
      )
      .andTee((record) =>
        logger.info(`Fetched customer session by token: ${record.token}`)
      )
      .orTee(logger.error);
