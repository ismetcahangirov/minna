/**
 * `next/image` loader (PERF-02).
 *
 * Every image on this site is catalog artwork fetched from someone else's CDN.
 * Routed through Vercel's optimizer, each one costs a *transformation* — Vercel
 * downloads the remote file and re-encodes it once per (source, width, quality)
 * — and the catalog is thousands of posters wide, each rendered with a srcset
 * spanning every configured device size. One home page alone referenced 542
 * distinct transformation URLs across 49 source images, and a one-day cache TTL
 * meant each of those was re-billed roughly monthly. The allowance ran out and
 * the optimizer started answering 402, which blanked every poster on the site.
 *
 * So the browser now fetches the artwork straight from its own CDN. Both
 * sources already sit behind Cloudflare with a 31-day `max-age`, and both
 * publish their images pre-sized, which is what makes this a swap rather than a
 * downgrade: the only thing lost is AVIF/WebP re-encoding, worth ~90 KB on the
 * hero banner and rather less on a 26 KB poster.
 *
 * Switching back is `loader`/`loaderFile` out of `next.config.ts` — the
 * `remotePatterns` the optimizer needs are still listed there.
 */

/**
 * AniList stores each cover at two sizes under parallel paths, so the variant
 * can be chosen by rewriting the URL. `extraLarge` exists in their API's
 * responses but 404s on this host, so `large` is the ceiling.
 *
 * Group 1 is everything up to the variant, group 2 the variant, group 3 the
 * filename.
 */
const ANILIST_COVER =
  /^(https:\/\/s4\.anilist\.co\/file\/anilistcdn\/media\/anime\/cover\/)(medium|large)(\/.+)$/;

/**
 * Widths at or below this get AniList's `medium` cover (~230x345, ~26 KB);
 * anything wider gets `large` (~460x650, ~70 KB).
 *
 * Sits between the 320px and 640px candidates on purpose. Every poster the
 * layout draws is between 128 and 258 CSS px, so a 1x screen picks the 320
 * candidate and is served the 26 KB file that fits it, while a 2x screen picks
 * 640 and gets the 70 KB one it needs. Push this past 640 and every card pulls
 * the large cover for a slot a quarter its size — which is the whole page, so
 * it is worth checking a card's `srcset` after touching either number.
 */
const ANILIST_MEDIUM_MAX_WIDTH = 400;

interface ImageLoaderArgs {
  src: string;
  width: number;
}

/**
 * Resolves one `srcset` candidate. Only AniList covers have a size to pick;
 * everything else — AniList banners, Kitsu and Crunchyroll stills, Cloudinary
 * and imgbb blog art, local files — is already the one size its host serves, so
 * it is handed back untouched and the browser downloads it once however many
 * candidates the srcset lists.
 */
export default function imageLoader({ src, width }: ImageLoaderArgs): string {
  const cover = ANILIST_COVER.exec(src);
  if (!cover) return src;

  const variant = width <= ANILIST_MEDIUM_MAX_WIDTH ? "medium" : "large";
  return `${cover[1]}${variant}${cover[3]}`;
}
