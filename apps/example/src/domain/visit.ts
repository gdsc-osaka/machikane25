import { ForUpdate } from "./shared/types";
import { visits } from "../db/schema/app/visits";
import { ok, Result } from "neverthrow";
import { createCustomer, DBCustomerForCreate } from "./customer";
import { DBStore } from "./store";

export type DBVisit = typeof visits.$inferSelect;
export type DBVisitForCreate = typeof visits.$inferInsert;
export type DBVisitForUpdate = ForUpdate<DBVisit>;

export const createVisit = (
  storeId: string,
  customerId: string
): Result<DBVisitForCreate, never> => {
  return ok({
    storeId,
    customerId,
    checkinAt: new Date(),
    checkoutAt: null,
  });
};

export const createVisitForCheckout = (): Result<
  Pick<DBVisitForUpdate, "checkoutAt">,
  never
> => {
  return ok({
    checkoutAt: new Date(),
  });
};

export const createVisitAndCustomer = (
  store: DBStore
): Result<
  {
    customer: DBCustomerForCreate;
    visit: DBVisitForCreate;
  },
  never
> => {
  return createCustomer(store).andThen((customer) =>
    createVisit(store.id, customer.id).map((visit) => ({
      customer,
      visit,
    }))
  );
};
