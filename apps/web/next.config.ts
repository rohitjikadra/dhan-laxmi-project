import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@dlbh/rules", "@dlbh/shared"],
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
