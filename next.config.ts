import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Deliberately NOT output:"standalone" — the custom server.js entrypoint
  // calls next() directly against this build + node_modules, so the deploy
  // script ships source + runs `npm ci --omit=dev && npm run build` on the
  // LXC itself rather than copying a platform-built .next/standalone tree.
};

export default nextConfig;
