import { ForUpdate } from "./shared/types";
import { customerSessions } from "../db/schema/app/customer-sessions";
import z from "zod";
import { Timestamp, toTimestamp } from "./timestamp";
import {
  Customer,
  DBCustomer,
  InvalidCustomerError,
  validateCustomer,
} from "./customer";
import { ok, Result } from "neverthrow";

export type DBCustomerSession = typeof customerSessions.$inferSelect;
export type DBCustomerSessionForCreate = typeof customerSessions.$inferInsert;
export type DBCustomerSessionForUpdate = ForUpdate<DBCustomerSession>;

export const CustomerSession = z
  .object({
    customer: Customer,
    token: z.string(),
    expiresAt: Timestamp,
  })
  .brand<"CUStOMER_SESSION">()
  .openapi("CustomerSession");
export type CustomerSession = z.infer<typeof CustomerSession>;

export const createCustomerSession = (
  customer: Pick<DBCustomer, "id">
): Result<DBCustomerSessionForCreate, never> => {
  return ok({
    customerId: customer.id,
    token: crypto.randomUUID().replace(/-/g, ""),
    // expires after 14 days
    expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
  });
};

export const validateCustomerSession = (
  customer: DBCustomer,
  session: DBCustomerSession
): Result<CustomerSession, InvalidCustomerError> => {
  return validateCustomer(customer).map(
    (customer) =>
      ({
        customer: customer,
        token: session.token,
        expiresAt: toTimestamp(session.expiresAt),
      }) as CustomerSession
  );
};
