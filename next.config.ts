import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable static file serving for PDF.js workers
  async rewrites() {
    return [
      {
        source: '/pdf.worker.min.js',
        destination: '/api/pdf-worker'
      }
    ]
  },

  // Disable server-side rendering for PDF components to avoid SSR issues
  transpilePackages: ['react-pdf', 'pdfjs-dist'],
  
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
