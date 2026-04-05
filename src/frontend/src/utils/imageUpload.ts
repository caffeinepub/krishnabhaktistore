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
 * Throws an Error with a user-friendly message if validation fails.
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
 * Compresses an image file using canvas.
 * Resizes to max 1600px dimension and converts to WebP.
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
 *
 * Flow:
 *   1. Validate format + size
 *   2. Compress to WebP via canvas
 *   3. Create StorageClient instance with `new`
 *   4. Call storageClient.putFile(bytes, contentType, onProgress?)
 *   5. Return the direct URL via storageClient.getDirectURL(hash)
 *
 * @param file       The image File to upload
 * @param identity   Authenticated Internet Identity (required for upload)
 * @param onProgress Optional progress callback receiving 0-100
 * @returns          The direct URL of the uploaded image
 */
export async function uploadImageFile(
  file: File,
  identity: Identity,
  onProgress?: (percentage: number) => void,
): Promise<string> {
  // Step 1 — validate
  validateImageFile(file);

  // Step 2 — block anonymous
  if (identity.getPrincipal().isAnonymous()) {
    throw new Error(
      "You must be logged in as admin to upload images. Please authenticate with Internet Identity first.",
    );
  }

  console.log("[ImageUpload] Uploading:", file.name, file.type);

  // Step 3 — compress
  console.log("[ImageUpload] Compressing...");
  const compressedBlob = await compressImage(file);
  const compressedBytes = new Uint8Array(await compressedBlob.arrayBuffer());
  console.log(
    `[ImageUpload] Compressed to ${(compressedBytes.byteLength / 1024).toFixed(1)} KB (${OUTPUT_MIME})`,
  );

  // Step 4 — load config
  const config = await loadConfig();

  // Step 5 — create agent
  const agent = new HttpAgent({
    host: config.backend_host,
    identity,
  });
  if (config.backend_host?.includes("localhost")) {
    await agent.fetchRootKey().catch(console.error);
  }

  // Step 6 — instantiate StorageClient as a class (NEVER call as a plain function)
  // StorageClient constructor: (bucket, storageGatewayUrl, backendCanisterId, projectId, agent)
  const storageClient = new StorageClient(
    config.bucket_name, // bucket
    config.storage_gateway_url, // storageGatewayUrl
    config.backend_canister_id, // backendCanisterId
    config.project_id, // projectId
    agent, // HttpAgent
  );

  // Step 7 — upload: putFile(bytes, contentType, onProgress?)
  // Pass OUTPUT_MIME as the contentType so the blob is stored with "image/webp"
  console.log("[ImageUpload] Calling storageClient.putFile()...");
  let hash: string;
  try {
    const result = await storageClient.putFile(
      compressedBytes,
      OUTPUT_MIME,
      onProgress ?? undefined,
    );
    hash = result.hash;
  } catch (err) {
    console.error("[ImageUpload] putFile failed:", err);
    if (err instanceof Error) {
      console.error("[ImageUpload] Message:", err.message);
      console.error("[ImageUpload] Stack:", err.stack);
    }
    throw err;
  }

  // Step 8 — get direct URL
  const url = await storageClient.getDirectURL(hash);
  console.log("[ImageUpload] Upload successful. URL:", url);
  return url;
}
