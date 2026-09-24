import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [{ source: "/api/skills/:id/skill.md", destination: "/api/skills/:id/markdown" }];
  },
};

export default nextConfig;
