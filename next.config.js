/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next.js 14: must be under `experimental`. Promoted to top-level in Next.js 15.
  experimental: {
    serverComponentsExternalPackages: ['stripe', '@supabase/supabase-js'],
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },
}

module.exports = nextConfig
