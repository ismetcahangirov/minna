---
name: git-workflow
description: Use when hər hansı tapşırığa başlayarkən, branch açarkən, commit/push edərkən, PR yaradarkən və ya PROJECT-ISSUES.md əsasında GitHub epic/issue/sub-issue yaradarkən.
---

# Git / GitHub Workflow

## Əsas Prinsip

Hər tapşırıq: `main` pull → ayrıca branch → iş → push → ingiliscə PR (label + assign) → CI keçir → merge.

## İşə Başlama

```
git checkout main
git pull origin main
git checkout -b feature/<qisa-tesvir>
```

Branch prefiksləri: `feature/`, `fix/`, `chore/`, `docs/` (conventional branch naming).

## PR Qaydaları

1. PR başlığı və təsviri **ingiliscə** yazılır.
2. Müvafiq label-lar əlavə olunur — o cümlədən epic label-ı: `epic:auth`, `epic:home`, `epic:admin` və s.
3. PR repo sahibinə **assign** edilir.
4. CI (test + lint + build) keçmədən merge OLUNMUR.
5. PR body sonunda: `🤖 Generated with [Claude Code](https://claude.com/claude-code)`

## GitHub Issue Yaratma (PROJECT-ISSUES.md əsasında)

- Hər **EPIC** ayrıca issue kimi yaradılır (`gh issue create`), label-lar: `epic` + spesifik label-lar (PROJECT-ISSUES.md-dəki **Labels** sətrinə bax).
- Hər **sub-issue** həmin epic-ə bağlanır — GitHub native sub-issue mövcuddursa onunla, yoxdursa epic body-də checklist + issue-da epic referansı ilə.
- Issue başlıqlarında kod saxlanılır: `SETUP-01`, `AUTH-02`, `PLAYER-03` və s.
- Mövcud olmayan label əvvəlcə yaradılır: `gh label create`.

## Commit Konvensiyası

- Conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:` (SETUP-07 — Husky/lint-staged bunu enforce edir).
- Commit mesajı sonunda: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`

## Tez-tez edilən səhvlər

| Səhv | Düzəliş |
|---|---|
| `main`-ə birbaşa commit | Həmişə ayrıca branch |
| Pull etmədən köhnə main üzərində branch açmaq | Əvvəl `git pull origin main` |
| PR-ı azərbaycanca yazmaq | PR ingiliscə olmalıdır |
| Label/assign olmadan PR açmaq | Label + epic label + assign məcburidir |
