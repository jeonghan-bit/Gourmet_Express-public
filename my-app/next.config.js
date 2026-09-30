/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true, // Bypass Vercel Image Optimization to avoid 402 quota errors
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      ...(process.env.NEXT_PUBLIC_SUPABASE_URL
        ? [{
            protocol: 'https',
            hostname: new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname,
            pathname: '/storage/v1/object/public/**',
          }]
        : []),
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: '*.public.blob.vercel-storage.com',
      }
    ]
  }
};

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
  analyzerMode: 'static',
  reportFilename: './analyze/client.html',
});

module.exports = withBundleAnalyzer(nextConfig);
