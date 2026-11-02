# Testing notes

## Automated

- `npm run test`: 32 unit tests covering the YouCam client (response shapes, missing fields, no retries on billed
  calls, allowed media hosts), persistence and concurrent writes, share expiry, image normalisation and metadata
  removal, decision rules (stale picks, budget, currency), and live-mode geometry.
- `npm run test:live`: Playwright drives the real UI and backend end to end: upload, one real hairstyle preview,
  review, shortlist, product facts, decision, purchase card, family link and vote, then checks that a shared link can't
  reach the original photo, that cross-origin writes are rejected, that revoking works and that deleting the workspace
  removes its media.
- `npm run test:ar`: live mode against a simulated moving camera: tracking, face loss and recovery, original toggle,
  alignment, camera cleanup, and no frame uploads.

## What we found with the API

Tested with YouCam's sample portraits and a set of wig photos in October 2026.

- **Custom references work.** Sample hairstyles and photos of wigs on mannequins with painted faces all generated.
  Broad colour and silhouette carried over well; in two of five mannequin tests the cut came out noticeably different
  (shorter fringe, an extra long side section). This is why every preview is shown next to its reference.
- **Product photos on faceless display heads fail.** All five retail wig photos we tried returned `error_no_face`.
  The upload dialog now asks for a reference with a visible face, and the error message explains that either photo can
  cause it.
- **Short hair still works.** A buzz-cut source photo generated a bob, so we don't rely on `error_hair_too_short`.
- **Facial Color Tones** succeeded, but neither test response included the hair colour fields, so the app shows
  "unavailable" instead of guessing.
- **Hat VTO** worked but also changed framing, clothes and some face detail, so it's labelled experimental.

## Not done yet

- Testing on physical phones and Safari for live mode.
- Feedback from people actually preparing for treatment.
- Exact retail-wig fidelity with face-visible product photos.
