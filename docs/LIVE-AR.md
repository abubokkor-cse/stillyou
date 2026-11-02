# Live wig overlay

This is a working, front-facing **2D AR overlay** from a saved YouCam hairstyle result. It is not a vendor-provided live hairstyle SDK, a 3D wig, or a stream of billed image-generation requests.

## Buyer flow

Create a normal wig photo preview, then choose **Try this wig live → Start live preview**. Face the camera and move gently. **See original** removes the overlay; alignment controls adjust the image without measuring a physical cap. Switching wigs, stopping, closing the panel or hiding the tab stops the camera. Start again when ready.

The [YouCam Hairstyle documentation](https://docs.perfectcorp.com/reference/ai_hairstyle) accepts a selfie and a `template_id` or `ref_file_id` / `ref_file_url`, creates a task at `/s2s/v2.1/task/hair-transfer`, and returns an image URL after polling. It does not document continuous camera-stream hairstyle rendering. The existing key already supports that first stage. We have not assumed this account has a separately licensed live wig SDK.

## Architecture

- `src/components/live-try-on.tsx`: explicit camera lifecycle, controls, frame loop and canvas composition.
- `public/live-ar/tracker.js`: classic Web Worker with pinned MediaPipe Tasks Vision 1.1.1. Classic loading supports its WebAssembly loader across both tasks without module import-cache side effects.
- Selfie Multiclass extracts a hair confidence mask from the selected saved result once. Only the hair layer is drawn; the generated portrait is not pasted over the camera face.
- Face Landmarker tracks eye/nose anchors. `src/lib/live-ar/geometry.ts` aligns position, scale and roll, smooths movement, and rejects small/turned faces. Pose rejection is a heuristic, not a validated quality assessment.
- One frame is in flight at a time, with an approximately 15 Hz request ceiling. The video canvas renders separately. Actual performance depends on the device.
- Missing/multiple faces or excessive pose changes hide the overlay. Poses older than 350 ms are not rendered. Stalled inference stops the session.

No audio is requested. Camera frames and landmarks are not uploaded or saved. The worker and models load from the app origin; there is no new backend endpoint or API secret. Closing/hiding the session stops tracks, terminates the worker and releases image bitmaps.

## Assets and deployment

`npm ci` runs `scripts/prepare-live-ar.mjs` to copy the pinned runtime and download fixed-version models with SHA-256 checks. Generated vendor/model directories are ignored. Install requires access to `storage.googleapis.com`; the browser subsequently uses this app's origin. If install scripts are disabled, run `npm run assets:live` before starting/building. Use HTTPS or localhost for camera access.

| Model | Version and SHA-256 |
| --- | --- |
| Face Landmarker | float16 / 1 · `64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff` |
| Selfie Multiclass | float32 / 1 · `c6748b1253a99067ef71f7e26ca71096cd449baefa8f101900ea23016507e0e0` |

Runtime: [MediaPipe Tasks Vision](https://www.npmjs.com/package/@mediapipe/tasks-vision), Apache-2.0. Official models and guidance: [Face Landmarker](https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker) and [Image Segmenter](https://ai.google.dev/edge/mediapipe/solutions/vision/image_segmenter). Preserve upstream licensing and provenance when redistributing.

## Verification

`npm run test:ar` requires installed Chrome, ffmpeg, the documented provider source photo, purple/red wig photos in `fixtures/private/commons-wigs/`, and recorded genuine API outputs in `artifacts/gates/2026-10-20T06-16-12-060Z/`. An alternate output directory can be passed to `node scripts/check-live-ar.mjs <directory>`.

The test creates and deletes its own local workspace. It uploads references through the real app routes and imports recorded YouCam results into that isolated fixture. It does not call the generation endpoint. The camera is a moving demonstration portrait with a blank interval, not a real moving person.

Passed using actual models: wig pixels follow the moving fixture; face loss/recovery; original toggle; alignment/reset; both styles load; switch/close stop camera tracks; mobile layout; camera-denial fallback; same-origin GET-only traffic with no frame uploads. Unit tests cover geometry, pose rejection and smoothing. Artifacts are in `artifacts/live-ar/`.

Visual inspection found incomplete bright-red hair extraction with the smaller Hair Segmenter model. The final Selfie Multiclass model retained the tested fringe and side sections. This small sample does not establish general segmentation accuracy.

## Limits

A single photo contains no rear/side geometry. Large turns, reliable hand/object occlusion, physical fit, comfort and exact shade are unsupported. Existing hair can show around the overlay. Physical webcam/mobile/Safari validation and intended-user feedback remain outstanding. Saved-photo review and sourced product facts remain necessary for purchase decisions.
