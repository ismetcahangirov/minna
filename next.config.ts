import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  // `@consumet/extensions` is a Node-only scraping library (cheerio, crypto,
  // dynamic requires). Keep it out of the Server Components bundle and let it
  // load via native require at runtime. See src/lib/consumet/anilist.ts.
  serverExternalPackages: ["@consumet/extensions"],
  experimental: {
    // The app rejects files over 10 MB; leave multipart envelope headroom.
    serverActions: { bodySizeLimit: "11mb" },
  },
  images: {
    // Artwork is served straight from its own CDN rather than through Vercel's
    // optimizer, which bills a transformation per (source, width, quality) and
    // began answering 402 once the allowance ran out — see
    // `@/lib/images/loader` for the whole story. Everything below except
    // `deviceSizes`/`imageSizes` is inert while this loader is in place, and is
    // kept so that removing these two lines restores the optimizer intact.
    loader: "custom",
    loaderFile: "./src/lib/images/loader.ts",
    // The widths a srcset may offer. Trimmed from Next's defaults (which reach
    // 3840) because the loader resolves them to one of two stored sizes: extra
    // candidates buy nothing and every image carries them in its markup.
    deviceSizes: [320, 640, 1080, 1920],
    imageSizes: [64, 128, 256],
    // Artwork hosts for next/image optimization (HOME-06/07): the AniList CDN
    // for the primary provider, and Kitsu's for the standby one. An unlisted
    // host makes the optimizer answer 400, so every poster renders broken while
    // the page around it looks fine — add the host with the provider.
    remotePatterns: [
      { protocol: "https", hostname: "s4.anilist.co", pathname: "/**" },
      { protocol: "https", hostname: "img.anili.st", pathname: "/**" },
      { protocol: "https", hostname: "media.kitsu.app", pathname: "/**" },
      // Episode stills: Kitsu's thumbnail host and the Crunchyroll CDN behind
      // AniList's `streamingEpisodes` (its subdomain varies per image).
      { protocol: "https", hostname: "media.kitsu.io", pathname: "/**" },
      { protocol: "https", hostname: "**.crunchyroll.com", pathname: "/**" },
      // Google account avatars (the only sign-in method), shown on member
      // cards, public profiles and every post. Google serves them already
      // sized (the `=s96-c` suffix), so they are rendered `unoptimized` —
      // listing the host is only what lets next/image accept the src at all.
      {
        protocol: "https",
        hostname: "**.googleusercontent.com",
        pathname: "/**",
      },
      // Blog covers and body images uploaded from the admin panel. Body images
      // are rendered as plain `<img>` out of sanitized HTML, so the delivery
      // URL already carries `f_auto,q_auto`; listing this host is what lets the
      // cover art go through `next/image` as well.
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
      // imgbb, the host behind editorial artwork produced outside the panel
      // (composed covers, sourced press stills). Body images reach the page as
      // plain `<img>` and would render without this; the cover goes through
      // `next/image`, which answers 400 for an unlisted host — so a post would
      // look fine in the editor and ship with a broken hero.
      { protocol: "https", hostname: "i.ibb.co", pathname: "/**" },
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
