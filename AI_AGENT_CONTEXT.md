# AI Agent Context

## Project Overview

Minna is a Next.js 16 (App Router + Turbopack) anime streaming platform with SSR, RTK Query, NextAuth (Google OAuth), Drizzle ORM (Neon Postgres), Redis caching, and full i18n support (EN, RU, TR).

## Recent Enhancements & Fixes

- **`/new` Page Implementation**:
  - Added `/new` page featuring infinite scrolling vertical cards matching `/popular`.
  - Backed by `listRecentAnime()` with `START_DATE_DESC` AniList query and `/api/anime/new` API route + RTK Query `useGetNewPageQuery`.
- **Carousel & Hero Optimization**:
  - Resolved horizontal alignment overflow in home section carousels (`AnimeRow` & `AnimeCarousel`).
  - Added touch swipe and mouse drag interactions to `HeroCarousel`.
  - Customized hero presentation: high-res 460x650 portrait cover art for mobile (`aspect-[3/4]`) and 40% taller 1920x1080 banner art for desktop (`sm:h-[580px] lg:h-[670px]`).
- **Watch Experience & Player Adjustments**:
  - Implemented 20s timeout fallback on `EmbedPlayer` for graceful handling of unavailable video embeds.
  - Adjusted watch player video container height by 25% for a well-proportioned view (`aspect-[16/6.75]`).
  - Removed "click to resume" overlay popup.
