/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingIncludes: {
    '/api/schedule': ['./data/schedule.xlsx', './data/schedule.seed.json'],
  },
};

export default nextConfig;
