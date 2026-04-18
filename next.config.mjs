import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  poweredByHeader: false,
  compress: true,
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ["lucide-react", "date-fns"],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "picsum.photos",
        pathname: "/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "1337",
        pathname: "/uploads/**",
      },
      {
        protocol: "http",
        hostname: "85.239.42.204",
        port: "1337",
        pathname: "/uploads/**",
      },
      {
        protocol: "http",
        hostname: "strapi",
        port: "1337",
        pathname: "/uploads/**",
      },
      {
        protocol: "https",
        hostname: "anounitedworld.com",
        pathname: "/uploads/**",
      },
      {
        protocol: "https",
        hostname: "admin.anounitedworld.com",
        pathname: "/uploads/**",
      },
      {
        protocol: "https",
        hostname: "**.anounitedworld.com",
        pathname: "/uploads/**",
      },
    ],
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 7,
    dangerouslyAllowSVG: false,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
          // Enable only when domain is reliably served via HTTPS with valid cert.
          // { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        ],
      },
      {
        source: "/:path*.(jpg|jpeg|png|webp|avif|gif|svg|ico|woff|woff2)",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        source: "/sitemap.xml",
        headers: [
          { key: "Cache-Control", value: "public, max-age=3600, s-maxage=3600" },
          { key: "Content-Type", value: "application/xml" },
        ],
      },
    ];
  },
  async redirects() {
    return [
      { source: "/category/:slug", destination: "/section/:slug", permanent: true },
      { source: "/category/:slug/", destination: "/section/:slug", permanent: true },
      { source: "/tag/:slug", destination: "/search?q=:slug", permanent: true },
      { source: "/tag/:slug/", destination: "/search?q=:slug", permanent: true },
      // WordPress: страницы автора часто со слэшем; канон — без слэша (как в Next.js)
      { source: "/author/:slug/", destination: "/author/:slug", permanent: true },
      { source: "/wp-admin", destination: "/", permanent: false },
      { source: "/wp-admin/:path*", destination: "/", permanent: false },
      { source: "/wp-login.php", destination: "/", permanent: false },
      { source: "/feed", destination: "/rss.xml", permanent: true },
      { source: "/feed/", destination: "/rss.xml", permanent: true },
    ];
  },
};

export default withBundleAnalyzer(nextConfig);
