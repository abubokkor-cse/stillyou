# Deploy StillYou on Vercel

Import this directory/repository as a **Next.js** project. Use the repository root, build command `npm run build`, default output settings, and Node.js 22 or 24.

## Storage

In Vercel's project Storage/Marketplace settings:

1. Connect a **Neon Postgres** database. The connection string must be named `DATABASE_URL`.
2. Create a **private Vercel Blob store**, with `BLOB_READ_WRITE_TOKEN` connected to the project. Do not use a public store for these photos.

## Environment variables

| Variable | Value |
| --- | --- |
| `YOUCAM_API_KEY` | Perfect Corp / YouCam Bearer API key |
| `DATABASE_URL` | Neon Postgres connection string |
| `BLOB_READ_WRITE_TOKEN` | Token for the private Blob store |
| `APP_ORIGIN` | Exact deployed origin, e.g. `https://stillyou.vercel.app`; no trailing slash |
| `CRON_SECRET` | Random secret of at least 32 bytes, for scheduled cleanup |
| `MAX_DAILY_PREVIEWS` | Optional; default `20` attempts per workspace per UTC day |
| `MAX_GLOBAL_DAILY_PREVIEWS` | Optional; default `100` attempts across the app per UTC day |

Keep every value server-side, with no `NEXT_PUBLIC_` prefix. The console's RSA public key is not used by these Bearer-authenticated endpoints.

Use separate database and Blob stores for Preview deployments that accept real photos. Set `APP_ORIGIN` to that Preview URL, or omit it to use the request origin. Do not assign the production custom domain to every Preview deployment.

## Initialize and deploy

On a fresh checkout, copy `.env.example` to `.env.local`. If the local file already contains your key, edit it instead of overwriting it. Configure the database URL, then run:

```sh
npm ci
npm run db:setup
npm run test
npm run lint
npm run build
```

`db:setup` safely creates the document table and does not delete data. Commit source and the lockfile, then deploy through Vercel. Secrets, local state, private fixtures and test artifacts are ignored by Git.

`vercel.json` schedules daily cleanup. Vercel sends `CRON_SECRET` as a Bearer token. Confirm the cron appears in project settings. The job deletes up to 100 expired workspaces per run; monitor/increase throughput before larger-scale use.

## Deployment smoke test

- Save a permitted photo in a fresh browser, refresh and confirm persistence.
- Open its media URL in an unauthenticated second browser: access must fail.
- Create one real preview and confirm its result/source date survive refresh.
- Share a shortlist, vote in the second browser, then revoke access.
- Delete the workspace and confirm its private Blob objects are removed.
- Verify function/cron logs without logging keys, image URLs or photo contents.

A local build does not verify provisioned storage, a custom domain or scheduled jobs. Those checks remain required on the actual deployment.

## Live camera assets

Normal `npm ci` runs `postinstall`, which copies the pinned MediaPipe runtime and downloads versioned, SHA-256-checked face and segmentation models. Allow build-time access to `storage.googleapis.com`; if scripts were disabled, run `npm run assets:live` before building. The browser fetches these assets from this app's origin, not a public CDN. No extra live-mode API secret is needed. Vercel HTTPS satisfies the camera secure-context requirement. Verify physical-device camera support on the deployed origin.
