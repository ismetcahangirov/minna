# Contributing to Minna

Thanks for contributing! This guide covers the branch, commit and pull-request
workflow, plus the local checks that must pass before your work is merged.

## Prerequisites

- **Node.js `>= 22`** and npm
- A working local setup — see the [README](README.md#getting-started)
- The [GitHub CLI](https://cli.github.com/) (`gh`) is handy for issues and PRs

Install dependencies once; this also wires up the Husky git hooks:

```bash
npm install
```

## Ground rules

These are enforced project-wide (see `CLAUDE.md`):

1. **Research current docs before writing code** — deprecated APIs are not
   accepted. This repo tracks a bleeding-edge Next.js; read the guides under
   `node_modules/next/dist/docs/` before touching framework code.
2. **Don't break existing functionality** — check for regressions after every
   change.
3. **SEO and performance matter** — SSR/ISR, metadata, lazy loading, Redis
   caching where relevant.
4. **Everything is responsive** — mobile, tablet and desktop; no component may
   disappear on mobile.
5. **No emoji in the product** — SVG icons only (`lucide-react`).
6. **Respect the design rules** — no glassmorphism, no gradients on UI
   surfaces, no rounded corners. Black background, Netflix-red accent. See
   `DESIGN-SPEC.md`.
7. **i18n** — every user-facing string gets a key in all three catalogs
   (`messages/en.json`, `messages/tr.json`, `messages/ru.json`).

## Workflow

### 1. Sync and branch

Always start from an up-to-date `main`, and create one branch per task.

```bash
git checkout main
git pull origin main
git checkout -b <type>/<short-description>
```

Branch prefixes (conventional):

| Prefix      | Use for                        |
| ----------- | ------------------------------ |
| `feature/`  | New functionality              |
| `fix/`      | Bug fixes                      |
| `chore/`    | Tooling, config, housekeeping  |
| `docs/`     | Documentation only             |
| `refactor/` | Behaviour-preserving refactors |

### 2. Commit in small, logical steps

**Do not squeeze a whole task into one giant commit.** Split the work into
logical, self-contained commits — e.g. schema/migration first, then the
API/endpoint, then the UI component, then tests. Each commit should build and
pass on its own.

Commit messages follow **[Conventional Commits](https://www.conventionalcommits.org/)**
and are validated by `commitlint` on the `commit-msg` hook:

```
<type>(optional-scope): short imperative summary

Optional body explaining the what/why.
```

Allowed types include `feat`, `fix`, `chore`, `docs`, `refactor`, `perf`,
`test`, `build`, `ci`, `style`, `revert`.

Examples:

```
feat(watch): pre-roll ad skip countdown
fix(auth): reject blocked users in signIn callback
docs: professional README (DOCS-01)
```

Include the issue code from `PROJECT-ISSUES.md` where it applies (e.g.
`(DOCS-02)`), and reference the issue in the body or PR with `Closes #<n>`.

### 3. Pre-commit hooks

Husky + lint-staged run automatically on `git commit`:

- **`*.{js,jsx,ts,tsx,mjs,cjs}`** → `eslint --fix` then `prettier --write`
- **`*.{json,css,md}`** → `prettier --write`

Only staged files are touched, so avoid running `prettier --write .` across the
whole tree — it causes unrelated line-ending churn.

### 4. Local checks before pushing

Run the same checks the reviewer will:

```bash
npm run lint          # ESLint
npm run format:check  # Prettier (no writes)
npm run build         # Production build must succeed
```

If you changed the database schema, generate and commit the migration:

```bash
npm run db:generate
```

These same checks run in CI (GitHub Actions) on every pull request and push to
`main` — format check, lint, tests (when present) and a production build. A
green run is required before merging; see
[`.github/workflows/ci.yml`](.github/workflows/ci.yml).

### 5. Open a pull request

Push your branch and open a PR:

```bash
git push -u origin <branch>
gh pr create --base main --assignee ismetcahangirov
```

PR requirements:

- **Written in English** — title and description.
- **Conventional-commit style title** (e.g. `feat: …`, `docs: …`).
- **Labels** — add the relevant domain label (`docs`, `auth`, `admin`,
  `home`, …).
- **Assigned** to the repository owner.
- **Description** explains what changed and why, and links the issue
  (`Closes #<n>`).
- All local checks pass. Merge only once review is complete.

### 6. Merge

PRs are **squash-merged** into `main`, and the branch is deleted after merge:

```bash
gh pr merge <n> --squash --delete-branch
```

## Coding conventions

- **TypeScript** everywhere; prefer explicit, well-named types (see
  `src/types/` and the Drizzle inferred types in `src/db/schema.ts`).
- **Server logic** lives in `src/lib/**` (queries, `actions.ts` server
  actions); route handlers in `src/app/api/**` stay thin.
- **State/data fetching** on the client goes through RTK Query
  (`src/store/api/**`) — never call Consumet from the browser.
- **ESLint gotchas** enforced as hard errors in this repo:
  - No `setState` inside an effect — use the render-phase adjust-state pattern.
  - No ref writes during render (`react-hooks/refs`) — sync refs in an effect.
- Keep new code consistent with the file it lives in (naming, comment density,
  idioms).

## Questions

Open an issue or start a discussion. See `PROJECT-ISSUES.md` for the epic /
sub-issue structure and `docs/ARCHITECTURE.md` for how the system fits
together.
