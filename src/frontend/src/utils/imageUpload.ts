import { HttpAgent, type Identity } from "@icp-sdk/core/agent";
import { loadConfig } from "../config";
import { StorageClient } from "./StorageClient";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB
const COMPRESS_MAX_DIMENSION = 1600; // max width/height after compression
const COMPRESS_QUALITY = 0.82; // WebP quality
const OUTPUT_MIME = "image/webp"; // compressed output format

/**
 * Validates an image file for type and size constraints.
 * Throws an error with a user-friendly message if validation fails.
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
 * Returns a Blob of the compressed image.
 */
async function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;

      // Resize if either dimension exceeds the max
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
 * Validates format/size, compresses the image, then uploads with correct Content-Type.
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

  // Compress the image to reduce size and normalise format
  console.log("[ImageUpload] Compressing image...");
  const compressedBlob = await compressImage(file);
  const compressedBytes = new Uint8Array(await compressedBlob.arrayBuffer());
  console.log(
    `[ImageUpload] Compressed size: ${(compressedBytes.byteLength / 1024).toFixed(1)} KB, MIME: ${OUTPUT_MIME}`,
  );

  const config = await loadConfig();

  // Check that we have a real (non-anonymous) identity before attempting upload
  if (identity.getPrincipal().isAnonymous()) {
    const err = new Error(
      "You must be logged in as admin to upload images. Please authenticate with Internet Identity first.",
    );
    console.error("[ImageUpload] Blocked: anonymous identity.", err.message);
    throw err;
  }

  // Use the authenticated identity so the backend canister accepts the certificate request
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

  console.log(
    "[ImageUpload] Uploading to storage with Content-Type:",
    OUTPUT_MIME,
  );

  try {
    // Pass OUTPUT_MIME as the contentType (2nd param) and onProgress as the 3rd param
    const { hash } = await storageClient.putFile(
      compressedBytes,
      OUTPUT_MIME,
      onProgress ?? undefined,
    );
    const url = await storageClient.getDirectURL(hash);
    console.log("[ImageUpload] Upload successful. URL:", url);
    return url;
  } catch (err) {
    console.error("[ImageUpload] Upload failed:", err);
    throw err;
  }
}
