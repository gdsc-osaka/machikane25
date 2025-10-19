import { err, ok, ResultAsync } from "neverthrow";
import {
  DBCustomer,
  DBCustomerForCreate,
  DBCustomerForUpdate,
} from "../domain/customer";
import { and, eq, isNull } from "drizzle-orm";
import { customers } from "../db/schema/app/customers";
import { DBorTx } from "../db/db";
import { DBInternalError } from "./shared/db-error";
import {
  CustomerAlreadyExistsError,
  CustomerNotFoundError,
} from "./customer-repo.error";
import { visits } from "../db/schema/app/visits";
import { infraLogger } from "../logger";
import { DBCustomerWithProfiles } from "../domain/profile";

export type InserttDBCustomer = (
  db: DBorTx
) => (
  customer: DBCustomerForCreate
) => ResultAsync<DBCustomer, DBInternalError | CustomerAlreadyExistsError>;

export const insertDBCustomer: InserttDBCustomer = (db) => (customer) =>
  ResultAsync.fromPromise(
    db.insert(customers).values(customer).returning(),
    DBInternalError.handle
  ).andThen((records) =>
    records.length > 0
      ? ok(records[0])
      : err(CustomerAlreadyExistsError("Customer already exists"))
  );

export type FindDBCustomerById = (
  db: DBorTx
) => (
  id: string
) => ResultAsync<DBCustomer, DBInternalError | CustomerNotFoundError>;

export const findDBCustomerById: FindDBCustomerById = (db) => (id) =>
  ResultAsync.fromPromise(
    db.select().from(customers).where(eq(customers.id, id)).limit(1),
    DBInternalError.handle
  ).andThen((records) =>
    records.length > 0
      ? ok(records[0])
      : err(CustomerNotFoundError("Customer not found"))
  );

export type FindVisitingDBCustomersByStoreId = (
  db: DBorTx
) => (
  storeId: string
) => ResultAsync<
  DBCustomerWithProfiles[],
  DBInternalError | CustomerNotFoundError
>;

export const findVisitingDBCustomersByStoreId: FindVisitingDBCustomersByStoreId =
  (db) => (storeId) =>
    ResultAsync.fromPromise(
      db.query.visits.findMany({
        with: {
          customer: {
            with: {
              profiles: true,
            },
          },
        },
        where: and(isNull(visits.checkoutAt), eq(visits.storeId, storeId)),
      }),
      DBInternalError.handle
    )
      .andThen((records) =>
        records.length > 0
          ? ok(
              records.map(({ customer: { profiles, ...customer } }) => ({
                customer: customer,
                profiles: profiles || [],
              }))
            )
          : err(CustomerNotFoundError("No visiting customers found for store"))
      )
      .orTee(infraLogger("findVisitingDBCustomersByStoreId").error);

// ADDED: Function to update a customer record
export type UpdateDBCustomer = (
  db: DBorTx
) => (
  customer: DBCustomerForUpdate
) => ResultAsync<DBCustomer, DBInternalError | CustomerNotFoundError>;

export const updateDBCustomer: UpdateDBCustomer = (db) => (customer) =>
  ResultAsync.fromPromise(
    db
      .update(customers)
      .set(customer)
      .where(eq(customers.id, customer.id))
      .returning(),
    DBInternalError.handle
  ).andThen((records) =>
    records.length > 0
      ? ok(records[0])
      : err(CustomerNotFoundError("Customer not found during update"))
  );

export type DeleteDBCustomerById = (
  db: DBorTx
) => (id: string) => ResultAsync<void, DBInternalError | CustomerNotFoundError>;

export const deleteDBCustomerById: DeleteDBCustomerById = (db) => (id) =>
  ResultAsync.fromPromise(
    db
      .delete(customers)
      .where(eq(customers.id, id))
      .returning({ id: customers.id }),
    DBInternalError.handle
  ).andThen((deletedRecords) =>
    deletedRecords.length > 0
      ? ok(undefined)
      : err(CustomerNotFoundError("Customer not found during delete"))
  );
