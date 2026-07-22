import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  images: {
    // Consumet's AniList meta provider returns artwork on the AniList CDN.
    // Only these hosts are allowed for next/image optimization (HOME-06/07).
    remotePatterns: [
      { protocol: "https", hostname: "s4.anilist.co", pathname: "/**" },
      { protocol: "https", hostname: "img.anili.st", pathname: "/**" },
    ],
  },
};

const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);
