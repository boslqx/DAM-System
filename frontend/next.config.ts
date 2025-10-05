import type { NextConfig } from "next";
import type { Configuration } from "webpack";

const nextConfig: NextConfig = {
  webpack: (config: Configuration) => {
    if (!config.externals) config.externals = [];
    (config.externals as any[]).push({
      canvas: "commonjs canvas",
    });
    return config;
  },
};

export default nextConfig;
