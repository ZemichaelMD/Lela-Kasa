import { ImagePlus, Loader2, Trash2, UploadCloud, X } from "lucide-react";
import { useCallback, useId, useRef, useState } from "react";
import { sdk } from "@/lib/sdk";

export interface ImageUploadProps {
  /** Current image URL (controlled). Empty string when unset. */
  value: string;
  /** Called when the user uploads a new image or clears the field. */
  onChange: (url: string) => void;
  /** Aspect ratio class for the preview frame — defaults to 16/9 (video). */
  aspect?: "square" | "video" | "wide";
  /** Short helper text under the dropzone. */
  hint?: string;
  /** Disable interaction (e.g. while saving). */
  disabled?: boolean;
  /** Optional label / placeholder text. */
  label?: string;
}

const ASPECT_CLASS: Record<NonNullable<ImageUploadProps["aspect"]>, string> = {
  square: "aspect-square",
  video: "aspect-video",
  wide: "aspect-[3/1]",
};

/**
 * Reusable image picker for the admin app — controlled by the parent, uploads
 * via `sdk.media.upload` (which respects the active backend storage driver).
 */
export function ImageUpload({
  value,
  onChange,
  aspect = "video",
  hint,
  disabled,
  label,
}: ImageUploadProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const startUpload = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        setError("Please choose an image file.");
        return;
      }
      if (file.size > 8 * 1024 * 1024) {
        setError("Image is too large — max 8 MB.");
        return;
      }
      setError(null);
      setProgress(0);
      setUploading(true);
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const result = await sdk.media.upload(file, {
          signal: controller.signal,
          onProgress: (frac) => setProgress(Math.round(frac * 100)),
        });
        onChange(result.url);
      } catch (err) {
        if (err instanceof Error && err.name !== "AbortError") {
          setError(err.message || "Upload failed. Please try again.");
        }
      } finally {
        setUploading(false);
        abortRef.current = null;
        setProgress(0);
      }
    },
    [onChange],
  );

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    void startUpload(files[0]!);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (disabled || uploading) return;
    handleFiles(e.dataTransfer.files);
  }

  function handleClear() {
    if (abortRef.current) abortRef.current.abort();
    onChange("");
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  const dropzoneClass = [
    "group relative flex w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed text-center transition-colors",
    ASPECT_CLASS[aspect],
    dragOver
      ? "border-primary bg-primary/5"
      : "border-border bg-muted/30 hover:border-primary/40 hover:bg-muted/50",
    disabled ? "cursor-not-allowed opacity-60" : "",
  ].join(" ");

  return (
    <div className="space-y-2">
      {value ? (
        <div
          className={`relative overflow-hidden rounded-xl border border-border bg-muted/30 ${ASPECT_CLASS[aspect]}`}
        >
          <img
            src={value}
            alt={label ?? "Uploaded image"}
            className="h-full w-full object-cover"
          />
          {!disabled && (
            <div className="absolute right-2 top-2 flex gap-1">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="rounded-md bg-background/90 px-2 py-1 text-xs font-medium text-foreground shadow-sm hover:bg-background"
              >
                Replace
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="rounded-md bg-destructive/90 p-1.5 text-white shadow-sm hover:bg-destructive"
                aria-label="Remove image"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      ) : (
        <label
          htmlFor={inputId}
          className={dropzoneClass}
          onDragOver={(e) => {
            e.preventDefault();
            if (!disabled && !uploading) setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span>Uploading… {progress}%</span>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  abortRef.current?.abort();
                }}
                className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" /> Cancel
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
              <UploadCloud className="h-6 w-6 text-muted-foreground/70" />
              <span className="font-medium text-foreground">
                {label ?? "Click or drop an image to upload"}
              </span>
              <span className="text-xs">PNG, JPG, WebP up to 8&nbsp;MB</span>
            </div>
          )}
        </label>
      )}

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept="image/*"
        className="sr-only"
        disabled={disabled || uploading}
        onChange={(e) => handleFiles(e.target.files)}
      />

      {hint && !error && (
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <ImagePlus className="h-3 w-3" /> {hint}
        </p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
