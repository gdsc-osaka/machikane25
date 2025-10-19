import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { authDB } from "./db/db";
import { authSchema } from "./db/schema";
// import { nextCookies } from "better-auth/next-js";
import env from "./env";
import { createStaff } from "./service/staff-service";
import { insertDBStaff } from "./infra/staff-repo";
import { match } from "ts-pattern";
import { DBInternalError } from "./infra/shared/db-error";
import { DBStaffAlreadyExistsError } from "./infra/staff-repo.error";
import { CreateNewStaffError, InvalidStaffError } from "./domain/staff";

export const auth = betterAuth({
  advanced: {
    // サブドメインで Cookie 共有する場合はコメントアウト
    crossSubDomainCookies:
      env.AUTH_COOKIE_DOMAIN !== undefined
        ? {
            enabled: true,
            domain: env.AUTH_COOKIE_DOMAIN,
          }
        : undefined,
    cookiePrefix: "",
    cookies: {
      session_token: {
        name: "__session",
        attributes: {
          // Set custom cookie attributes
        },
      },
    },
  },
  secret: env.AUTH_SECRET,
  basePath: "/api/v1/auth",
  trustedOrigins: [env.TRUSTED_ORIGIN_WEB],
  database: drizzleAdapter(authDB, {
    provider: "pg",
    schema: authSchema,
    usePlural: true,
  }),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    // nextCookies(),
    // /api/v1/auth/reference で OpenAPI Spec を取得する
    // openAPI(),
  ],
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          const res = await createStaff(insertDBStaff)(user);

          if (res.isErr()) {
            throw match(res.error)
              .with(
                DBInternalError.is,
                (e) =>
                  new APIError("INTERNAL_SERVER_ERROR", {
                    message: `Unknown error occurred while creating staff. ${e.message}`,
                  })
              )
              .with(
                DBStaffAlreadyExistsError.is,
                (e) =>
                  new APIError("CONFLICT", {
                    message: `Staff already exists for user ${user.id}. ${e.message}`,
                  })
              )
              .with(
                InvalidStaffError.is,
                (e) =>
                  new APIError("INTERNAL_SERVER_ERROR", {
                    message: `Database schema is inconsistent with domain model. Please report to the developers. ${e.message}`,
                  })
              )
              .with(
                CreateNewStaffError.is,
                (e) =>
                  new APIError("BAD_REQUEST", {
                    message: `User type is not valid. Please report to the developers. ${e.message}`,
                  })
              )
              .exhaustive();
          }
        },
      },
    },
  },
  hooks: {
    // before: createAuthMiddleware(async (ctx) => {
    //   if (ctx.path.startsWith("/get-session")) {
    //     const session = ctx.context.session;
    //
    //   }
    //
    //   return ctx;
    // }),
  },
});
