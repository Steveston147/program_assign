/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingIncludes: {
    '/api/schedule': ['./data/schedule.xlsx'],
  },
};

export default nextConfig;
