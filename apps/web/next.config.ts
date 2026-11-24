import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@dlbh/rules", "@dlbh/shared"],
};

export default nextConfig;
