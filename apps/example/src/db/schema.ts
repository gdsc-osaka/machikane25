import * as stores from "./schema/app/stores";
import * as staffInvitations from "./schema/app/staff-invitations";
import * as customers from "./schema/app/customers";
import * as profiles from "./schema/app/profiles";
import * as visits from "./schema/app/visits";
import * as storeApiKeys from "./schema/app/store-api-keys";
import * as auth from "./schema/auth/auth";

export const authSchema = auth;

export default {
  ...stores,
  ...staffInvitations,
  ...customers,
  ...profiles,
  ...visits,
  ...storeApiKeys,
};
