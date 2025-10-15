// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/
/* v8 ignore start */

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://dbd643a55ee51e019451d5644ff3f40a@o4510180282335232.ingest.us.sentry.io/4510180284366848",

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: 1,

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Enable sending user PII (Personally Identifiable Information)
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
  sendDefaultPii: true,
});

/* v8 ignore stop */