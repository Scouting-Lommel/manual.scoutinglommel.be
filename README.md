# manual.scoutinglommel.be

Dutch, non-technical manual for the people who edit the Scouting Lommel website — published as its own docs site at **https://manual.scoutinglommel.be**.

The manual explains how the CMS (Strapi) behind [scoutinglommel.be](https://www.scoutinglommel.be) works: logging in, editing pages and blocks, managing media, navigation, settings, and what to avoid. It is written for volunteers, not developers, and is deliberately excluded from search engines (`noindex`).

## What's in this repo

- **Astro Starlight docs app** at the repo root — the manual itself. Dutch (`lang: nl`), sidebar + search + dark mode + print. Deploys automatically to Vercel on every push to `main`.
- **`scripts/capture-manual.ts`** — a Playwright capture script that regenerates the annotated screenshots used in the manual. It logs into the production Strapi admin (`admin.scoutinglommel.be`) and captures the production frontend (`https://www.scoutinglommel.be`), drawing SVG annotations (arrows, callouts, highlight rings) onto each screenshot before saving it to `public/captures/`.
- **`public/captures/`** — the committed, annotated screenshot PNGs referenced by the manual pages.

## Capture script

Run via `npx tsx`:

```sh
npx tsx scripts/capture-manual.ts <mode> [--check-readonly]
```

| Mode | What it does | Credentials needed |
| --- | --- | --- |
| `--admin` | Captures annotated screenshots of the Strapi admin (login, content manager, page edit, media library, settings, navigation) | `STRAPI_ADMIN_EMAIL` + `STRAPI_ADMIN_PASSWORD` |
| `--frontend` | Captures annotated screenshots of the public site (home, takken, wie-is-wie, handleidingen, verhuur, contact, inschrijven) | none |
| `--all` | Both of the above | admin credentials |
| `--help` | Prints usage and exits 0 | none |
| `--check-readonly` | Flag combined with a mode: reads `homePage.updatedAt` via the public GraphQL endpoint before and after capture and asserts it is unchanged — proof the script never mutates the CMS | `NEXT_PUBLIC_APP_BACKEND_URL` |

The script is strictly read-only: its interaction allowlist only permits navigate, hover, and type-without-submit. It never clicks Save/Publish/Delete/Create/Upload, and it never captures the Member collection (PII).

### Environment

Copy `.env.example` to `.env` and fill in the values:

```sh
# CMS MANUAL CAPTURE
NEXT_PUBLIC_APP_BACKEND_URL=
STRAPI_ADMIN_EMAIL=
STRAPI_ADMIN_PASSWORD=
# optional: sent with the --check-readonly GraphQL read when present
# (the production GraphQL endpoint forbids anonymous reads)
STRAPI_API_TOKEN=
```

- `STRAPI_ADMIN_EMAIL` / `STRAPI_ADMIN_PASSWORD` — required only for `--admin` / `--all`.
- `NEXT_PUBLIC_APP_BACKEND_URL` — required only for `--check-readonly`.
- `STRAPI_API_TOKEN` — optional; the production GraphQL endpoint forbids anonymous reads, so the read-only check needs a token when run against production.

Missing variables fail fast with a clear message naming them; the script never prints secret values.

### Refreshing the captures

```sh
# frontend only (no credentials needed)
npx tsx scripts/capture-manual.ts --frontend --check-readonly

# admin + frontend (needs .env with admin credentials)
npx tsx scripts/capture-manual.ts --all --check-readonly
```

Each run prints a manifest (path + size per PNG) and the `updatedAt pre == post` read-only assertion. Commit the regenerated PNGs under `public/captures/`; the manual pages pick them up automatically (they reference `/captures/<id>.png`).

## Development

```sh
pnpm install
pnpm run dev        # local dev server
pnpm run build      # production build (Starlight)
pnpm run preview    # preview the production build
```

Type-check the capture script (scoped — the root `tsc` is blocked by an upstream dependency conflict):

```sh
npx tsc -p tsconfig.scripts.json --noEmit
```

## Live site

The manual is published at **https://manual.scoutinglommel.be** (Vercel project on the Scouting Lommel team, Cloudflare CNAME, auto-deploy on `main` pushes). It is public but excluded from search engines — no login wall, no sensitive data in the screenshots.