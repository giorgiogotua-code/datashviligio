import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Required by OpenNext when we run `next build` ourselves (skipNextBuild path).
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

// Enables getCloudflareContext() during `next dev` (no-op for the rest of the app).
initOpenNextCloudflareForDev();

export default nextConfig
