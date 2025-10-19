import { profiles } from "../db/schema/app/profiles";
import { z } from "@hono/zod-openapi";
import { err, ok, Result } from "neverthrow";
import { Timestamp, toTimestamp } from "./timestamp";
import { FieldErrors, ForUpdate, OmitBrand } from "./shared/types";
import { errorBuilder, InferError } from "../shared/error";
import {
  Customer,
  DBCustomer,
  InvalidCustomerError,
  validateCustomer,
} from "./customer";

export const ProfileId = z.string().min(1).brand<"PROFILE_ID">();
export type ProfileId = z.infer<typeof ProfileId>;

export const Profile = z
  .object({
    id: ProfileId,
    gender: z.string().optional(),
    birthday: z.coerce.date().optional(),
    birthplace: z.string().optional(),
    business: z.string().optional(),
    partner: z.string().optional(),
    hobby: z.string().optional(),
    news: z.string().optional(),
    worry: z.string().optional(),
    store: z.string().optional(),
    createdAt: Timestamp,
    updatedAt: Timestamp,
  })
  .openapi("Profile");
export type Profile = z.infer<typeof Profile>;

export const CustomerWithProfiles = z
  .object({
    customer: Customer,
    profiles: Profile.array(),
  })
  .openapi("CustomerWithProfiles");
export type CustomerWithProfiles = z.infer<typeof CustomerWithProfiles>;

export type DBProfile = typeof profiles.$inferSelect;
export type DBProfileForCreate = typeof profiles.$inferInsert;
export type DBProfileForUpdate = ForUpdate<DBProfile>;

export type DBCustomerWithProfiles = {
  customer: DBCustomer;
  profiles: DBProfile[];
};

export const InvalidProfileError = errorBuilder<
  "InvalidProfileError",
  FieldErrors<typeof Profile>
>("InvalidProfileError");
export type InvalidProfileError = InferError<typeof InvalidProfileError>;

export const validateProfile = (
  profile: DBProfile
): Result<Profile, InvalidProfileError> => {
  const res = Profile.safeParse({
    id: profile.id as ProfileId,
    gender: profile.gender ?? undefined,
    birthday: profile.birthday ?? undefined,
    birthplace: profile.birthplace ?? undefined,
    business: profile.business ?? undefined,
    partner: profile.partner ?? undefined,
    hobby: profile.hobby ?? undefined,
    news: profile.news ?? undefined,
    worry: profile.worry ?? undefined,
    store: profile.store ?? undefined,
    createdAt: toTimestamp(profile.createdAt),
    updatedAt: toTimestamp(profile.updatedAt),
  } satisfies OmitBrand<Profile>);

  if (res.success) return ok(res.data);

  return err(
    InvalidProfileError("Invalid profile data", {
      cause: res.error,
      extra: res.error.flatten().fieldErrors,
    })
  );
};

export const validateCustomerWithProfiles = (
  customerWithProfiles: DBCustomerWithProfiles
): Result<CustomerWithProfiles, InvalidCustomerError | InvalidProfileError> => {
  return Result.combine([
    validateCustomer(customerWithProfiles.customer),
    Result.combine(customerWithProfiles.profiles.map(validateProfile)),
  ]).map(([customer, profiles]) => ({
    customer,
    profiles,
  }));
};

export const validateCustomerWithProfilesList = (
  customersWithProfiles: DBCustomerWithProfiles[]
): Result<
  CustomerWithProfiles[],
  InvalidCustomerError | InvalidProfileError
> => {
  return Result.combine(
    customersWithProfiles.map(validateCustomerWithProfiles)
  );
};
