# Araşdırma: Trend, Rəqib, Açar Söz

## Niyə mətndən əvvəl

"Anime haqqında yaxşı məqalə" yazmaq asandır və heç kim oxumur. Oxunan məqalə — **artıq axtarılan sualın** ən yaxşı cavabıdır. Ona görə sıra belədir: əvvəl nəyin axtarıldığını tap, sonra rəqiblərin cavabını oxu, sonra onların əskik qoyduğunu yaz.

## 1. Nə trenddədir

### AniList — real izləmə siqnalı

```bash
curl -s -X POST https://graphql.anilist.co -H "Content-Type: application/json" \
  -d '{"query":"{Page(perPage:15){media(type:ANIME,sort:TRENDING_DESC,status_in:[RELEASING,NOT_YET_RELEASED]){id title{romaji english} trending popularity averageScore genres season seasonYear episodes nextAiringEpisode{episode airingAt}}}}"}'
```

`trending` sahəsi **son saatlarda AniList-də aktivliyi** ölçür — yəni insanların indi baxdığını. `popularity` isə tarixi cəmdir. Fərq vacibdir: `popularity` sənə həmişə One Piece deyəcək, `trending` isə bu həftə partlayan seriyanı.

### Xəbər axını — son 7 gün

```
WebSearch: "anime announcement" OR "anime trailer" OR "season 2 confirmed" son 7 gün
WebSearch: <konkret anime adı> news
```

Axtardığın hadisələr: yeni mövsüm elanı, treyler, studiya dəyişikliyi, final epizodu, mübahisə, rekord. Bunların hər biri **axtarış həcmi partlaması** deməkdir və 24–72 saatlıq pəncərədir.

### Mövsümi təqvim

Yanvar / aprel / iyul / oktyabr — mövsüm başlanğıcları. Mövsümdən **2–3 həftə əvvəl** "nə izləməli" axtarışları qalxır. Mövsüm ortasında "ən yaxşı X" axtarışları qalxır. Postu bu pəncərəyə tuş gətir.

## 2. Rəqib analizi

Mövzu seçiləndən sonra, yazmazdan **əvvəl**:

```
WebSearch: <hədəf açar söz>
```

İlk 3–5 nəticəni `WebFetch` ilə oxu və hər biri üçün çıxar:

| Nə çıxarırsan         | Nəyə lazımdır                                     |
| --------------------- | ------------------------------------------------- |
| Başlıq düsturu        | SERP-də nə işləyir                                |
| Söz sayı              | Səninki müqayisə oluna bilən dərinlikdə olmalıdır |
| `h2` strukturu        | Hansı sualları cavablayırlar                      |
| Nəşr/yenilənmə tarixi | Köhnəlibsə — sənin üstünlüyün                     |
| **Əskik qoyduqları**  | **Sənin məqalənin mövcudluq səbəbi**              |

Sonuncusu ən vacibidir. Əgər ilk 5 nəticə eyni 10 animeni eyni sıra ilə sayırsa, sənin məqalən **başqa bir sual** cavablamalıdır: niyə bu sıra? kimə uyğun deyil? nə dəyişdi?

**Rəqibi təkrarlama.** Onların siyahısını köçürüb sözləri dəyişmək — 6-cı eyni məqalə deməkdir və heç vaxt 1-ci olmayacaq.

## 3. Açar söz

Bir postun **bir əsas açar sözü** var. Onu seç və bu yerlərdə təbii şəkildə işlət:

- Başlıqda (mümkünsə ilk 5 sözdə)
- Excerpt-də (meta description)
- Slug-da
- Birinci paraqrafda
- Ən azı bir `h2`-də

**Açar söz yığma yoxdur.** Mətnə 14 dəfə "top 10 anime 2026" yazmaq 2011-ci ilin taktikasıdır və indi cəza gətirir.

Uzun quyruq axtar: `anime like frieren` sözü `best anime`-dən 100 dəfə az axtarılır, amma sən onda 1-ci ola bilərsən, o birində yox.

### Axtarış niyyəti

| Niyyət     | Sorğu forması               | Yazacağın format           |
| ---------- | --------------------------- | -------------------------- |
| Naviqasiya | "frieren watch"             | Post yox — məhsul səhifəsi |
| Məlumat    | "why is frieren so slow"    | Esse, təhlil               |
| Siyahı     | "best fantasy anime"        | Top 10, sıralanmış         |
| Müqayisə   | "frieren vs mushoku tensei" | Yan-yana təhlil            |

Niyyəti səhv oxumaq — ən çox rast gəlinən uğursuzluq səbəbidir. Siyahı gözləyən sorğuya esse yazsan, oxucu 4 saniyədə geri qayıdır.

## 4. Faktların Yoxlanması

Postda yazılan **hər** rəqəm və tarix yoxlanılmalıdır:

- Epizod sayı, yayım tarixi, studiya, mənbə material → **AniList GraphQL**
- Xəbər, elan, rekord → **rəsmi mənbə** (studiya/naşir hesabı, ANN)
- Bal/reytinq → AniList `averageScore` (və hansı tarixdə olduğunu qeyd et)

Yoxlaya bilmirsənsə — **yazma**. Anime auditoriyası səhvi dərhal görür və bir səhv bütün siyahının etibarını aparır.

## 5. Mənbə Mətndə Adlandırılmır

Faktları yuxarıdakı kimi yoxlamaqda davam et — amma **dərc olunan postda AniList-in adını çəkmə**. Nə bədəndə, nə başlıqda, nə altyazıda, nə `<aside>`-da, nə də link kimi.

Bu, gizlətmək deyil. AniList bizim **iş alətimizdir**, oxucunun məsələsi deyil: postu bir platformun daxili siyahı statistikasına bağlamaq həm mətni həmin platformun reklamına çevirir, həm də rəqəm dəyişəndə məqaləni yalanlayır.

Eyni qayda şəkillərə də aiddir: `references/images.md` → **Mənbənin Adı ŞƏKLİN ÜZƏRİNDƏ YAZILMIR**.

### Metodikanı mənbə adlandırmadan yaz

Rəqəm verirsənsə, onun nə olduğunu izah et — haradan gəldiyini yox:

| ❌ Yazma                                   | ✅ Yaz                                                 |
| ------------------------------------------ | ------------------------------------------------------ |
| "AniList-dən çəkdim"                       | "Mövsümün elan olunmuş cədvəlini bütövlükdə saydım"    |
| "AniList list-adds"                        | "yayımdan əvvəl izləmə siyahılarına əlavə olunma sayı" |
| "AniList `averageScore` 87"                | "orta izləyici balı 87"                                |
| "AniList relation qrafında prequel yoxdur" | "elan olunmuş öncül seriyası yoxdur"                   |

**Tarixi saxla.** "28 Avqust 2026 tarixinə görə" cümləsi mənbə adı olmadan da dürüstlük siqnalıdır və rəqəm sonradan dəyişəndə səni qoruyur.

**Rəsmi elana istisna yoxdur, sadəcə fərq var:** studiya elanı, naşir hesabı və ya xəbər mənbəyi — bunlar **oxucu üçün dəyərli** olduğu üçün adlandırıla və linklənə bilər. Qadağa data bağçılığına aiddir, jurnalistikaya yox.

## Araşdırma Çıxışı

Yazmağa keçməzdən əvvəl bunlar əlində olmalıdır:

- [ ] Əsas açar söz + axtarış niyyəti
- [ ] Trend siqnalının səbəbi (nə baş verdi, nə vaxt)
- [ ] İlk 3 rəqibin başlıq/struktur/uzunluq xülasəsi
- [ ] Onların əskik qoyduğu bir şey — məqalənin bucağı
- [ ] Adı çəkiləcək hər anime üçün AniList ID + təsdiqlənmiş faktlar (ID daxili qeyddir — posta düşmür)
- [ ] Postda işlənəcək hər rəqəm üçün mənbə adlandırmayan bir izah cümləsi
- [ ] Rəsmi artwork URL-ləri
