import { HttpAgent, type Identity } from "@icp-sdk/core/agent";
import { loadConfig } from "../config";
import { StorageClient } from "./StorageClient";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB

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
 * Uploads an image file to blob storage and returns a direct URL.
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

  const config = await loadConfig();

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

  const bytes = new Uint8Array(await file.arrayBuffer());
  const { hash } = await storageClient.putFile(bytes, onProgress);
  const url = await storageClient.getDirectURL(hash);
  return url;
}
