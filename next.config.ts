import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Force WASM-based SWC transform — avoids needing the native .node binary
    // which times out on restricted/OneDrive-synced environments
    forceSwcTransforms: true,
  },
};

export default nextConfig;
