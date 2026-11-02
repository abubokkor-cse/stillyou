# StillYou architecture

One Next.js application deploys as one Vercel project. Pages and React components are the frontend. Route handlers are the backend. There is no separate Express service, long-running worker or browser API key.

```text
src/
  app/
    page.tsx                    Landing page
    studio/page.tsx             Private workspace
    share/[token]/page.tsx      Scoped family shortlist
    about/page.tsx              Privacy and preview limits
    api/
      workspace/               Session, notes, deletion
      photos/                  Consented baseline uploads
      choices/                 Wig and hat reference uploads
      previews/                Start generation jobs
      previews/[id]/           Poll and save completed results
      media/[id]/              Owner-only image delivery
      share/                   Create and revoke family links
      share/[token]/           Read shared choices and vote
      share/[token]/media/[id]/ Scoped preview image delivery
      cron/cleanup/            Expired-workspace cleanup
  components/
    studio.tsx                 Workspace state and dialogs
    studio/                    Reference, explore, shortlist, results
    photo-form.tsx             Upload, mobile capture, permission
    purchase-card.tsx          Seller notes and printable checklist
    shared-shortlist.tsx       Family voting
    portrait.tsx               Original, labelled illustrations
  lib/
    types.ts                   Shared domain contracts
    browser.ts                 Client requests, photo preparation
    youcam.ts                  Typed provider requests and responses
  server/
    workspace.ts               Sessions, quotas, workspace lifecycle
    store.ts                   Versioned document persistence
    media.ts                   Private media, image normalization
    sharing.ts                 Share authorization
    response.ts                Validation and safe error responses
scripts/                       Setup, sample download, live checks
tests/                         Provider, persistence and media tests
docs/                          Architecture, deployment, test findings
```

## Photo and preview lifecycle

1. A random 256-bit token goes into an HttpOnly, SameSite cookie. Its SHA-256 digest identifies the database workspace.
2. The browser resizes selected images to at most 1024 pixels. The server decodes them, validates dimensions and converts them to JPEG without original metadata.
3. Saving confirms photo permission and private storage. Vercel Blob holds the image with **private** access. The browser receives an internal media ID, not a storage URL.
4. Each preview requires processing consent. The route validates ownership, reserves a quota attempt and creates a pending record before uploading source/reference bytes to YouCam. Generation POSTs are never automatically retried.
5. The provider returns a task ID. Subsequent polling requests are short, separate route calls. No request waits for the entire generation job.
6. Completed output is copied to application storage before the provider URL expires. It keeps the original source ID and date; originals are never overwritten.
7. Errors remain errors. Missing hair-colour fields become an unavailable result, with no invented measurement.

## Persistence

Development uses `.stillyou/documents` and `.stillyou/media`. File writes are atomic and serialized per document. This adapter is for single-machine development only.

Production requires a Neon-compatible `DATABASE_URL` and private Vercel Blob store. The document table stores workspace state, share pointers, votes and quota counters. Optimistic version checks retry conflicts so concurrent votes do not replace each other. Runtime requests never create the schema.

Production builds can complete before storage is configured. Requests requiring missing production storage fail; they never silently use Vercel's temporary filesystem.

## Sharing and deletion

Sharing snapshots up to six preview IDs. The link exposes only those generated images and choice names. Original/reference images, source dates and private policy notes remain inaccessible. Every image request checks the current token and expiry. Revocation stops subsequent requests, but cannot recall downloaded copies.

Voting is one current choice per browser cookie, not verified one-person-one-vote. It supports informal family feedback, not a public contest.

Workspaces expire after 30 days; shares after at most seven. Deletion first expires the workspace to reject new writes, then removes media, share pointers, votes and the workspace document. A daily Vercel cron cleans up to 100 expired workspaces per run; expired workspace access also triggers deletion. Provider copies follow its retention terms. Monitor cleanup backlog before scaling beyond this prototype.

## Boundaries

- Client input cannot select the API origin or an arbitrary remote image URL. Product links are stored as HTTPS links, never fetched by the server.
- Provider media URLs must use approved HTTPS provider/storage hosts. Only the API origin receives the Bearer key.
- Mutations enforce the application origin. Private state and media are not publicly cached.
- Quotas count attempts, including some failed/contending requests. They are application budgets, not exact YouCam unit measurements. A global limit still applies if visitors create fresh workspaces.
- There is no LLM, diagnosis or stored treatment timeline.

Test coverage and API findings are in [TESTING.md](TESTING.md).

## Purchase decision layer

`src/lib/decision.ts` computes remaining questions from preferences, review, product facts and checklists. It never ranks wigs. `src/server/decision.ts` validates updates and invalidates stale checks/reviews/choices. The authenticated, same-origin `PATCH /api/decision` persists changes atomically. The browser receives only the public workspace projection.

`ShoppingPlan`, `PreviewReview`, `ProductNotes` and `DecisionBoard` compose the studio; `PurchaseCard` reuses the same questions for a printable decision. Private reasons and product notes never enter the family projection. No new service or deployment is needed.

## Live overlay

Successful wig previews open a local camera overlay. Hair extraction and face tracking run in a classic MediaPipe worker; the UI owns camera lifecycle and canvas composition. Versioned assets are prepared at install and served from this app. No new server endpoint, provider secret or camera-frame storage was added. See [LIVE-AR.md](LIVE-AR.md).
