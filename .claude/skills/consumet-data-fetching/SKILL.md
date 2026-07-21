---
name: consumet-data-fetching
description: Use when Consumet API-dan anime datası çəkərkən, RTK Query endpoint, Axios instance, Redis cache və ya SSR/ISR data strategiyası yazarkən — home seksiyaları, axtarış, anime detal, bölüm datası işlərində.
---

# Consumet Data Fetching & Caching

## Əsas Prinsip

Bütün anime datası **Consumet API**-dan gəlir. Client-də RTK Query, server-də Redis cache, SEO-kritik səhifələrdə SSR/ISR. Consumet-ə birbaşa client-dən spam sorğu YOX — server qatından keçir.

## Arxitektura Axını

```
Client (RTK Query) → Next.js API route / server component
                     → Redis cache yoxla (hit → qaytar)
                     → miss → Axios base instance → Consumet API
                     → nəticəni Redis-ə yaz (TTL ilə) → qaytar
```

## Qaydalar

1. **Axios base instance** tək yerdə konfiqurasiya olunur (SETUP-03) — base URL, timeout, error interceptor.
2. **RTK Query** bütün client-side data üçün — əl ilə `useEffect`+`fetch` YAZMA.
3. **Redis TTL strategiyası:** tez dəyişən data (yeni bölümlər) qısa TTL; statik data (anime detalları, kateqoriyalar) uzun TTL.
4. **SEO səhifələri (home, anime detal) SSR/ISR** ilə render olunur — client-only fetching bu səhifələrdə qadağandır (HOME-07, DETAIL-04).
5. Axtarışda **debounce** tətbiq et (SEARCH-04) — hər keystroke-da sorğu göndərmə.
6. Consumet cavab strukturu dəyişkəndir — response-u tipləşdir və null-safe parse et.

## Data İstehlakçıları

| Yer | Mənbə | Render |
|---|---|---|
| Home seksiyaları (son əlavə, populyar, top-rated, trend) | Consumet + Redis | SSR/ISR |
| Header kateqoriyalar dropdown | Consumet + Redis (uzun TTL) | SSR + client hydrate |
| Axtarış nəticələri | Consumet (debounced) | Client (RTK Query) |
| Anime detal + bölüm siyahısı | Consumet + Redis | SSR/ISR + dynamic metadata |
| Favoritlər / izləmə tarixçəsi | Neon DB (Consumet deyil) | Auth-protected client |

## Tez-tez edilən səhvlər

| Səhv | Düzəliş |
|---|---|
| Client komponentdən birbaşa Consumet-ə fetch | Server qatı + Redis-dən keçir |
| Cache-siz hər sorğunu Consumet-ə ötürmək | Redis cache məcburidir (SETUP-05, PERF-04) |
| Home-u tam client-side render etmək | SEO pozulur — SSR/ISR istifadə et |
