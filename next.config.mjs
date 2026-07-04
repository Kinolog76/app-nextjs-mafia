/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  webpack: (config) => {
    config.watchOptions = {
      ...config.watchOptions,
      ignored: ['**/node_modules/**', '**/.playwright-mcp/**', '**/.next/**'],
    };
    return config;
  },
};

export default nextConfig;
