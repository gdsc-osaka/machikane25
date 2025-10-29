import { customers } from "../db/schema/app/customers";
import z from "zod";
import { Timestamp, toTimestamp } from "./timestamp";
import { errorBuilder, InferError } from "../shared/error";
import { FieldErrors, ForUpdate } from "./shared/types";
import { Result, ok, err } from "neverthrow";
import { DBStore } from "./store";
import { createId } from "@paralleldrive/cuid2";

export type DBCustomer = typeof customers.$inferSelect;
export type DBCustomerForCreate = typeof customers.$inferInsert;
export type DBCustomerForUpdate = ForUpdate<DBCustomer>;

export const CustomerId = z.string().brand<"CUSTOMER_ID">();
export type CustomerId = z.infer<typeof CustomerId>;

export const Customer = z
  .object({
    id: CustomerId,
    tosAcceptedAt: Timestamp.optional(),
    createdAt: Timestamp,
    updatedAt: Timestamp,
  })
  .brand<"CUSTOMER">()
  .openapi("Customer");
export type Customer = z.infer<typeof Customer>;

export const InvalidCustomerError = errorBuilder<
  "InvalidCustomerError",
  FieldErrors<typeof Customer>
>("InvalidCustomerError");
export type InvalidCustomerError = InferError<typeof InvalidCustomerError>;

// ADDED: Error for when ToS has already been accepted
export const CustomerTosAlreadyAcceptedError = errorBuilder(
  "CustomerTosAlreadyAcceptedError"
);
export type CustomerTosAlreadyAcceptedError = InferError<
  typeof CustomerTosAlreadyAcceptedError
>;

export const checkTosNotAccepted = (
  customer: DBCustomer
): Result<DBCustomer, CustomerTosAlreadyAcceptedError> => {
  if (customer.tosAcceptedAt !== null) {
    return err(
      CustomerTosAlreadyAcceptedError("Terms of Service already accepted.")
    );
  }
  return ok(customer);
};

export const CustomerNotBelongsToStoreError = errorBuilder(
  "CustomerNotBelongsToStoreError"
);
export type CustomerNotBelongsToStoreError = InferError<
  typeof CustomerNotBelongsToStoreError
>;

export const checkCustomerBelongsToStore = (
  customer: DBCustomer,
  store: DBStore
): Result<DBCustomer, CustomerNotBelongsToStoreError> => {
  if (customer.storeId !== store.id) {
    return err(
      CustomerNotBelongsToStoreError(
        `Customer with id ${customer.id} does not belong to store with id ${store.id}.`
      )
    );
  }
  return ok(customer);
};

export const createCustomer = (
  store: DBStore
): Result<DBCustomerForCreate, never> => {
  return ok({
    id: createId(), // CUID
    tosAcceptedAt: null,
    storeId: store.id,
  });
};

export const createCustomerWithTosAccepted = (
  customer: DBCustomer
): Result<DBCustomerForUpdate, never> => {
  return ok({
    id: customer.id,
    tosAcceptedAt: new Date(),
  });
};

export const validateCustomer = (
  customer: DBCustomer
): Result<Customer, InvalidCustomerError> => {
  const res = Customer.safeParse({
    id: customer.id as CustomerId,
    // UPDATED: Handle nullable tosAcceptedAt
    tosAcceptedAt: customer.tosAcceptedAt
      ? toTimestamp(customer.tosAcceptedAt)
      : undefined,
    createdAt: toTimestamp(customer.createdAt),
    updatedAt: toTimestamp(customer.updatedAt),
  });

  if (res.success) return ok(res.data);

  return err(
    InvalidCustomerError("Invalid customer data", {
      cause: res.error,
      extra: res.error.flatten().fieldErrors,
    })
  );
};

export const validateCustomers = (
  customers: DBCustomer[]
): Result<Customer[], InvalidCustomerError> => {
  return Result.combine(
    customers.map((customer) => validateCustomer(customer))
  );
};
