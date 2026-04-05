import { HttpAgent } from "@icp-sdk/core/agent";
import { loadConfig } from "../config";
import { StorageClient } from "./StorageClient";

/**
 * Uploads an image file to blob storage and returns a direct URL.
 * @param file - The image File to upload
 * @param onProgress - Optional progress callback (0-100)
 * @returns The direct URL of the uploaded image
 */
export async function uploadImageFile(
  file: File,
  onProgress?: (percentage: number) => void,
): Promise<string> {
  const config = await loadConfig();

  const agent = new HttpAgent({
    host: config.backend_host,
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
