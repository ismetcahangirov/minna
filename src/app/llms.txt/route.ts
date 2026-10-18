import en from "../../../messages/en.json";

import { absoluteUrl } from "@/lib/seo/site";

/**
 * `/llms.txt` (llmstxt.org): a short Markdown map of the site for AI
 * assistants and AI search, which cite pages they can place.
 *
 * Built from the English UI copy so it says what the pages say and stays in
 * step with them; static, so serving it costs no function invocation.
 */
export const dynamic = "force-static";

const SECTIONS: { path: string; name: string; about: string }[] = [
  {
    path: "/popular",
    name: en.browse.popular.heading,
    about: en.browse.popular.subtitle,
  },
  { path: "/new", name: en.browse.new.heading, about: en.browse.new.subtitle },
  {
    path: "/blogs",
    name: en.browse.blogs.heading,
    about: en.browse.blogs.subtitle,
  },
  {
    path: "/discussions",
    name: en.community.heading,
    about: en.community.subtitle,
  },
];

export function GET(): Response {
  const body = [
    "# Minna",
    "",
    `> ${en.home.hero.tagline}`,
    "",
    "Minna is an anime streaming site in English, Turkish (/tr) and Russian (/ru). Sign-in is with Google only.",
    "",
    "## Sections",
    "",
    ...SECTIONS.map((s) => `- [${s.name}](${absoluteUrl(s.path)}): ${s.about}`),
    "",
    "## Index",
    "",
    `- [Sitemap](${absoluteUrl("/sitemap.xml")})`,
    "",
  ].join("\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=86400",
    },
  });
}
