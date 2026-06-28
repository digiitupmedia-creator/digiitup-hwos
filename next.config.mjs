/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    cpus: 1,
    serverActions: {
      bodySizeLimit: '25mb',
    },
  },
};

export default nextConfig;
