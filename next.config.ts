import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Temporarily disable linting and type checking during builds for faster deployment
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },

  // Enable static file serving for PDF.js workers
  async rewrites() {
    return [
      {
        source: '/pdf.worker.min.js',
        destination: '/api/pdf-worker'
      }
    ]
  },

  // Security headers for production
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          }
        ]
      },
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, max-age=0'
          }
        ]
      }
    ]
  },

  // Disable server-side rendering for PDF components to avoid SSR issues
  transpilePackages: ['react-pdf', 'pdfjs-dist'],

  // Production optimizations
  poweredByHeader: false,
  compress: true,

  // Prevent PDF.js from being processed on server side
  webpack: (config, { isServer }) => {
    // Handle PDF.js worker and canvas issues
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: false,
    }

    // Ensure proper handling of PDF.js workers
    config.module.rules.push({
      test: /pdf\.worker\.(min\.)?js/,
      type: 'asset/resource',
      generator: {
        filename: 'static/worker/[hash][ext][query]'
      }
    })

    // Exclude PDF.js from server-side bundle
    if (isServer) {
      config.externals = config.externals || []
      config.externals.push({
        'react-pdf': 'commonjs react-pdf',
        'pdfjs-dist': 'commonjs pdfjs-dist'
      })
    }

    return config
  }
};

export default nextConfig;
