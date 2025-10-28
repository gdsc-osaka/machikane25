import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    typedRoutes: true,
  },
  outputFileTracingRoot: "../../",
  typescript: {
    tsconfigPath: "./tsconfig.json",
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
};

export default withSentryConfig(nextConfig, {
  org: "gdgoc-osaka",
  project: "machikane25-photo",
  silent: !process.env.CI,
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
  disableLogger: true,
  automaticVercelMonitors: true,
});
