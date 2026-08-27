---
name: blog-publishing
description: Use when istifadəçi blog yazmağı, dərc etməyi və ya admin panelindən post paylaşmağı istəyəndə — mövzu araşdırması, rəqib analizi, şəkil hazırlanması, imgbb yükləməsi və brauzerdən admin panelinə daxil olub postu dərc etmək daxil olmaqla.
---

# Blog Publishing

## Əsas Prinsip

Blog postu **brauzerdə, admin panelindən, real istifadəçi kimi** dərc olunur — DB-yə birbaşa yazmaqla yox. Sən brauzeri açırsan, **istifadəçi Google ilə daxil olur**, sonra sən işə başlayırsan.

Hər postun üç sütunu var və heç biri buraxıla bilməz:

| Sütun         | Mənası                                                                  |
| ------------- | ----------------------------------------------------------------------- |
| **Araşdırma** | Mövzu Google-da bu həftə axtarılandır; rəqiblərin nə yazdığını bilirsən |
| **Səs**       | İnsan kimi düşünən, yumorlu, fəlsəfi, emosional, öz fikri olan mətn     |
| **Sübut**     | Hər fakt yoxlanılıb; hər şəkil realdır və heç nə uydurulmayıb           |

## İş Axını

```dot
digraph publish {
    "İstifadəçi: blog paylaş" [shape=doublecircle];
    "Brauzeri aç, login səhifəsi" [shape=box];
    "İstifadəçi daxil olub?" [shape=diamond];
    "GÖZLƏ — istifadəçidən soruş" [shape=box];
    "Trend + rəqib araşdırması" [shape=box];
    "Mətni yaz" [shape=box];
    "Şəkilləri hazırla + imgbb" [shape=box];
    "Formanı doldur" [shape=box];
    "Dərc et, canlı URL-i yoxla" [shape=doublecircle];

    "İstifadəçi: blog paylaş" -> "Brauzeri aç, login səhifəsi";
    "Brauzeri aç, login səhifəsi" -> "İstifadəçi daxil olub?";
    "İstifadəçi daxil olub?" -> "GÖZLƏ — istifadəçidən soruş" [label="yox"];
    "GÖZLƏ — istifadəçidən soruş" -> "İstifadəçi daxil olub?";
    "İstifadəçi daxil olub?" -> "Trend + rəqib araşdırması" [label="hə"];
    "Trend + rəqib araşdırması" -> "Mətni yaz";
    "Mətni yaz" -> "Şəkilləri hazırla + imgbb";
    "Şəkilləri hazırla + imgbb" -> "Formanı doldur";
    "Formanı doldur" -> "Dərc et, canlı URL-i yoxla";
}
```

### 1. Brauzeri aç və girişi gözlə

```
mcp__plugin_playwright_playwright__browser_navigate
  → https://minna-six.vercel.app/en/admin/blogs
```

`/login`-ə yönləndirilirsənsə **istifadəçi hələ daxil olmayıb**. Bu addımda:

- **"Continue with Google" düyməsinə SƏN basma.** Brauzer pəncərəsi istifadəçinin qarşısındadır; parol onundur.
- İstifadəçiyə de: _"Brauzer açıqdır, Google ilə daxil ol və mənə de."_ Sonra **dayan və cavabını gözlə**.
- İstifadəçi təsdiq edəndən sonra `browser_navigate` ilə `/en/admin/blogs`-a qayıt və `browser_snapshot` ilə postlar cədvəlini gördüyünü təsdiqlə.

Sessiya Playwright profilində qalır — istifadəçi adətən bir dəfə daxil olur.

### 2. Araşdır (mətn yazmazdan ƏVVƏL)

Nə yazacağını qərar verməzdən əvvəl **nəyin axtarıldığını** öyrən. Tam metodika: `references/research.md`.

Minimum: AniList trend sorğusu + `WebSearch` ilə son 7 günün xəbərləri + ilk 3 rəqib məqaləsini `WebFetch` ilə oxu (onların başlıq strukturunu, uzunluğunu, əskik qoyduqlarını çıxar).

### 3. Yaz

Səs, struktur və "Top 10" formatı: `references/voice.md`.

Body **Markdown**-dır; `figure`, `aside`, `details`, `time`, `abbr`, `mark` kimi semantik HTML də icazəlidir (`src/lib/blog/markdown.ts` sanitizer).

Başlıq səviyyələri: bədəndə `h1` YAZMA — səhifənin özü `h1`-dir. `##`-dan başla. Hər başlıq JSON-LD-də `hasPart` bölməsinə çevrilir, ona görə başlıqlar suala cavab verən olmalıdır ("Niyə bu il isekai bezdirdi?"), "Bölmə 3" yox.

### 4. Şəkilləri hazırla

**Tam prosedur və qadağalar: `references/images.md`.** Qısası:

1. Real rəsmi artwork topla (AniList CDN) — heç vaxt personaj generasiya etmə.
2. Cover-i `assets/cover-template.html` ilə qur, Playwright ilə screenshot al.
3. Atmosfer/metafora şəkli lazımdırsa — brauzerdən ChatGPT: `references/chatgpt-images.md`.
4. **Şəkli `Read` ilə AÇ VƏ BAX** — yükləməzdən əvvəl gözünlə yoxla.
5. `scripts/imgbb-upload.mjs` ilə imgbb-yə yüklə, dönən `i.ibb.co` URL-ini istifadə et.

imgbb API açarı skriptin içindədir — heç kimdən istəmə.

**Hansı şəkil haradan:**

| Şəkil nə göstərir                | Mənbə                                  |
| -------------------------------- | -------------------------------------- |
| Konkret anime / personaj / səhnə | AniList rəsmi artwork — generasiya YOX |
| Cover, Top 10 kartı, müqayisə    | HTML kompozisiya + screenshot          |
| Atmosfer, metafora, ayırıcı      | ChatGPT (bir söhbətdə maks. 3 şəkil)   |

### 5. Formanı doldur

`/en/admin/blogs/new`. Sahələri `browser_fill_form` ilə doldur (ref-lər `browser_snapshot`-dan gəlir). Tam sahə xəritəsi: `references/publishing.md`.

| Sahə                | id                    | Qayda                                                          |
| ------------------- | --------------------- | -------------------------------------------------------------- |
| Title               | `title`               | ≤60 simvol ki, SERP-də kəsilməsin; açar söz önə                |
| Slug                | `slug`                | Boş qoy → başlıqdan yaranır. Latın olmayan başlıqda ƏLLƏ yaz   |
| Excerpt             | `excerpt`             | 140–160 simvol; meta description budur                         |
| Content             | `content`             | Markdown bədən                                                 |
| Tags                | `tags`                | Vergüllə, maksimum 12 — hər biri indekslənən arxiv səhifəsidir |
| Cover image URL     | `coverImage`          | imgbb `i.ibb.co` URL-i                                         |
| Cover alt text      | `coverImageAlt`       | Şəkli təsvir et, açar söz yığma                                |
| Author / Author URL | `author`, `authorUrl` | E-E-A-T müəllif entity-si                                      |
| Language            | `language`            | `en` / `tr` / `ru` — postun yazıldığı dil                      |
| Published           | `published`           | Yoxlanana qədər söndür, sonra yandır                           |

### 6. Dərc et və YOXLA

`Create post` → siyahıya qayıdır. Sonra **canlı URL-i aç** (`/en/blogs/<slug>`) və `browser_snapshot` ilə təsdiqlə:

- Cover şəkli görünür (sınıq deyil — `next/image` `i.ibb.co`-nu qəbul edir, `next.config.ts`-də icazəlidir).
- Bədəndəki bütün şəkillər yüklənir.
- Başlıq iyerarxiyası düzgündür, mündəricat doludur.

Yoxlamadan "dərc olundu" demə.

## Mütləq Qadağalar

| Qadağa                                              | Səbəb                                                            |
| --------------------------------------------------- | ---------------------------------------------------------------- |
| Uydurma anime personajı generasiya etmək            | Mövcud olmayan personaj = yalan məlumat. Yalnız rəsmi artwork.   |
| AI ilə şəkil üzərində mətn yazdırmaq                | Generativ modellər hərfləri korlayır. Mətn HTML/CSS ilə yazılır. |
| Şəklə baxmadan yükləmək                             | Məntiq xətaları (əl, say, kadr) yalnız baxanda görünür.          |
| Bir ChatGPT söhbətində 3-dən çox şəkil              | Üslub donur, limit tükənir. Yeni söhbət aç.                      |
| Yoxlanmamış fakt (tarix, epizod sayı, studiya)      | AniList/rəsmi mənbədən təsdiqlə, yoxsa yazma.                    |
| Emoji                                               | Layihə qaydası — yalnız SVG ikonlar.                             |
| İstifadəçinin adından Google/ChatGPT-yə daxil olmaq | Parol onundur. Gözlə.                                            |
| Yoxlamadan "hazırdır" demək                         | Canlı URL-i aç, gözünlə gör.                                     |

## Tez-tez Rast Gəlinən Səhvlər

**"Slug avtomatik yaranacaq"** — Kiril və ya tam türk başlığında `slugify` boş qaytarır və forma `invalidSlug` xətası verir. Latın olmayan başlıqda slug-u əllə yaz.

**"Bir mövzuda üç dildə post"** — Hər dil ayrı postdur. İkincisini yazanda `Translation of` sahəsində birincini seç, yoxsa `hreflang` bağlanmır. Eyni qrupda eyni dildən iki post olmaz (`translationExists`).

**"Şəkil admin panelində görünür, deməli işləyir"** — Cover `next/image`-dən keçir, bədən şəkilləri yox. Fərqli yollardır; canlı səhifədə hər ikisini yoxla.

**"Codex CLI şəkil çəkəcək"** — Çəkmir. Codex-in şəkil generasiya aləti yoxdur (`references/images.md`). Generasiya brauzerdən ChatGPT ilə aparılır.

**"Top 10-un şəkillərini ChatGPT çəksin"** — Yox. Onda heç bir animeyə aid olmayan on şəkil alırsan. Konkret anime = rəsmi artwork; ChatGPT yalnız atmosfer üçündür.

## Fayllar

| Fayl                           | Nə üçün                                              |
| ------------------------------ | ---------------------------------------------------- |
| `references/research.md`       | Trend axtarışı, rəqib analizi, açar söz seçimi       |
| `references/voice.md`          | Redaksiya səsi, Top 10 strukturu, başlıq düsturları  |
| `references/images.md`         | Şəkil boru xətti, imgbb açarı, qadağalar, DPR tələsi |
| `references/chatgpt-images.md` | Brauzerdən ChatGPT ilə generasiya, 3-şəkil qaydası   |
| `references/publishing.md`     | Brauzer addımları, sahə xəritəsi, xəta mesajları     |
| `assets/cover-template.html`   | 16:9 cover kompozisiya şablonu                       |
| `scripts/imgbb-upload.mjs`     | `node ... <fayl-və-ya-URL> <ad>` → `i.ibb.co` URL-i  |
| `scripts/save-base64.mjs`      | `node ... <fayl> < payload.b64` → binar fayl         |
