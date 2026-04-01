import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  typescript: { ignoreBuildErrors: false },
  reactStrictMode: false,
  images: { unoptimized: true },
  basePath: "/strategic-war-game",
  assetPrefix: "/strategic-war-game/",
};

export default nextConfig;
