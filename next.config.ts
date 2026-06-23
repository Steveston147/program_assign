import type { NextConfig } from 'next';
const nextConfig: NextConfig = { outputFileTracingIncludes: { '/api/schedule': ['./data/schedule.xlsx'] } };
export default nextConfig;
