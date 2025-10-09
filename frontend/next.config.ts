import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config: any) => {
    if (!config.externals) config.externals = [];
    (config.externals as any[]).push({
      canvas: "commonjs canvas",
    });
    return config;
  },
  async rewrites() {
    const backend = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";
    return [
      { source: "/api/:path*", destination: `${backend}/api/:path*` },
      { source: "/media/:path*", destination: `${backend}/media/:path*` },
      { source: "/static/:path*", destination: `${backend}/static/:path*` },
    ];
  },
};

export default nextConfig;
