/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: new URL('.', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'),
};

export default nextConfig;
