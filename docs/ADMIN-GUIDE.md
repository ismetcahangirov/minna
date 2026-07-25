# Admin panel guide

The admin panel lets platform administrators manage ads, atmospheric background
videos, blog posts, and users. It lives under `/admin` and is available only to
signed-in users whose account has the `admin` role.

For the underlying architecture (RBAC, data model, actions) see
[`ARCHITECTURE.md`](ARCHITECTURE.md).

## Access

- Sign in with Google, then open [`/admin`](/admin).
- Access is role-gated in three layers (edge proxy → server layout → every
  action). A signed-out visitor is sent to the login page; a signed-in
  non-admin is redirected to the home page.
- **Granting admin:** the `role` column on the `users` table controls this.
  Roles are `user` (default) and `admin`. There is no self-service promotion —
  an existing admin or a direct database update sets `role = 'admin'`. The new
  role takes effect on the user's next sign-in (it is cached on the session
  token).

## Dashboard

`/admin` shows headline counts — total **users**, **blogs**, and **ads** — and
links into each module. If the database is unreachable the counts degrade to
zero rather than breaking the panel.

## Modules

### Ads (`/admin/ads`)

Pre-roll video ads shown over the player before an episode starts. The watch
page reads only the active pool.

- **List:** all ads with their status; toggle **active** inline, edit, or
  delete.
- **Create / edit** (`/admin/ads/new`, `/admin/ads/[id]/edit`):

  | Field              | Meaning                                                                 |
  | ------------------ | ----------------------------------------------------------------------- |
  | `title`            | Internal label for the ad.                                              |
  | `videoUrl`         | The ad video source.                                                    |
  | `targetUrl`        | Optional click-through destination when the viewer taps the ad.         |
  | `durationSeconds`  | Optional cap before auto-advancing to the episode. Empty = play to end. |
  | `skipAfterSeconds` | Seconds before the **Skip ad** button unlocks (default 5).              |
  | `weight`           | Bias for random selection when several ads are active (higher = more).  |
  | `active`           | Whether the ad is in the live rotation.                                 |

### Background videos (`/admin/backgrounds`)

Atmospheric background loops behind the login, profile, search, 404, and admin
pages. Each page ships a **built-in default in code**; the database only stores
admin overrides.

- Each `(page, variant)` slot holds at most one override. Variants are
  `desktop` (default), `mobile`, and `tablet`; the profile page is authored per
  breakpoint, other pages use `desktop`.
- Choose a video file in the admin panel, then upload it. Direct URLs are not
  accepted. Files larger than 10 MB are rejected before upload.
- The server sends the file to Cloudinary as a signed upload, requests an
  animated WebP derivative, and stores only that WebP URL. Public pages render
  the converted WebP asset.
- Set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and
  `CLOUDINARY_API_SECRET` in `.env.local`. Optionally set
  `CLOUDINARY_BACKGROUND_FOLDER` to control the source asset folder.
- Activate / deactivate an existing override, or clear it to fall back to the
  built-in default. The default can never be destroyed.

### Blogs (`/admin/blogs`)

Editorial posts shown on the public Blogs page and blog detail pages. The public
pages only read **published** posts.

- **List:** all posts; toggle **published** inline, edit, or delete.
- **Create / edit** (`/admin/blogs/new`, `/admin/blogs/[id]/edit`):

  | Field        | Meaning                                                     |
  | ------------ | ----------------------------------------------------------- |
  | `title`      | Post title.                                                 |
  | `slug`       | Unique URL segment (`/blogs/[slug]`). Must be unique.       |
  | `excerpt`    | Short summary on the listing card (optional).               |
  | `content`    | Full post body.                                             |
  | `coverImage` | Full-bleed background image for the detail page (optional). |
  | `author`     | Author name (optional).                                     |
  | `published`  | Whether the post is publicly visible.                       |

  Ordering on the public listing is newest-first by publish date, which an
  editor can backdate.

### Users (`/admin/users`)

The user directory, newest first.

- **Block / unblock:** a blocked user cannot open a new session — the Google
  sign-in flow rejects them — while their data (favorites, watch history) is
  preserved. Blocking does not delete anything.
- **Delete:** permanently removes the user. Their favorites and watch progress
  cascade-delete with the account. This cannot be undone.

## Notes & safety

- **Every** admin action re-checks the admin role on the server, so nothing here
  can be triggered by a non-admin even via crafted requests.
- Destructive actions (deleting ads, blogs, or users) are immediate and not
  reversible — prefer **deactivate / unpublish / block** when you only want to
  hide something.
- Background defaults are safe: clearing an override always restores the
  built-in loop.
