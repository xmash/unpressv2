import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "export",
  outputFileTracingRoot: __dirname,
  experimental: {
    externalDir: true,
  },
};

export default nextConfig;
