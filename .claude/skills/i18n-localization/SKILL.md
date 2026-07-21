---
name: i18n-localization
description: Use when UI-a hər hansı mətn əlavə edərkən, yeni səhifə/komponent yaradarkən və ya dil dəyişmə (EN/TR/RU) funksionallığı üzərində işləyərkən — translation key, locale routing, tərcümə faylları mövzularında.
---

# i18n / Lokalizasiya

## Əsas Prinsip

**EN default**, əlavə dillər: **TR, RU**. Kitabxana: next-intl (və ya i18next) — App Router uyğun müasir konfiqurasiya (SETUP-06). UI-da hardcoded mətn QADAĞANDIR.

## Qaydalar

1. Hər görünən string translation key-dən gəlir — komponentə mətn yazmazdan əvvəl 3 dildə açar əlavə et (`en.json`, `tr.json`, `ru.json`).
2. Dil seçimi header-dəki dropdown-dan (EN/TR/RU) — seçim persist olunur (HEADER-05).
3. Metadata (title/description/OG) da locale-aware olmalıdır — SEO hər dildə işləyir.
4. Tarix/say formatları locale-ə uyğun formatlanır (Intl API / kitabxana util-ləri).
5. Player mətnləri də daxildir: "Reklamı keç: 5s" kimi sayğac mətnləri key-lə yazılır.
6. Consumet-dən gələn anime datası (başlıq, təsvir) tərcümə OLUNMUR — API-dan gəldiyi kimi göstərilir; yalnız platforma UI mətnləri tərcümə edilir.

## Struktur Nümunəsi

```
messages/
  en.json   # default
  tr.json
  ru.json
```

Açar adlandırması: səhifə/komponent üzrə nested — `home.sections.trending`, `player.skipAd`, `auth.continueWithGoogle`.

## Tez-tez edilən səhvlər

| Səhv                                       | Düzəliş                                             |
| ------------------------------------------ | --------------------------------------------------- |
| Komponentdə hardcoded "Skip Ad" mətni      | `t('player.skipAd')` + 3 dildə açar                 |
| Yalnız EN faylına açar əlavə etmək         | Hər açar 3 faylda da olmalıdır (TR/RU boş qalmasın) |
| Metadata-nı yalnız EN yazmaq               | generateMetadata locale-aware olmalıdır             |
| Anime təsvirlərini tərcümə etməyə çalışmaq | API datası olduğu kimi qalır                        |
