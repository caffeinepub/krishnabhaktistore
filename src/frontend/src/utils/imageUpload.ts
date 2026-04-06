import { HttpAgent, type Identity } from "@icp-sdk/core/agent";
import { loadConfig } from "../config";
import { StorageClient } from "./StorageClient";

// Accept any image/* type so mobile camera uploads (HEIC, etc.) are not rejected
const ALLOWED_TYPE_PREFIX = "image/";
// Hard cap BEFORE compression — 20 MB. After compression we target ≤1 MB.
const MAX_RAW_SIZE_BYTES = 20 * 1024 * 1024;
// Target output size — 1 MB
const TARGET_SIZE_BYTES = 1 * 1024 * 1024;
const COMPRESS_MAX_DIMENSION = 1200;
const OUTPUT_MIME = "image/webp";

// Validate only the file type (not size — raw mobile photos can be large).
export function validateImageFile(file: File): void {
  // Accept any image/* MIME type (handles HEIC, HEIF, JPEG, PNG, WEBP, etc.)
  if (!file.type.startsWith(ALLOWED_TYPE_PREFIX) && file.type !== "") {
    throw new Error(
      "Only image files are allowed (JPG, PNG, WebP, HEIC, etc.).",
    );
  }
  if (file.size > MAX_RAW_SIZE_BYTES) {
    throw new Error(
      `Image is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum allowed is 20 MB.`,
    );
  }
}

/**
 * Compress an image to WebP, targeting ≤ TARGET_SIZE_BYTES.
 * It tries decreasing quality levels until the output is small enough.
 */
async function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = async () => {
      URL.revokeObjectURL(objectUrl);

      // Scale down to max dimension
      let { width, height } = img;
      if (width > COMPRESS_MAX_DIMENSION || height > COMPRESS_MAX_DIMENSION) {
        if (width >= height) {
          height = Math.round((height * COMPRESS_MAX_DIMENSION) / width);
          width = COMPRESS_MAX_DIMENSION;
        } else {
          width = Math.round((width * COMPRESS_MAX_DIMENSION) / height);
          height = COMPRESS_MAX_DIMENSION;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Failed to get canvas 2D context"));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);

      // Try progressively lower quality until we're under the target size
      const qualities = [0.85, 0.75, 0.65, 0.55, 0.45, 0.35];
      for (const quality of qualities) {
        const blob = await new Promise<Blob | null>((res) =>
          canvas.toBlob(res, OUTPUT_MIME, quality),
        );
        if (!blob) {
          reject(new Error("Canvas compression produced an empty blob"));
          return;
        }
        console.log(
          `[ImageUpload] Compressed at quality ${quality}: ${(blob.size / 1024).toFixed(1)} KB`,
        );
        if (blob.size <= TARGET_SIZE_BYTES) {
          resolve(blob);
          return;
        }
        // If even the lowest quality is still too big, use it anyway
        if (quality === qualities[qualities.length - 1]) {
          console.warn(
            `[ImageUpload] Could not compress below 1 MB; using smallest result: ${(blob.size / 1024).toFixed(1)} KB`,
          );
          resolve(blob);
          return;
        }
      }

      reject(new Error("Compression loop ended unexpectedly"));
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to load image for compression"));
    };

    img.src = objectUrl;
  });
}

export async function uploadImageFile(
  file: File,
  identity: Identity,
  onProgress?: (percentage: number) => void,
): Promise<string> {
  // Step 1: Validate type (not size — compression handles size)
  validateImageFile(file);

  if (identity.getPrincipal().isAnonymous()) {
    throw new Error(
      "You must be logged in as admin to upload images. Please authenticate with Internet Identity first.",
    );
  }

  console.log(
    "[ImageUpload] Starting upload:",
    file.name,
    file.type,
    `${(file.size / 1024).toFixed(1)} KB`,
  );

  // Step 2: Compress to WebP targeting ≤ 1 MB
  console.log("[ImageUpload] Compressing...");
  const compressedBlob = await compressImage(file);
  const compressedBytes = new Uint8Array(await compressedBlob.arrayBuffer());
  console.log(
    `[ImageUpload] Final compressed size: ${(compressedBytes.byteLength / 1024).toFixed(1)} KB (${OUTPUT_MIME})`,
  );

  // Step 3: Load config
  const config = await loadConfig();
  console.log(
    "[ImageUpload] Config loaded. Bucket:",
    config.bucket_name,
    "Gateway:",
    config.storage_gateway_url,
  );

  // Step 4: Create agent with the admin identity
  const agent = new HttpAgent({
    host: config.backend_host,
    identity,
  });
  if (config.backend_host?.includes("localhost")) {
    await agent.fetchRootKey().catch(console.error);
  }

  // Step 5: Create StorageClient
  const storageClient = new StorageClient(
    config.bucket_name,
    config.storage_gateway_url,
    config.backend_canister_id,
    config.project_id,
    agent,
  );

  // Step 6: Upload via putFile(blobBytes, contentType, onProgress)
  console.log("[ImageUpload] Calling storageClient.putFile()...");
  let hash: string;
  try {
    const result = await storageClient.putFile(
      compressedBytes,
      OUTPUT_MIME,
      onProgress,
    );
    hash = result.hash;
    console.log("[ImageUpload] putFile succeeded. Hash:", hash);
  } catch (err) {
    console.error("[ImageUpload] putFile failed:", err);
    throw err;
  }

  // Step 7: Get the direct URL
  const url = await storageClient.getDirectURL(hash);
  console.log("[ImageUpload] Upload complete. URL:", url);
  return url;
}
