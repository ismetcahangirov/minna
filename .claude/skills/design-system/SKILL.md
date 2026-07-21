---
name: design-system
description: Use when hər hansı UI komponenti, səhifə və ya stil yazarkən — rənglər, qadağan olunmuş effektlər (glassmorphism, gradient, border-radius, emoji), tipoqrafiya, ikonlar, animasiya texnologiyaları və Tailwind dizayn tokenləri barədə qərar verərkən.
---

# Design System

## Əsas Prinsip

Netflix-vari tünd, sərt-künclü, yüksək kontrastlı dizayn. Qara fon + qırmızı aksent. Yumşaq/bulanıq effekt YOXDUR.

## Rənglər

| Token      | Dəyər                          | İstifadə                                            |
| ---------- | ------------------------------ | --------------------------------------------------- |
| Fon        | `#000000` (və ya çox tünd boz) | Bütün səhifə fonları                                |
| Aksent     | `#E50914` (Netflix qırmızısı)  | Logo, aktiv vəziyyət, əsas CTA                      |
| İkinci ton | Mavi → bənövşəyi               | YALNIZ ayrıca aksent/kölgə kimi — gradient KİMİ YOX |

## Qadağalar (STRICT — pozulması reqressiyadır)

- ❌ **Glassmorphism** (backdrop-blur, şüşə effekti) — heç bir komponentdə
- ❌ **Gradient** — düymə, kart, panel, header və bütün UI komponentlərində
- ❌ **Border-radius** — `rounded-*` class-ları QADAĞAN, bütün künclər sərt (`rounded-none`)
- ❌ **Emoji** — yalnız SVG ikon: `lucide-react` və ya `react-icons`

**İstisna:** atmosferik arxa plan videoları/animasiyaları (login, profil, search, 404) — orada təbii glow/duman normaldır. Bax: `atmospheric-backgrounds` skill.

## Tipoqrafiya

- Netflix Sans lisenziyasız olduğu üçün bənzər sərt geometrik sans-serif seç (Helvetica Neue Bold tərzi, açıq-mənbəli alternativ).
- Başlıqlar: qalın çəki (bold/extrabold). Mətn: standart çəki.

## Animasiya

- Komponent animasiyaları: **Framer Motion**
- 3D elementlər: **React Three Fiber / Three.js**
- Animasiyalı komponentlər **21st.dev promptları** ilə generasiya olunur
- Kart hover: böyümə + kölgə + sürətli önizləmə

## Kartlar

- Home/search/detal səhifələrində: **16:9** nisbət
- Populyar/Bloqlar/Favoritlər səhifələrində: **dikey (vertical)** format

## Tailwind

Bütün dizayn tokenləri (rənglər, tipoqrafiya, spacing) `tailwind.config` içində təyin olunmalıdır — inline hex dəyərlər səpələnməməlidir (SETUP-02).

## Tez-tez edilən səhvlər

| Səhv                              | Düzəliş                                                 |
| --------------------------------- | ------------------------------------------------------- |
| shadCN default `rounded-md` qalıb | Bütün shadCN komponentlərində radius token-i 0-a set et |
| Düymədə gradient hover            | Düz rəng keçidi (solid → solid) istifadə et             |
| Emoji ilə status göstərmək        | lucide-react ikonu ilə əvəz et                          |
