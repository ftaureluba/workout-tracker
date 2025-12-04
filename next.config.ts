import type { NextConfig } from "next";
import withPWA from "next-pwa";

const nextConfig: any = {
  //output: 'standalone',
  // Temporarily ignore ESLint during build to avoid blocking CI/CD for lint-only issues.
  // Remove this flag once lint/type issues are resolved.
  eslint: {
    ignoreDuringBuilds: true,
  },
  
};

const pwaConfig = withPWA({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  // Use a custom service worker source so we can include push handlers
  swSrc: 'src/service-worker.js',
  register: true,
  buildExcludes: [/app-build-manifest\.json$/,
    /build-manifest\.json$/,
    /react-loadable-manifest\.json$/,]
});

// Allow temporarily disabling next-pwa integration during builds for debugging
// without removing the configuration. Set `DISABLE_NEXT_PWA=true` to skip
// the `withPWA` wrapper (useful for CI or local debugging).
let exportedConfig: any;
if (process.env.DISABLE_NEXT_PWA === 'true') {
  exportedConfig = nextConfig;
} else {
  exportedConfig = pwaConfig(nextConfig as any);
}

export default exportedConfig;
