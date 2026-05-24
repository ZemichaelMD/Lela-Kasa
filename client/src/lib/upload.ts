import { tokenStore, API_URL } from "@/lib/sdk";

export function uploadWithProgress(
  context: string,
  file: File,
  onProgress: (pct: number) => void,
): Promise<{ url: string; key: string; size: number; mimeType: string; driver: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const form = new FormData();
    form.append("file", file);

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const envelope = JSON.parse(xhr.responseText);
        resolve(envelope.data);
      } else {
        try {
          const err = JSON.parse(xhr.responseText);
          reject(new Error(err?.error?.message ?? "Upload failed"));
        } catch {
          reject(new Error("Upload failed"));
        }
      }
    });

    xhr.addEventListener("error", () => reject(new Error("Network error during upload")));
    xhr.addEventListener("abort", () => reject(new Error("Upload cancelled")));

    xhr.open("POST", `${API_URL}/api/v1/media/upload?context=${encodeURIComponent(context)}`);
    xhr.setRequestHeader("Authorization", `Bearer ${tokenStore.getAccessToken()}`);
    xhr.send(form);
  });
}
