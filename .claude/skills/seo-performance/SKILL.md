---
name: seo-performance
description: Use when metadata, sitemap, robots.txt, Open Graph, structured data, Core Web Vitals, şəkil/video optimizasiyası, lazy loading, code splitting və ya cache strategiyası üzərində işləyərkən.
---

# SEO & Performans

## Əsas Prinsip

SEO və performans "sonda əlavə olunan" deyil — hər feature-in qəbul meyarıdır. SEO-kritik səhifələr SSR/ISR ilə render olunur; hər dəyişiklikdən sonra performans reqressiyası yoxlanılır.

## SEO Yoxlama Siyahısı (PERF-01, DETAIL-04)

- [ ] Hər səhifədə `generateMetadata` — title, description (locale-aware)
- [ ] Anime detal: dynamic meta + Open Graph (şəkil, başlıq, təsvir)
- [ ] `sitemap.xml` + `robots.txt`
- [ ] Structured data (JSON-LD) — video/anime kontenti üçün
- [ ] Home, anime detal, bloq səhifələri SSR/ISR (client-only render QADAĞAN)

## Performans Yoxlama Siyahısı (PERF-02, PERF-03)

- [ ] Bütün şəkillər `next/image` ilə (16:9 kartlar daxil) — `alt` mətnli
- [ ] Lazy loading: viewport-dan kənar seksiyalar/kartlar
- [ ] Code splitting: player, admin panel, 3D (React Three Fiber) komponentləri dynamic import ilə
- [ ] Arxa plan videoları: `muted`, `loop`, `playsinline`, aşağı bitrate, poster kadr
- [ ] Adaptive video streaming (bölüm izləmə)
- [ ] Infinite scroll: `IntersectionObserver` + skeleton loading (LIST-01)

## Cache (PERF-04)

- Redis server-side cache — bax `consumet-data-fetching` skill.
- ISR revalidate intervalları data dəyişkənliyinə görə seçilir.

## Core Web Vitals Hədəfləri

| Metrik | Diqqət nöqtəsi |
|---|---|
| LCP | Hero/banner şəkli prioritetli (`priority` prop), fon videosu LCP-ni bloklamamalıdır |
| CLS | Kart/skeleton ölçüləri sabit — layout shift yaradan lazy content YOX |
| INP | Ağır animasiyalar (Framer Motion, Three.js) main thread-i bloklamamalıdır |

## Tez-tez edilən səhvlər

| Səhv | Düzəliş |
|---|---|
| `<img>` tag-i istifadə etmək | `next/image` |
| Fon videosunu autoplay + səsli qoymaq | `muted loop playsinline` məcburidir |
| Three.js-i əsas bundle-a daxil etmək | `dynamic(() => import(...), { ssr: false })` |
| SEO səhifəsini `use client`-ə çevirmək | Server component + SSR/ISR saxla |
