# Brauzerdən Dərc Etmə

## Hədəf Ünvan

| Mühit | URL                                           | Qeyd                                  |
| ----- | --------------------------------------------- | ------------------------------------- |
| Prod  | `https://minna-six.vercel.app/en/admin/blogs` | **Standart.** Real DB, real oxucular. |
| Lokal | `http://localhost:3000/en/admin/blogs`        | Yalnız `npm run dev` işləyirsə        |

Preview deploy-lar Vercel SSO arxasındadır — hər URL 302 qaytarır. Preview-də dərc etməyə çalışma.

## Giriş Əl Sıxma

```
browser_navigate → https://minna-six.vercel.app/en/admin/blogs
```

`/login?callbackUrl=...`-a düşürsənsə istifadəçi daxil deyil.

**Sən nə edirsən:** heç nə. İstifadəçiyə deyirsən:

> "Brauzeri açdım və login səhifəsindədir. Google ilə daxil ol, sonra mənə de — davam edim."

Sonra **dayanırsan**. `Continue with Google` düyməsinə basmırsan, parol soruşmursan, cookie oğurlamırsan.

**Səbəb:** Bu istifadəçinin şəxsi Google hesabıdır. Onun adından autentifikasiya etmək sənin işin deyil, hətta bacarsan belə.

İstifadəçi təsdiqləyəndən sonra:

```
browser_navigate → .../en/admin/blogs
browser_snapshot   # postlar cədvəlini gördüyünü təsdiqlə
```

`requireAdmin()` rol yoxlayır — istifadəçi daxil olub, amma admin deyilsə, 403/redirect alacaqsan. Bu halda rolu Neon DB-də `users.role` sütunundan yüksəltmək lazımdır və **yenidən login** tələb olunur (rol JWT-dədir).

Sessiya Playwright profilində qalır — növbəti dəfə adətən giriş tələb olunmur.

## Forma Sahələri

`/en/admin/blogs/new` səhifəsi. `browser_snapshot` ilə ref-ləri götür, `browser_fill_form` ilə doldur.

| Etiket          | `id`                 | Tip      | Məcburi | Qeydlər                                           |
| --------------- | -------------------- | -------- | ------- | ------------------------------------------------- |
| Title           | `title`              | text     | ✅      | ≤200 simvol (server), ≤60 tövsiyə (SERP)          |
| Slug            | `slug`               | text     | —       | Boşdursa başlıqdan yaranır                        |
| Excerpt         | `excerpt`            | textarea | —       | Meta description mənbəyi                          |
| Content         | `content`            | textarea | ✅      | Markdown + semantik HTML                          |
| Tags            | `tags`               | text     | —       | Vergüllə; server 12-yə kəsir, ad başına 60 simvol |
| Cover image URL | `coverImage`         | url      | —       | `http(s)://` olmalıdır                            |
| Cover alt text  | `coverImageAlt`      | text     | —       | ≤200 simvol                                       |
| Author          | `author`             | text     | —       |                                                   |
| Author URL      | `authorUrl`          | url      | —       | `Person.url` — E-E-A-T                            |
| Language        | `language`           | select   | ✅      | `en` / `tr` / `ru`                                |
| Translation of  | `translationGroupId` | select   | —       | Boş = müstəqil post                               |
| Published       | `published`          | checkbox | —       | Standart olaraq işarəlidir                        |

Uzun Markdown bədəni üçün `browser_fill_form` etibarlıdır; `browser_type` uzun mətndə yavaşdır və simvol itirə bilər.

## Şəkil Paneli (alternativ yol)

Forma daxilində **Images** paneli var. imgbb URL-ini kitabxanaya əlavə edib kursor yerinə daxil etmək üçün:

1. `Add from URL` rejimini seç
2. `Image URL` = imgbb `i.ibb.co` URL-i
3. `Alt text` və `Caption` doldur
4. `Add` → sonra `Insert`

Bu, şəkli **kitabxanaya** yazır (başqa postlarda təkrar istifadə üçün) və bədənə `<figure>` daxil edir. Bədən Markdown-unu birbaşa yazırsansa bu addım lazım deyil.

Panelin `Upload image` rejimi Cloudinary-yə gedir — imgbb boru xəttini istifadə edirsənsə ona toxunma.

## Server Xətaları

Forma `useActionState` ilə xətanı sahənin altında göstərir. Snapshot-da görəcəyin mesajlar:

| Mesaj                                                  | Səbəb                                          | Həlli                                              |
| ------------------------------------------------------ | ---------------------------------------------- | -------------------------------------------------- |
| `Use lowercase letters, numbers and hyphens.`          | Slug ASCII söz vermədi (məs. tam kiril başlıq) | Slug-u əllə yaz                                    |
| `That slug is already in use.`                         | Slug məşğuldur                                 | Slug-u dəyiş (tarix/qeyd əlavə et)                 |
| `Enter a valid http(s) URL.`                           | `coverImage` və ya `authorUrl` düzgün deyil    | URL-i yoxla                                        |
| `That article already has a version in this language.` | Eyni tərcümə qrupunda eyni dildən ikinci post  | Mövcud postu redaktə et, yenisini yaratma          |
| `Choose one of the supported languages.`               | `language` `en/tr/ru` deyil                    | select-i düzəlt                                    |
| `Could not save the post. Please try again.`           | DB xətası                                      | Yenidən cəhd et; təkrarlanırsa istifadəçiyə bildir |

## Dərcdən Sonra Yoxlama

`Create post` postlar siyahısına qaytarır. **Sonra canlı səhifəni aç:**

```
browser_navigate → https://minna-six.vercel.app/en/blogs/<slug>
browser_snapshot
```

Yoxlama siyahısı:

- [ ] Cover şəkli render olunur (sınıq deyil). Sınıqdırsa: host `next.config.ts` `images.remotePatterns`-də yoxdur.
- [ ] Bədəndəki bütün şəkillər yüklənir
- [ ] Mündəricat doludur (yəni `##` başlıqları tanınıb)
- [ ] Başlıq iyerarxiyası `h1` → `h2` → `h3`, sıçrayışsız
- [ ] Xarici linklər `target="_blank"` ilə açılır
- [ ] Post `/en/blogs` siyahısında görünür
- [ ] **Teq sayı doğrudur** — `curl -s "<URL>" | grep -o 'blogs/tag/[a-z0-9-]*' | sort -u`

JSON-LD-ni yoxlamaq üçün:

```
browser_evaluate → () => JSON.parse(document.querySelector('script[type="application/ld+json"]').textContent)
```

`BlogPosting` daxilində gözlənilənlər: `headline`, `description`, `image` (cover + bədən şəkilləri), `datePublished`, `author`, `keywords`, `hasPart` (başlıqlar), `timeRequired`.

## Üç Dilin Axını

Hər mövzu üç dəfə dərc olunur. Sıra vacibdir: **əvvəl EN, sonra TR, sonra RU** — çünki tərcümə qrupu birinci postla yaranır və qalan ikisi ona qoşulur.

### 1. EN — əsas post

`Language` = `English`, `Translation of` = `Not a translation`.

Server boş qrup sahəsini görüb **yeni `translationGroupId` yaradır**. Bu postun mövcudluğu qalan ikisinin şərtidir.

Dərc et, canlı URL-i yoxla, sonra növbətiyə keç.

### 2. TR və 3. RU

Yenidən `/admin/blogs/new`. Bu dəfə:

- `Language` = `Turkish` / `Russian`
- `Translation of` = açılan siyahıdan **EN postu** seç. Seçimlər `Başlıq (EN)` formatında görünür.

RU postunda da **eyni** EN postu seçilir — RU-nu TR-ə bağlamağa çalışma, qrup birdir və üçü də ona qoşulur.

### Slug: burada iş xarab olur

Slug **bütün postlar arasında unikaldır**, ona görə üç dilin üç ayrı slug-u olmalıdır. Onları da öz dilində yaz — slug SEO səthidir:

| Dil | Slug nümunəsi                     |
| --- | --------------------------------- |
| EN  | `best-anime-summer-2026-ranked`   |
| TR  | `2026-yaz-sezonu-en-iyi-animeler` |
| RU  | `luchshie-anime-leta-2026`        |

`slugify` artıq **transliterasiya edir** (2026-08-27 düzəlişi): kiril latına çevrilir, `ı`/`ş`/`ğ`/`ü` diakritikadan təmizlənir. Yəni `Лучшие аниме лета 2026` → `luchshie-anime-leta-2026`, `Sıralama` → `siralama`.

Buna baxmayaraq **slug-u özün yaz**. Səbəb SEO-dur, texnika deyil: avtomatik slug başlığın hərfi transliterasiyasıdır, sən isə açar sözü qısa və hədəflənmiş saxlamaq istəyirsən.

Transliterasiya olunmayan yazı (CJK, emoji) hələ də **boş** slug verir və forma `invalidSlug` qaytarır — o halda əl ilə yazmaq məcburidir.

### Teqlər: səssiz itki (düzəldilib, amma bilməyə dəyər)

Bu düzəlişdən əvvəl kiril teqlər **xəbərdarlıqsız yox olurdu** — `parseTagNames` slug-u boş çıxan adı atır. Yeddi rus teqindən dördü itmişdi, ikisi isə yalnız içində rəqəm olduğu üçün sağ qalıb `/tag/2026` və `/tag/10` kimi mənasız arxivlərə düşmüşdü.

**Köhnə postu düzəltmək üçün:** teq sətrini tam yenidən yaz və saxla. İtən teqlər DB-də yoxdur, ona görə redaktə formasında da görünmür — sadəcə "saxla" basmaq onları geri gətirmir.

Dərcdən sonra teq slug-larını həmişə yoxla:

```bash
curl -s "<canlı URL>" | grep -o 'blogs/tag/[a-z0-9-]*' | sort -u
```

Gözlədiyin sayda teq görmürsənsə — biri slug verməyib.

### Nə dəyişir, nə dəyişmir

| Sahə                               | Dillər arasında                        |
| ---------------------------------- | -------------------------------------- |
| `title`, `excerpt`, `content`      | **Yenidən yazılır** — tərcümə yox      |
| `slug`                             | Hər dildə fərqli, öz dilində           |
| `tags`                             | Öz dilində (hər dil öz arxivini qurur) |
| `coverImage`, bədən şəkil URL-ləri | **Eynidir** — imgbb-yə təkrar yükləmə  |
| `coverImageAlt`, altyazılar        | Öz dilində yazılır                     |
| `author`, `authorUrl`              | Eynidir                                |
| `translationGroupId`               | EN-də boş, TR/RU-da EN postu seçilir   |

### Xəta: `That article already has a version in this language.`

Həmin qrupda o dildən post artıq var. Yenisini yaratma — mövcudu redaktə et. Bu xəta adətən ikinci dəfə RU yaratmağa çalışanda çıxır.

### Yoxlama

Üçü də dərc olunandan sonra hər üç URL-i aç və `hreflang` bağlantılarını təsdiqlə:

```
browser_evaluate → () => [...document.querySelectorAll('link[rel=alternate]')]
    .map(l => l.hreflang + ' -> ' + l.href)
```

Hər səhifədə digər iki dilin `hreflang` sətri görünməlidir. Görünmürsə `Translation of` seçilməyib.

## Redaktə

`/en/admin/blogs/<id>/edit`. Eyni forma, `Save changes` düyməsi ilə. Slug dəyişdirsən köhnə URL **404 olur** — dərc olunmuş və indekslənmiş postun slug-unu dəyişmə.
