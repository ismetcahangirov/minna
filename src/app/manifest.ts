import type { MetadataRoute } from "next";
import { getTranslations } from "next-intl/server";

/**
 * Web app manifest — one of the four sources Google reads a site name from
 * (alongside `WebSite` structured data, `og:site_name` and the home page
 * `<title>`, all of which already say "Minna"). Without it the search result
 * for the deployment falls back to the domain owner's name.
 *
 * It also makes the site installable: launched from the home screen it opens
 * standalone on the black ground the design system uses everywhere.
 */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const t = await getTranslations("home.hero");

  return {
    name: "Minna — Watch Anime Online",
    short_name: "Minna",
    description: t("tagline"),
    start_url: "/",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#000000",
    icons: [
      { src: "/icon.svg", type: "image/svg+xml", sizes: "any" },
      {
        src: "/apple-icon.svg",
        type: "image/svg+xml",
        sizes: "any",
        purpose: "maskable",
      },
    ],
  };
}
