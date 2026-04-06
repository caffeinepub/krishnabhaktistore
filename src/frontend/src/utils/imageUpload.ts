import { HttpAgent, type Identity } from "@icp-sdk/core/agent";
import { loadConfig } from "../config";
import { StorageClient } from "./StorageClient";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB
const COMPRESS_MAX_DIMENSION = 1600;
const COMPRESS_QUALITY = 0.82;
const OUTPUT_MIME = "image/webp";

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

export async function uploadImageFile(
  file: File,
  identity: Identity,
  onProgress?: (percentage: number) => void,
): Promise<string> {
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

  console.log("[ImageUpload] Compressing...");
  const compressedBlob = await compressImage(file);
  const compressedBytes = new Uint8Array(await compressedBlob.arrayBuffer());
  console.log(
    `[ImageUpload] Compressed: ${(compressedBytes.byteLength / 1024).toFixed(1)} KB (${OUTPUT_MIME})`,
  );

  const config = await loadConfig();
  console.log(
    "[ImageUpload] Config loaded. Bucket:",
    config.bucket_name,
    "Gateway:",
    config.storage_gateway_url,
  );

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

  console.log("[ImageUpload] Calling storageClient.putFile()...");
  let hash: string;
  try {
    // putFile signature: putFile(blobBytes, contentType?, onProgress?)
    const result = await storageClient.putFile(compressedBytes, onProgress);
    hash = result.hash;
    console.log("[ImageUpload] putFile succeeded. Hash:", hash);
  } catch (err) {
    console.error("[ImageUpload] putFile failed:", err);
    if (err instanceof Error) {
      console.error("[ImageUpload] Error message:", err.message);
    }
    throw err;
  }

  const url = await storageClient.getDirectURL(hash);
  console.log("[ImageUpload] Upload complete. URL:", url);
  return url;
}
