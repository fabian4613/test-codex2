/** @type {import('next').NextConfig} */

// NO requerimos el paquete salvo que ANALYZE sea 'true'
let withBundleAnalyzer = (cfg) => cfg;

if (process.env.ANALYZE === 'true') {
  try {
    withBundleAnalyzer = require('@next/bundle-analyzer')({
      enabled: true,
    });
  } catch (e) {
    console.warn('[next.config] ANALYZE=true pero @next/bundle-analyzer no está instalado.');
  }
}

const nextConfig = {
  reactStrictMode: true,
  distDir: process.env.NEXT_DIST_DIR || '.next',
  experimental: {
    typedRoutes: true,
    optimizeCss: true,
  },
  webpack: (config, { isServer }) => {
    // Evitar empacar drivers DB opcionales en server; se resuelven en runtime si existen
    if (isServer) {
      const extraExternals = { pg: 'commonjs pg', 'better-sqlite3': 'commonjs better-sqlite3' };
      if (Array.isArray(config.externals)) {
        config.externals.push(extraExternals);
      } else if (config.externals) {
        config.externals = [config.externals, extraExternals];
      } else {
        config.externals = [extraExternals];
      }
    }
    return config;
  },
};

module.exports = withBundleAnalyzer(nextConfig);
