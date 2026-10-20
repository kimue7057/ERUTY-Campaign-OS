import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  distDir: process.env.ERUTY_DIST_DIR ?? ".next",
};
export default nextConfig;
