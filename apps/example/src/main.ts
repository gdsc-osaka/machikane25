import { serve } from "@hono/node-server";
import { cors } from "hono/cors";
import { MyOpenAPIHono } from "./openapi-spec";
import env from "./env";
import { logger } from "./routes/middleware/logger";
import authorize from "./routes/middleware/authorize";
import auth from "./routes/auth";
import stores from "./routes/stores";
import staffs from "./routes/staffs";
import invitations from "./routes/invitations";
import customers from "./routes/customers";
import { apiKeyHeaderKey, customerSessionHeaderKey } from "./shared/const";

const app = MyOpenAPIHono({
  docPath: "/api/openapi",
  swaggerPath: "/api/swagger",
});

// Production 環境では Firebase Hosting で /api/** のパスをリダクレクトするため、
// ここでは /api/** のパスを受け取る

app.use(
  "/*",
  cors({
    origin: [env.TRUSTED_ORIGIN_WEB],
    credentials: true,
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: [
      "Content-Type",
      "Authorization",
      apiKeyHeaderKey,
      customerSessionHeaderKey,
    ],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  })
);
app.use(logger);
app.get("/api/ping", (c) => c.text("pong"));

// Auth
app.route("/api/v1/auth", auth);

app.use("/api/*", authorize);

// endpoint
app.route("/api/v1/stores", stores);
app.route("/api/v1/staffs", staffs);
app.route("/api/v1/invitations", invitations);
app.route("/api/v1/customers", customers);

serve({
  fetch: app.fetch,
  port: env.PORT,
});

console.log("Server started");

if (env.NODE_ENV === "development") {
  console.log(`- http://localhost:${env.PORT}`);
  console.log(`- Swagger UI: http://localhost:${env.PORT}/api/swagger`);
  console.log(`- OpenAPI Spec: http://localhost:${env.PORT}/api/openapi`);
}
