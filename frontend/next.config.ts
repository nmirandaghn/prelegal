import path from "node:path";
import type { NextConfig } from "next";

// Absolute path to the repo-root templates/ directory, resolved from this file
// rather than the working directory, so `next build <dir>` and process managers
// started elsewhere still find it. An existing TEMPLATES_DIR wins, which lets a
// deployment point at a different location. Read at runtime in lib/templates.ts.
process.env.TEMPLATES_DIR ??= path.join(import.meta.dirname, "..", "templates");

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
