# Şəkil Boru Xətti

## Qızıl Qayda

> **Postun bölmə şəkilləri ChatGPT ilə yaradılır — amma heç biri "yaddaşdan" çəkilmir. Hər generasiyanın altında real referans şəkli durur.**

Anime bloqunda generativ modelə quru-quruya "Frieren çək" demək — mövcud olmayan bir personajı real kimi göstərmək deməkdir. Oxucu onu tanımır; Google şəkli məqalənin mövzusu ilə uyğunsuz sayır. Ona görə axın **iki addımlıdır**: əvvəl rəsmi artwork/kadr referans kimi tapılır (AniList → Google Şəkillər), sonra həmin şəkil ChatGPT söhbətinə **əlavə olunur** və model onu yenidən səhnələşdirir.

Yəni: **rəsmi artwork generasiyanın girişidir, postun şəkli isə generasiyanın çıxışıdır.** Kompozisiya (cover, Top 10 kartı) həmişə olduğu kimi koddan gəlir.

## Şəkil Mənbələri — Prioritet Sırası

| Sıra | Mənbə                                       | Nə üçün                                            | Necə                                        |
| ---- | ------------------------------------------- | -------------------------------------------------- | ------------------------------------------- |
| 1    | **AniList CDN**                             | Personaj portreti, cover, banner — **referans**    | GraphQL sorğusu (aşağıda)                   |
| 2    | **Google Şəkillər** (`udm=2`)               | Səhnə, kadr, poza — **referans**                   | `browser_navigate` + endir, `refs/` altına  |
| 3    | **ChatGPT generasiyası** (referans əlavəli) | **Bölmə/bədən şəkilləri** — personaj, səhnə, əhval | **`references/chatgpt-images.md`**          |
| 4    | **Kompozisiya** (HTML→screenshot)           | Cover, "Top 10" kartları, müqayisə cədvəlləri      | `assets/cover-template.html`                |
| 5    | **Rəsmi press şəkli**                       | Studiya/naşir elanları, konkret epizod iddiası     | `browser_navigate` + saxla, mənbəni qeyd et |

Referanslar `.playwright-mcp/refs/` altında saxlanılır və **posta getmir, imgbb-yə yüklənmir** — onlar yalnız modelə verilən girişdir.

### AI generasiyası = brauzerdən ChatGPT, referans əlavə edilmiş

Şəkil generasiyası `chatgpt.com`-da, istifadəçinin öz hesabında aparılır. Referans tapmaq, `browser_file_upload` ilə söhbətə əlavə etmək, prompt şablonu, nəticəni referansla tutuşdurmaq və **bir söhbətdə maksimum 3 şəkil / bir personaj** qaydası: `references/chatgpt-images.md`.

### Codex CLI şəkil çəkmir

Codex CLI-də **şəkil generasiya aləti yoxdur** (`codex plugin list` → `documents`, `pdf`, `spreadsheets`, `presentations`, `template-creator`, `browser`, `visualize`). Şəkil üçün ona müraciət etmə.

İstəsən Codex-i **kompozisiya kodu** üçün işlədə bilərsən (məcburi deyil):

```bash
codex exec --skip-git-repo-check --sandbox workspace-write \
  "Bu HTML cover şablonunu 10 elementli şəbəkə düzümü üçün uyğunlaşdır: \
   .playwright-mcp/cover.html. Qara fon, #E50914 aksent, künclər sərt, \
   gradient yalnız scrim üçün. Ölçülər vw vahidində qalsın."
```

### higgsfield MCP

Alternativ generator, amma balans azdır (`mcp__higgsfield__balance` — free planda bir neçə kredit). ChatGPT əlçatan olduğu müddətcə ona ehtiyac yoxdur.

## AniList-dən Rəsmi Artwork

```bash
curl -s -X POST https://graphql.anilist.co -H "Content-Type: application/json" \
  -d '{"query":"{Page(perPage:10){media(type:ANIME,sort:TRENDING_DESC){id title{romaji english} coverImage{extraLarge} bannerImage}}}"}'
```

Faydalı `sort` dəyərləri: `TRENDING_DESC` (indi danışılan), `POPULARITY_DESC` (hər zaman məşhur), `SCORE_DESC` (ən yüksək bal). Konkret mövsüm üçün `season: WINTER, seasonYear: 2026` əlavə et.

`bannerImage` geniş (1900×400) — mühit/atmosfer referansı üçün ideal. `coverImage.extraLarge` şaquli — cover strip-i üçün.

Personaj referansı lazımdırsa `characters` bloku ilə soruş — `image.large` rəsmi portretdir:

```
{Media(search:"Frieren",type:ANIME){title{romaji} characters(perPage:6,sort:FAVOURITES_DESC){nodes{name{full} image{large}}}}}
```

## Cover Kompozisiyası (sınaqdan keçib)

### 1. Şablonu doldur

`assets/cover-template.html`-i `.playwright-mcp/` altına kopyala və əvəzləyiciləri doldur:
`POSTER_URL_1..5`, `KICKER_TEXT`, `HEADLINE_TEXT`, `SUBHEAD_TEXT`.

### 2. Yerli HTTP server qaldır

Playwright MCP `file:` protokolunu bloklayır. Fayl serverə lazımdır:

```bash
# arxa planda işə sal
python -m http.server 8899 --bind 127.0.0.1
```

Serveri işi bitəndə dayandır.

### 3. Render et və screenshot al

```
browser_resize        → width 1600, height 900      (16:9 viewport)
browser_navigate      → http://127.0.0.1:8899/cover.html
browser_take_screenshot → scale "device", type "png",
                          filename .playwright-mcp/cover.png
```

**Üç tələ:**

- **Screenshot faylı layihə kökünün içində olmalıdır.** Playwright MCP başqa yerə yazmır (`File access denied ... outside allowed roots`). `.playwright-mcp/` istifadə et — `.gitignore`-dadır.
- **Element screenshot (`target`) İSTİFADƏ ETMƏ.** Windows ekran miqyaslandırmasında `devicePixelRatio` 1 deyil (məs. 0.8) və element screenshot-u kadrın yalnız `dpr` hissəsini doldurur — qalanı qara boşluq olur. **Viewport screenshot** götür; şablon `vw`/`vh` vahidlərində qurulub, ona görə kadrı tam doldurur.
- **Flex şəkillərində `min-width: 0` şərtdir.** Olmasa posterlər öz təbii enlərində qalır, kanvas 3000px-ə uzanır və sağ tərəf kəsilir.

### 4. BAX

```
Read .playwright-mcp/cover.png
```

Bu addım **buraxıla bilməz**. Yoxladıqların:

- Mətn oxunur, kəsilmir, poster üzərinə düşüb itmir?
- Bütün posterlər tam görünür (kənar kəsilməyib)?
- Qara boşluq yoxdur?
- Personajlar rəsmi artwork-dandır — heç bir uydurma sifət, əl, silah yoxdur?

### 5. imgbb-yə yüklə

```bash
node .claude/skills/blog-publishing/scripts/imgbb-upload.mjs \
  .playwright-mcp/cover.png "top-10-winter-2026-anime-cover"
```

Çıxış: `{"url":"https://i.ibb.co/.../top-10-winter-2026-anime-cover.png","width":1600,"height":900,"deleteUrl":"..."}`

**API açarı skriptdə saxlanılır** (`9cb3d752d612361b5912ce2eea8c6297`) — heç kimdən istəmə. `IMGBB_API_KEY` env dəyişəni onu əvəz edir.

İkinci arqument **fayl adı olur və URL-in bir hissəsidir** → SEO səthidir. Açar söz slug-u yaz, `image1` yox.

Skript uzaq URL-i də qəbul edir (AniList şəklini birbaşa imgbb-yə köçürmək üçün):

```bash
node scripts/imgbb-upload.mjs "https://s4.anilist.co/.../bx21-....jpg" "one-piece-cover"
```

## Bədən İçi Şəkillər

Bədən şəkilləri **sanitize olunmuş HTML-də adi `<img>`** kimi render olunur (`next/image`-dən keçmir). İki yazılış üsulu:

**Ölçü məlumdursa** — layout sıçramasının qarşısını alır:

```html
<figure>
  <img
    src="https://i.ibb.co/xxx/scene.png"
    alt="Konkret təsvir"
    width="1600"
    height="900"
    loading="lazy"
    decoding="async"
  />
  <figcaption>Şəkli izah edən, məqaləyə bağlayan bir cümlə.</figcaption>
</figure>
```

**Ölçü məlum deyilsə** — Markdown `title` avtomatik `<figcaption>`-a çevrilir:

```markdown
![Konkret təsvir](https://i.ibb.co/xxx/scene.png "Altyazı mətni")
```

Renderer tək şəkilli paraqrafı `<figure>`-ə qaldırır (`liftImagesIntoFigures`), ona görə şəkli **öz sətrində** yaz — mətnin içində yox.

Bədəndəki hər şəkil JSON-LD `image` massivinə düşür → şəkil axtarışı üçün əlavə səth.

## Alt Mətn

| Pis                                 | Yaxşı                                               |
| ----------------------------------- | --------------------------------------------------- |
| `anime`                             | `Frieren uzun otların içində dayanıb, arxada qürub` |
| `top 10 anime 2026 best anime list` | `2026 qış mövsümünün beş serialının cover kollajı`  |
| `` (boş)                            | Yalnız şəkil sırf dekorativdirsə boş qoy            |

Alt mətn **şəkli təsvir edir**, açar söz yığmır. Ekran oxuyucusu üçün yazılır; Google onu ona görə qiymətləndirir ki, real təsvirdir.

## Məntiq Xətaları Yoxlama Siyahısı

Yüklədiyin **hər** şəkil üçün:

- [ ] Şəkil məqalənin həmin bölməsinin mövzusunu göstərir (təsadüfi artwork deyil)
- [ ] Generasiya olunubsa: referans şəkli əlavə edilib və nəticə referansla tutuşdurulub (saç, göz, paltar)
- [ ] Sırada göstərilən anime həqiqətən o sıradadır (Top 10-da 3-cü şəkil 3-cü animeninkidir)
- [ ] Şəkildəki mətn (varsa) düzgün yazılıb — kompozisiyadan gəlir, generasiyadan yox
- [ ] Sifət, əl, göz sayı normaldır
- [ ] Konkret epizod/tarix iddiası varsa şəkil rəsmi mənbədəndir — generasiya deyil
- [ ] Fayl adı və alt mətn şəklin əslində göstərdiyini deyir, "rəsmi kadr" iddiası etmir
