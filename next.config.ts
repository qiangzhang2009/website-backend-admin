import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  turbopack: {
    // Disable Turbopack for build — it crashes on non-ASCII directory paths
    enabled: false,
  },
};

export default nextConfig;
