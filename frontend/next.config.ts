import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  env: {
    JUDGE0_SELF_URL: process.env.JUDGE0_SELF_URL || "http://localhost:2358",
  },
};

export default nextConfig;
