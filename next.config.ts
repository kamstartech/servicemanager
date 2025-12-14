import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  
  // Allow Cloudflare Web Analytics (Insights) when using tunnel
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://static.cloudflareinsights.com",
              "connect-src 'self' https://cloudflareinsights.com",
              "img-src 'self' data: https:",
              "style-src 'self' 'unsafe-inline'",
              "font-src 'self' data:",
            ].join('; ')
          },
        ],
      },
    ];
  },
};

export default nextConfig;
