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

JSON-LD-ni yoxlamaq üçün:

```
browser_evaluate → () => JSON.parse(document.querySelector('script[type="application/ld+json"]').textContent)
```

`BlogPosting` daxilində gözlənilənlər: `headline`, `description`, `image` (cover + bədən şəkilləri), `datePublished`, `author`, `keywords`, `hasPart` (başlıqlar), `timeRequired`.

## Redaktə

`/en/admin/blogs/<id>/edit`. Eyni forma, `Save changes` düyməsi ilə. Slug dəyişdirsən köhnə URL **404 olur** — dərc olunmuş və indekslənmiş postun slug-unu dəyişmə.
