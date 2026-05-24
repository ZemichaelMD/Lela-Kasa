import { PATHS } from "@/contract";

import { ApiError } from "../error";
import type { SdkClient } from "../client";

export interface UploadResult {
  url: string;
  key: string;
  size: number;
  mimeType: string;
  driver: "local" | "s3" | "r2" | "vercel_blob";
}

export interface MediaUploadOptions {
  signal?: AbortSignal;
  onProgress?: (fraction: number) => void;
}

/**
 * Multipart uploads can't go through `SdkClient.post` (which JSON-encodes the
 * body), so this resource fires its own XHR and re-uses the shared token
 * accessor for auth + the global ApiError class for errors.
 */
export class MediaResource {
  constructor(
    private readonly _client: SdkClient,
    private readonly baseUrl: string,
    private readonly getAccessToken: () => Promise<string | null> | string | null,
  ) {}

  async upload(file: File, options: MediaUploadOptions = {}): Promise<UploadResult> {
    const form = new FormData();
    form.append("file", file, file.name);
    const url = `${this.baseUrl}${PATHS.media.upload}`;
    const token = await this.getAccessToken();

    return new Promise<UploadResult>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", url);
      if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      if (options.signal) {
        options.signal.addEventListener("abort", () => xhr.abort(), { once: true });
      }
      if (options.onProgress) {
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) options.onProgress?.(e.loaded / e.total);
        };
      }
      xhr.onload = () => {
        const ok = xhr.status >= 200 && xhr.status < 300;
        let body: unknown = null;
        try {
          body = xhr.responseText ? JSON.parse(xhr.responseText) : null;
        } catch {
          /* leave null */
        }
        if (!ok) {
          const error = body as { error?: { code?: string; message?: string; requestId?: string } } | null;
          reject(
            new ApiError(
              error?.error?.code ?? "UPLOAD_FAILED",
              error?.error?.message ?? `Upload failed (HTTP ${xhr.status})`,
              xhr.status,
              undefined,
              error?.error?.requestId,
            ),
          );
          return;
        }
        const envelope = body as { data?: UploadResult } | null;
        resolve((envelope?.data ?? body) as UploadResult);
      };
      xhr.onerror = () => reject(new ApiError("NETWORK_ERROR", "Network error", 0));
      xhr.onabort = () => reject(new ApiError("ABORTED", "Upload aborted", 0));
      xhr.send(form);
    });
  }
}
