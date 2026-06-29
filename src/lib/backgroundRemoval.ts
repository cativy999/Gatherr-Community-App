import { FilesetResolver, ImageSegmenter } from "@mediapipe/tasks-vision";

// Both of these are free, publicly hosted by Google — no API key, no per-image
// cost. The wasm runtime + model are cached by the browser after first load.
const WASM_BASE = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite";

let segmenterPromise: Promise<ImageSegmenter> | null = null;

function getSegmenter(): Promise<ImageSegmenter> {
  if (!segmenterPromise) {
    segmenterPromise = FilesetResolver.forVisionTasks(WASM_BASE).then((vision) =>
      ImageSegmenter.createFromOptions(vision, {
        baseOptions: { modelAssetPath: MODEL_URL },
        runningMode: "IMAGE",
        outputCategoryMask: true,
        outputConfidenceMasks: false,
      })
    );
  }
  return segmenterPromise;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = src;
  });
}

/**
 * Cuts a person out of a photo and returns a transparent-background PNG
 * (as a data URL). Runs entirely in the browser via MediaPipe's selfie
 * segmentation model — free, no server calls, no API key involved.
 */
export async function cutOutPerson(imageUrl: string): Promise<string> {
  const [segmenter, img] = await Promise.all([getSegmenter(), loadImage(imageUrl)]);

  const result = segmenter.segment(img);
  try {
    const mask = result.categoryMask;
    if (!mask) throw new Error("Segmentation produced no mask");

    const maskData = mask.getAsUint8Array();
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not supported");

    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // Selfie segmenter category mask: 0 = background, 1 = person.
    for (let i = 0; i < maskData.length; i++) {
      if (maskData[i] === 0) {
        imageData.data[i * 4 + 3] = 0;
      }
    }
    ctx.putImageData(imageData, 0, 0);

    return canvas.toDataURL("image/png");
  } finally {
    result.close();
  }
}
