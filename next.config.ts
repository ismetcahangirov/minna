import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  // `@consumet/extensions` is a Node-only scraping library (cheerio, crypto,
  // dynamic requires). Keep it out of the Server Components bundle and let it
  // load via native require at runtime. See src/lib/consumet/anilist.ts.
  serverExternalPackages: ["@consumet/extensions"],
  images: {
    // Consumet's AniList meta provider returns artwork on the AniList CDN.
    // Only these hosts are allowed for next/image optimization (HOME-06/07).
    remotePatterns: [
      { protocol: "https", hostname: "s4.anilist.co", pathname: "/**" },
      { protocol: "https", hostname: "img.anili.st", pathname: "/**" },
    ],
    // Serve AVIF first (best compression), then WebP, then the original
    // format for unsupported browsers (PERF-02). AVIF/WebP shrink the
    // poster/banner artwork substantially versus the source JPEG/PNG.
    formats: ["image/avif", "image/webp"],
    // Allow the hero banners to request a higher quality than the default 75.
    // Next 16 rejects any `quality` prop not listed here and falls back to 75.
    qualities: [75, 90],
    // Cache optimized remote images for a day; the AniList CDN artwork is
    // effectively immutable, so re-optimizing on every revalidation is waste.
    minimumCacheTTL: 86_400,
  },
};

const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);
