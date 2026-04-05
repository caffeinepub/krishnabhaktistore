import { HttpAgent, type Identity } from "@icp-sdk/core/agent";
import { loadConfig } from "../config";
import { StorageClient } from "./StorageClient";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB
const COMPRESS_MAX_DIMENSION = 1600;
const COMPRESS_QUALITY = 0.82;
const OUTPUT_MIME = "image/webp";

/**
 * Validates an image file for type and size constraints.
 */
export function validateImageFile(file: File): void {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error("Only JPG, PNG, and WebP images are allowed.");
  }
  if (file.size > MAX_SIZE_BYTES) {
    throw new Error(
      `Image must be smaller than 2 MB (current: ${(file.size / 1024 / 1024).toFixed(1)} MB).`,
    );
  }
}

/**
 * Compresses an image file using a canvas element.
 * Resizes to max dimension and converts to WebP.
 */
async function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

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

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Canvas compression produced an empty blob"));
            return;
          }
          resolve(blob);
        },
        OUTPUT_MIME,
        COMPRESS_QUALITY,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to load image for compression"));
    };

    img.src = objectUrl;
  });
}

/**
 * Uploads an image file to blob storage and returns a direct URL.
 * Validates format/size, compresses the image, then uploads via StorageClient.
 *
 * IMPORTANT: putFile(bytes, onProgress?) — contentType is set inside StorageClient
 * via the Blob constructor. We do NOT pass OUTPUT_MIME as a separate argument.
 *
 * @param file - The image File to upload
 * @param identity - Authenticated Internet Identity (required for upload permissions)
 * @param onProgress - Optional progress callback (0-100)
 * @returns The direct URL of the uploaded image
 */
export async function uploadImageFile(
  file: File,
  identity: Identity,
  onProgress?: (percentage: number) => void,
): Promise<string> {
  // Validate before uploading
  validateImageFile(file);

  console.log(
    "[ImageUpload] Starting upload for:",
    file.name,
    "(",
    file.type,
    ")",
  );

  // Compress the image
  console.log("[ImageUpload] Compressing image...");
  const compressedBlob = await compressImage(file);
  const compressedBytes = new Uint8Array(await compressedBlob.arrayBuffer());
  console.log(
    `[ImageUpload] Compressed: ${(compressedBytes.byteLength / 1024).toFixed(1)} KB, MIME: ${OUTPUT_MIME}`,
  );

  const config = await loadConfig();
  console.log("[ImageUpload] Config loaded:", {
    backend_host: config.backend_host,
    backend_canister_id: config.backend_canister_id,
    project_id: config.project_id,
    storage_gateway_url: config.storage_gateway_url,
    bucket_name: config.bucket_name,
  });

  // Block anonymous identities
  if (identity.getPrincipal().isAnonymous()) {
    const err = new Error(
      "You must be logged in as admin to upload images. Please authenticate with Internet Identity first.",
    );
    console.error("[ImageUpload] Blocked: anonymous identity.", err.message);
    throw err;
  }

  console.log("[ImageUpload] Principal:", identity.getPrincipal().toText());

  const agent = new HttpAgent({
    host: config.backend_host,
    identity,
  });

  if (config.backend_host?.includes("localhost")) {
    await agent.fetchRootKey().catch(console.error);
  }

  const storageClient = new StorageClient(
    config.bucket_name,
    config.storage_gateway_url,
    config.backend_canister_id,
    config.project_id,
    agent,
  );

  console.log("[ImageUpload] StorageClient created. Calling putFile...");

  try {
    // CORRECT CALL: putFile(bytes, onProgress?) — two args only
    const { hash } = await storageClient.putFile(
      compressedBytes,
      onProgress ?? undefined,
    );
    const url = await storageClient.getDirectURL(hash);
    console.log("[ImageUpload] Upload successful. URL:", url);
    return url;
  } catch (err: unknown) {
    // Log the full raw error so we can see exactly what the server returned
    console.error("[ImageUpload] Upload FAILED. Raw error object:", err);
    if (err instanceof Error) {
      console.error("[ImageUpload] Error message:", err.message);
      console.error("[ImageUpload] Error stack:", err.stack);
    }
    throw err;
  }
}
