importScripts("./vendor/vision_bundle.js");
const { FaceLandmarker, FilesetResolver, ImageSegmenter } = Vision;

let detector;
let segmenter;
let queue = Promise.resolve();
const anchors = (face) => ({ left: face[33], right: face[263], nose: face[1] });

async function initialize() {
  if (detector) return;
  const files = await FilesetResolver.forVisionTasks(
    new URL("./vendor/wasm/", self.location.href).href,
  );
  detector = await FaceLandmarker.createFromOptions(files, {
    baseOptions: {
      modelAssetPath: new URL(
        "./models/face_landmarker.task",
        self.location.href,
      ).href,
      delegate: "CPU",
    },
    runningMode: "IMAGE",
    numFaces: 2,
    minFaceDetectionConfidence: 0.65,
    minTrackingConfidence: 0.6,
  });
  segmenter = await ImageSegmenter.createFromOptions(files, {
    baseOptions: {
      modelAssetPath: new URL(
        "./models/selfie_multiclass.tflite",
        self.location.href,
      ).href,
      delegate: "CPU",
    },
    runningMode: "IMAGE",
    outputCategoryMask: false,
    outputConfidenceMasks: true,
  });
}

async function prepare(message) {
  const bitmap = message.bitmap;
  try {
    await initialize();
    await detector.setOptions({ runningMode: "IMAGE" });
    const result = detector.detect(bitmap);
    if (result.faceLandmarks.length !== 1)
      throw new Error("Choose a preview with one clear, front-facing face.");
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const context = canvas.getContext("2d");
    context.drawImage(bitmap, 0, 0);
    const pixels = context.getImageData(0, 0, bitmap.width, bitmap.height);
    let visible = 0;
    segmenter.segment(bitmap, (segmented) => {
      const mask = segmented.confidenceMasks?.[1];
      if (!mask)
        throw new Error(
          "The hair layer could not be separated from this preview.",
        );
      const confidence = mask.getAsFloat32Array();
      for (let y = 0; y < bitmap.height; y++) {
        for (let x = 0; x < bitmap.width; x++) {
          const sample =
            confidence[
              Math.min(
                mask.height - 1,
                Math.floor((y * mask.height) / bitmap.height),
              ) *
                mask.width +
                Math.min(
                  mask.width - 1,
                  Math.floor((x * mask.width) / bitmap.width),
                )
            ];
          const alpha = Math.max(0, Math.min(1, (sample - 0.35) / 0.45));
          pixels.data[(y * bitmap.width + x) * 4 + 3] = Math.round(alpha * 255);
          if (alpha > 0.5) visible++;
        }
      }
    });
    if (visible < bitmap.width * bitmap.height * 0.015)
      throw new Error(
        "There is not enough clear hair in this preview for a live overlay.",
      );
    context.putImageData(pixels, 0, 0);
    const overlay = canvas.transferToImageBitmap();
    await detector.setOptions({ runningMode: "VIDEO" });
    self.postMessage(
      {
        type: "prepared",
        id: message.id,
        overlay,
        anchors: anchors(result.faceLandmarks[0]),
        width: bitmap.width,
        height: bitmap.height,
      },
      [overlay],
    );
  } finally {
    bitmap.close();
  }
}

async function handle(message) {
  if (message.type === "prepare") return prepare(message);
  if (message.type === "frame") {
    try {
      const result = detector.detectForVideo(message.bitmap, message.timestamp);
      self.postMessage({
        type: "tracked",
        id: message.id,
        count: result.faceLandmarks.length,
        anchors:
          result.faceLandmarks.length === 1
            ? anchors(result.faceLandmarks[0])
            : null,
      });
    } finally {
      message.bitmap.close();
    }
  }
}

self.onmessage = ({ data }) => {
  queue = queue
    .then(() => handle(data))
    .catch((error) => {
      const detail = error instanceof Error ? error.message : "";
      const message =
        /^(Choose a preview|The hair layer|There is not enough)/.test(detail)
          ? detail
          : "Live tracking could not start. Try again in the latest Chrome, or use the saved photo preview.";
      self.postMessage({ type: "error", id: data.id, message });
    });
};
