# Anime Streaming Platform — Layihə Spesifikasiyası

Bu sənəd GitHub-da epic/issue/sub-issue strukturu yaratmaq üçün istifadə olunur.
Agent bu sənədə əsasən `gh issue create` (və mövcuddursa native sub-issue linkləmə)
ilə issue-lar yaratmalıdır. Hər EPIC ayrıca issue, hər sub-issue həmin epic-ə bağlı
sub-issue kimi yaradılmalıdır.

## 0. Ümumi Məlumat

**Layihə:** Premium Anime İzləmə Platforması
**Data mənbəyi:** Consumet API
**Default dil:** English (EN) — əlavə dillər: Türkcə (TR), Rusca (RU)
**Autentifikasiya:** Yalnız Google OAuth (Google ilə giriş)

## 1. Texnologiya Stack-i

| Kateqoriya | Texnologiya |
|---|---|
| Framework | Next.js (App Router), TypeScript |
| Backend | Node.js (Next.js API routes / ayrıca server, lazım olarsa) |
| Verilənlər bazası | Neon (Postgres) |
| Cache | Redis |
| State management | Redux Toolkit (RTK), RTK Query |
| HTTP client | Axios |
| Stil | Tailwind CSS, shadCN |
| i18n | next-intl / i18next (EN default, TR, RU) |
| İkonlar | react-icons və ya lucide-react (SVG, emoji YOX) |
| Animasiya | Framer Motion, React Three Fiber / Three.js (3D) |
| Komponent generasiyası | 21st.dev promptları (animasiyalı komponentlər üçün) |
| Deploy (frontend+backend) | Vercel (əgər backend Vercel-i dəstəkləmirsə → Render.com) |
| Data mənbəyi | Consumet API |

## 2. Ümumi Development Qaydaları

- Ən müasir tövsiyə olunan (best-practice) üsullarla işlənməli, köhnəlmiş
  (deprecated) üsullardan qaçılmalıdır.
- Kod yazmazdan əvvəl aktual sənədləşmə/mənbələr araşdırılmalı, öz bildiyini
  yazmaq yox, müasir mənbələrə əsaslanan yanaşma seçilməlidir.
- Yeni kod mövcud funksionallığı pozmamalıdır — hər dəyişiklikdən sonra
  reqressiya yoxlanılmalıdır.
- SEO optimizasiyası mükəmməl olmalıdır (metadata, structured data, SSR/ISR).
- Performans optimizasiyası mükəmməl olmalıdır (lazy loading, image
  optimization, code splitting, caching strategiyası — Redis).
- Bütün cihazlar üçün tam responsive (mobile, tablet, desktop).
- Emoji istifadə edilməməli, yalnız SVG ikonlar (react-icons / lucide-react).
- Dizaynda: glassmorphism YOX, gradient rənglər YOX (UI komponentlərində),
  border-radius YOX (kəskin/sərt küncli komponentlər), mavi-bənövşəyi ton
  qarışığı, arxa plan qara, ikinci rəng Netflix logosundakı qırmızı.
- **Qeyd:** atmosferik arxa plan video/animasiyaları (login, profil, search,
  404 səhifələri) bu "gradient yox" qaydasından fərqli qatdır — bax
  `DESIGN-SPEC.md` → bölmə 6.

## 3. Git / GitHub Workflow Qaydaları

- Hər işə başlamazdan əvvəl mütləq `main` branch pull edilməlidir.
- Hər tapşırıq üçün ayrıca branch açılmalıdır (naming: `feature/...`,
  `fix/...`, `chore/...`, `docs/...` — müasir conventional branch naming).
- İş bitəndə, problem yoxdursa, dəyişikliklər push edilib PR açılmalıdır.
- PR açarkən müvafiq label-lar əlavə edilməli və PR sahibinə (mənə)
  `assign` edilməlidir.PR ingilizce olamlidir.
- CI yoxlamalarından keçdikdən sonra (CI-da problem olmadıqda) merge
  edilə bilər.
- Hər EPIC üçün ayrıca label (məs. `epic:auth`, `epic:home`,
  `epic:admin`) istifadə olunmalıdır.

---

## EPIC-01: Layihə Qurulması (Project Setup)
**Labels:** `epic`, `setup`

**Sub-issues:**
- [ ] **SETUP-01:** Next.js (App Router) + TypeScript layihəsinin yaradılması
- [ ] **SETUP-02:** Tailwind CSS + shadCN inteqrasiyası, dizayn tokenlərinin
  (rənglər, tipografiya, spacing) `tailwind.config` içində təyin edilməsi
- [ ] **SETUP-03:** Redux Toolkit + RTK Query konfiqurasiyası, Axios base
  instance-ın qurulması
- [ ] **SETUP-04:** Neon (Postgres) verilənlər bazası bağlantısı və ORM
  seçimi (Prisma/Drizzle) qurulması
- [ ] **SETUP-05:** Redis cache qatının inteqrasiyası
- [ ] **SETUP-06:** i18n (next-intl/i18next) qurulması — EN (default), TR, RU
- [ ] **SETUP-07:** ESLint, Prettier, Husky/lint-staged, commit conventions
- [ ] **SETUP-08:** Vercel deploy konfiqurasiyası (frontend + mümkünsə backend);
  backend Vercel-i dəstəkləməsə Render.com fallback planı
- [ ] **SETUP-09:** Environment variables strukturunun (`.env.example`)
  hazırlanması

---

## EPIC-02: Autentifikasiya (Google Login)
**Labels:** `epic`, `auth`

**Sub-issues:**
- [ ] **AUTH-01:** Google OAuth inteqrasiyası (NextAuth.js və ya bənzər)
- [ ] **AUTH-02:** Login zamanı istifadəçi profilinin (ad, şəkil, email)
  Neon DB-də saxlanması
- [ ] **AUTH-03:** Protected route middleware (profil, favoritlər və s.
  yalnız login olduqda əlçatan olan hissələr üçün)
- [ ] **AUTH-04:** Session/token idarəetməsi və logout funksionallığı

---

## EPIC-03: Header & Naviqasiya
**Labels:** `epic`, `frontend`, `navigation`

**Sub-issues:**
- [ ] **HEADER-01:** Header layout — sol tərəfdə logo (qırmızı), fixed,
  `top:0`, arxa plan şəffaf
- [ ] **HEADER-02:** Kateqoriyalar dropdown-u — Consumet API-dan
  kateqoriyaların çəkilməsi, alt-alta və yanaşı yerləşən elementlər
- [ ] **HEADER-03:** Naviqasiya linkləri — Favoritlər, Yeni (yeni animeler),
  Populyar, Bloqlar, Axtarış (hər biri müvafiq səhifəyə yönləndirir)
- [ ] **HEADER-04:** Sağ tərəf — Login düyməsi / login olunubsa profil şəkli
  (klikləndikdə dropdown menyu açılır)
- [ ] **HEADER-05:** Dil dəyişmə dropdown-u (EN/TR/RU)
- [ ] **HEADER-06:** Mobil/tablet versiya — burger ikon, klikləndikdə sağdan
  animasiya ilə açılan menyu

---

## EPIC-04: Ana Səhifə (Home Page)
**Labels:** `epic`, `frontend`, `home`

**Təsvir:** Dizayn `DESIGN-SPEC.md` və ref.zip-dəki home page şəklinə əsaslanır.

**Sub-issues:**
- [ ] **HOME-01:** Hero/banner seksiyası
- [ ] **HOME-02:** "Son əlavə edilənlər" seksiyası — 16:9 ölçülü anime kartları
- [ ] **HOME-03:** "Populyar olanlar" seksiyası — 16:9 kartlar
- [ ] **HOME-04:** "Ən yüksək reytinqli" seksiyası — 16:9 kartlar
- [ ] **HOME-05:** "Trenddə olanlar" seksiyası — 16:9 kartlar
- [ ] **HOME-06:** Anime kartı komponenti (hover animasiyası, 21st.dev
  prompt-larından istifadə)
- [ ] **HOME-07:** Data fetching — Consumet API + RTK Query + Redis cache
  strategiyası (SSR/ISR ilə SEO uyğunluğu)

---

## EPIC-05: Anime Detal Səhifəsi
**Labels:** `epic`, `frontend`, `anime-detail`

**Sub-issues:**
- [ ] **DETAIL-01:** Anime məlumatlarının (başlıq, təsvir, janr, reytinq,
  bölüm siyahısı) göstərilməsi
- [ ] **DETAIL-02:** Bölüm (episode) siyahısı komponenti
- [ ] **DETAIL-03:** "Favoritlərə əlavə et" funksionallığı
- [ ] **DETAIL-04:** SEO metadata (dynamic meta tags, Open Graph)

---

## EPIC-06: Bölüm İzləmə Səhifəsi + Video Player + Reklamlar
**Labels:** `epic`, `frontend`, `video-player`

**Təsvir:** YouTube tərzində tam funksional video player. Video başlamazdan
əvvəl, video çərçivəsi ölçüsündə, videonun üzərində reklam göstərilir.
5 saniyə keçdikdən sonra "Reklamı keç" düyməsi görünür və istifadəçi
reklamı keçib anime bölümünü izləməyə başlaya bilər. Reklamlar admin
panelindən idarə olunur.

**Sub-issues:**
- [ ] **PLAYER-01:** Custom video player komponenti (play/pause, progress
  bar, volume, fullscreen, keyfiyyət seçimi, alt-yazı dəstəyi)
- [ ] **PLAYER-02:** Pre-roll reklam overlay-i:
  - Video frame ilə eyni ölçüdə göstərilir (tam üzərində, tam örtür)
  - Sayğac: 5 saniyə ("Reklamı keç: 5s" → "4s" → ... geri sayım)
  - 5 saniyədən sonra "Reklamı keç" (Skip Ad) düyməsi aktiv olur
    (YouTube-dakı kimi sağ alt küncdə)
  - Skip edildikdə əsas video avtomatik başlayır
  - Əgər reklam 5 saniyədən qısadırsa, reklam bitdikdə avtomatik keçid
- [ ] **PLAYER-03:** Reklam məzmununun backend-dən (admin tərəfindən idarə
  olunan) dinamik çəkilməsi
- [ ] **PLAYER-04:** Növbəti bölümə keçid, avtomatik növbəti bölüm təklifi
  (YouTube-dakı kimi "next episode" overlay)
- [ ] **PLAYER-05:** İzləmə tarixçəsinin (watch progress) saxlanması —
  istifadəçi qaldığı yerdən davam edə bilsin

---

## EPIC-07: Axtarış Səhifəsi
**Labels:** `epic`, `frontend`, `search`

**Sub-issues:**
- [ ] **SEARCH-01:** Axtarış input-u + Consumet API inteqrasiyası
- [ ] **SEARCH-02:** Nəticələrin göstərilməsi (16:9 kartlar)
- [ ] **SEARCH-03:** Arxa plan animasiya videosu (default, ref: `search_page.mov`)
- [ ] **SEARCH-04:** Debounce / filtering məntiqi

---

## EPIC-08: Populyar / Bloqlar / Favoritlər (Infinite Scroll)
**Labels:** `epic`, `frontend`, `infinite-scroll`

**Sub-issues:**
- [ ] **LIST-01:** `IntersectionObserver` əsaslı infinite scroll hook-u
  (bütün üç səhifədə paylaşılan)
- [ ] **LIST-02:** Populyar səhifəsi — dikey formatda kartlar
- [ ] **LIST-03:** Bloqlar səhifəsi — dikey formatda kartlar
- [ ] **LIST-04:** Favoritlər səhifəsi — dikey formatda kartlar (yalnız
  login olmuş istifadəçilər üçün)
- [ ] **LIST-05:** Bloq detal səhifəsi — bloqun şəkli arxa plan, məzmun
  şəklin üzərində yerləşir

---

## EPIC-09: Profil Səhifəsi
**Labels:** `epic`, `frontend`, `profile`

**Sub-issues:**
- [ ] **PROFILE-01:** İstifadəçi məlumatlarının göstərilməsi/redaktəsi
- [ ] **PROFILE-02:** Arxa planda animasiya video — mobil üçün
  `profil_sehifesi_mobil_ucun.mov`, tablet/web üçün
  `profil_sehifesi_tablet_ve_web_ucun.mov` (default, silinməz)
- [ ] **PROFILE-03:** İzləmə tarixçəsi / favoritlər qısa görünüşü

---

## EPIC-10: Login Səhifəsi
**Labels:** `epic`, `frontend`, `auth`

**Sub-issues:**
- [ ] **LOGIN-01:** Google login düyməsi və axını
- [ ] **LOGIN-02:** Arxa plan animasiya video (default, ref:
  `login_sehifesi_tablet_ve_yuxari_olculer_ucun.mov`; mobil üçün eyni
  video responsive crop/object-fit ilə istifadə oluna bilər, admin
  ayrıca mobil versiya əlavə etməyibsə)

---

## EPIC-11: 404 Səhifəsi
**Labels:** `epic`, `frontend`

**Sub-issues:**
- [ ] **404-01:** 404 dizaynının tətbiqi (ref.zip-ə əsasən)
- [ ] **404-02:** Arxa plan animasiya video (default, ref: `404_sehifesi.mov`)

---

## EPIC-12: Admin Paneli
**Labels:** `epic`, `admin`, `backend`

**Təsvir:** Tam funksional admin paneli.

**Sub-issues:**
- [ ] **ADMIN-01:** Admin auth/permission sistemi (rol-əsaslı giriş nəzarəti)
- [ ] **ADMIN-02:** Reklam idarəetməsi — reklam əlavə et/sil/redaktə et,
  reklam müddətini və 5 saniyəlik "skip" vaxtını təyin et
- [ ] **ADMIN-03:** Video format-doğrulama skripti — admin arxa plan
  animasiya videosu əlavə edərkən avtomatik formatlaşdırma (ölçü,
  kodek — H.264/WebM, sıxılma, bit-rate limiti) işə düşür ki,
  performansı zəiflətməsin
- [ ] **ADMIN-04:** Hər səhifə üçün arxa plan animasiya videosunun idarəsi
  (login, profil — mobil/tablet ayrı, search, 404, admin) — default
  videolar heç vaxt silinməməli, yalnız admin əlavə etməyibsə default
  görünməlidir
- [ ] **ADMIN-05:** Bloq idarəetməsi (yarat/redaktə et/sil)
- [ ] **ADMIN-06:** İstifadəçi idarəetməsi (siyahı, blokla, sil)
- [ ] **ADMIN-07:** Admin panel arxa plan animasiya video dəstəyi (default,
  ref: `admin_sehifesi_mobil_ucun.mov` — mobil interaksiya nümunəsi)

---

## EPIC-13: SEO & Performans Optimizasiyası
**Labels:** `epic`, `performance`, `seo`

**Sub-issues:**
- [ ] **PERF-01:** Metadata, sitemap.xml, robots.txt
- [ ] **PERF-02:** Şəkil/video optimizasiyası (next/image, lazy loading,
  adaptive video streaming, arxa plan videoları üçün `muted`, `loop`,
  `playsinline`, aşağı bitrate)
- [ ] **PERF-03:** Core Web Vitals auditı və optimizasiyası
- [ ] **PERF-04:** Redis cache strategiyasının performans testi

---

## EPIC-14: Responsive Dizayn
**Labels:** `epic`, `frontend`, `responsive`

**Sub-issues:**
- [ ] **RESP-01:** Mobile breakpoint tətbiqi (bütün səhifələr)
- [ ] **RESP-02:** Tablet breakpoint tətbiqi (bütün səhifələr)
- [ ] **RESP-03:** Desktop/large-screen tətbiqi (bütün səhifələr)

---

## EPIC-15: Sənədləşdirmə (Documentation)
**Labels:** `epic`, `docs`

**Sub-issues:**
- [ ] **DOCS-01:** Professional `README.md` (quraşdırma, texnologiyalar,
  env variables, scripts)
- [ ] **DOCS-02:** `CONTRIBUTING.md`
- [ ] **DOCS-03:** API/arxitektura sənədləşdirməsi
- [ ] **DOCS-04:** Admin panel istifadə təlimatı

---

## EPIC-16: Deployment
**Labels:** `epic`, `devops`

**Sub-issues:**
- [ ] **DEPLOY-01:** Vercel-də frontend (və mümkünsə backend) deploy
- [ ] **DEPLOY-02:** Backend Vercel dəstəkləmirsə Render.com-a fallback
  deploy
- [ ] **DEPLOY-03:** Neon + Redis production konfiqurasiyası
- [ ] **DEPLOY-04:** CI/CD pipeline (GitHub Actions) — test + lint + build


