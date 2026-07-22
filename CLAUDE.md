@AGENTS.md

# Anime Streaming Platform — CLAUDE.md

Premium anime izləmə platforması. Data mənbəyi: **Consumet API**. Auth: **yalnız Google OAuth**.
Dillər: **EN (default), TR, RU**.

## Əsas Sənədlər

| Sənəd               | Məzmun                                                                                               |
| ------------------- | ---------------------------------------------------------------------------------------------------- |
| `PROJECT-ISSUES.md` | Epic/sub-issue strukturu — GitHub issue-lar bu sənədə əsasən yaradılır                               |
| `DESIGN-SPEC.md`    | Dizayn sistemi, səhifə-üzrə təlimatlar, atmosferik fon videolarının frame-by-frame analizi (bölmə 6) |
| `.claude/skills/`   | Layihə skill-ləri — aşağıdakı cədvələ bax                                                            |

## Texnologiya Stack-i

- **Framework:** Next.js (App Router) + TypeScript
- **DB:** Neon (Postgres) + Prisma/Drizzle · **Cache:** Redis
- **State:** Redux Toolkit + RTK Query · **HTTP:** Axios
- **Stil:** Tailwind CSS + shadCN · **i18n:** next-intl/i18next
- **İkonlar:** lucide-react / react-icons (SVG) · **Animasiya:** Framer Motion, React Three Fiber
- **Deploy:** Vercel (backend uyğun deyilsə → Render.com)

## Qızıl Qaydalar (hər tapşırıqda məcburi)

1. Kod yazmazdan əvvəl aktual sənədləşməni araşdır (context7 və s.) — deprecated üsul QADAĞANDIR.
2. Yeni kod mövcud funksionallığı pozmamalıdır — hər dəyişiklikdən sonra reqressiya yoxla.
3. SEO və performans mükəmməl olmalıdır (SSR/ISR, metadata, lazy loading, Redis cache).
4. Tam responsive: mobil, tablet, desktop — heç bir komponent mobil versiyada itirilməməli.
5. Emoji QADAĞANDIR — yalnız SVG ikonlar (lucide-react / react-icons).

## Dizayn Qadağaları (STRICT — UI komponentləri üçün)

- ❌ Glassmorphism · ❌ Gradient (düymə/kart/panel-də) · ❌ Border-radius (sərt künclər) · ❌ Emoji
- Fon: qara (`#000000`) · Aksent: Netflix qırmızısı (`#E50914`) · İkinci ton: mavi-bənövşəyi (yalnız aksent)
- **İstisna:** atmosferik arxa plan videoları (login, profil, search, 404) fərqli qatdır — glow/duman normaldır. Bax: `atmospheric-backgrounds` skill və `DESIGN-SPEC.md` bölmə 6.

## Git / GitHub Workflow (qısa)

- İşə başlamazdan əvvəl `main` pull et; hər tapşırıq üçün ayrıca branch (`feature/...`, `fix/...`, `chore/...`, `docs/...`).
- **Bir tapşırığı bir nəhəng commit ilə atma — işi məntiqi, kiçik hissələrə bölüb ayrı-ayrı commit-lər et.** Hər commit tək bir tamamlanmış dəyişikliyi əhatə etsin (məs. əvvəl schema/migration, sonra API/endpoint, sonra UI komponenti, sonra testlər). Hər commit özlüyündə build/test-dən keçən vəziyyətdə olsun və mesajı ingiliscə, Conventional Commits formatında yazılsın (`feat:`, `fix:`, `chore:` və s.).
- PR **ingiliscə** yazılır, label-lar əlavə olunur, repo sahibinə assign edilir; CI keçəndən sonra merge.
- Hər EPIC üçün label: `epic:auth`, `epic:home`, `epic:admin` və s.
- Ətraflı: `git-workflow` skill.

## Skills — nə vaxt hansını oxu

| Skill                     | Nə vaxt istifadə et                                                                  |
| ------------------------- | ------------------------------------------------------------------------------------ |
| `design-system`           | Hər hansı UI komponenti/səhifə yazarkən — rənglər, qadağalar, tipoqrafiya, animasiya |
| `atmospheric-backgrounds` | Login, profil, search, 404, admin fon video/animasiyaları üzərində işləyərkən        |
| `consumet-data-fetching`  | Consumet API-dan data çəkərkən — RTK Query + Axios + Redis + SSR/ISR strategiyası    |
| `video-player-ads`        | Bölüm izləmə səhifəsi, video player, pre-roll reklam sistemi işlərində               |
| `admin-panel`             | Admin panel funksionallığı (reklam, video, bloq, istifadəçi idarəetməsi) yazarkən    |
| `i18n-localization`       | UI mətni əlavə edərkən / yeni səhifə yaradarkən (EN/TR/RU)                           |
| `seo-performance`         | Metadata, sitemap, Core Web Vitals, şəkil/video optimizasiyası işlərində             |
| `git-workflow`            | Hər işə başlayarkən, branch/PR açarkən, GitHub issue yaradarkən                      |
