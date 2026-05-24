import { FileUp, Loader2, Trash2, UploadCloud, FileText, Image as ImageIcon, Eye } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { uploadWithProgress } from "@/lib/upload";

export interface FileSelectorProps {
  context: "image" | "document" | "payment-proof";
  value?: string | null;
  onChange: (url: string | null) => void;
  label?: string;
  maxSizeMb?: number;
  disabled?: boolean;
}

const ACCEPTED: Record<FileSelectorProps["context"], string> = {
  image: "image/jpeg,image/png,image/webp,image/gif,image/avif",
  document: "image/jpeg,image/png,image/webp,application/pdf",
  "payment-proof": "image/jpeg,image/png,image/webp,application/pdf",
};

const IMAGE_EXTENSIONS = /\.(jpg|jpeg|png|webp|gif|avif|svg)$/i;
const PDF_EXTENSION = /\.pdf$/i;

function isImageUrl(url: string): boolean {
  return IMAGE_EXTENSIONS.test(url);
}

function isPdfUrl(url: string): boolean {
  return PDF_EXTENSION.test(url);
}

function getFileName(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    return pathname.split("/").pop() ?? "file";
  } catch {
    return url.split("/").pop() ?? "file";
  }
}

export function FileSelector({
  context,
  value,
  onChange,
  label,
  maxSizeMb,
  disabled,
}: FileSelectorProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      const limitMb = maxSizeMb ?? (context === "document" ? 20 : context === "payment-proof" ? 10 : 8);
      if (file.size > limitMb * 1024 * 1024) {
        setError(`File must be under ${limitMb} MB`);
        return;
      }
      setUploading(true);
      setProgress(0);
      try {
        const result = await uploadWithProgress(context, file, (pct) => setProgress(pct));
        onChange(result.url);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed. Please try again.");
      } finally {
        setUploading(false);
        setProgress(0);
      }
    },
    [context, maxSizeMb, onChange],
  );

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    void handleFile(files[0]!);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (disabled || uploading) return;
    handleFiles(e.dataTransfer.files);
  }

  function handleRemove() {
    onChange(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  if (value) {
    return (
      <div className="space-y-2">
        {label && <label className="text-sm font-medium">{label}</label>}
        <div className="relative overflow-hidden rounded-xl border border-border bg-muted/30">
          {isPdfUrl(value) ? (
            <div className="flex items-center gap-3 p-4">
              <FileText className="h-8 w-8 text-red-500" />
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium">{getFileName(value)}</p>
                <p className="text-xs text-muted-foreground">PDF Document</p>
              </div>
              <a
                href={value}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md bg-background/90 p-2 text-muted-foreground hover:text-foreground"
              >
                <Eye className="h-4 w-4" />
              </a>
            </div>
          ) : isImageUrl(value) ? (
            <div className="aspect-video">
              <img src={value} alt={label ?? "Uploaded file"} className="h-full w-full object-cover" />
            </div>
          ) : (
            <div className="flex items-center gap-3 p-4">
              <ImageIcon className="h-8 w-8 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{getFileName(value)}</span>
            </div>
          )}
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
                onClick={handleRemove}
                className="rounded-md bg-destructive/90 p-1.5 text-white shadow-sm hover:bg-destructive"
                aria-label="Remove file"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED[context]}
          className="sr-only"
          disabled={disabled || uploading}
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>
    );
  }

  const dropzoneClass = [
    "flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-center transition-colors",
    dragOver
      ? "border-primary bg-primary/5"
      : "border-border bg-muted/30 hover:border-primary/40 hover:bg-muted/50",
    disabled ? "cursor-not-allowed opacity-60" : "",
  ].join(" ");

  return (
    <div className="space-y-2">
      {label && <label className="text-sm font-medium">{label}</label>}
      <div
        className={dropzoneClass}
        onClick={() => !disabled && !uploading && inputRef.current?.click()}
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
            <div className="h-1.5 w-40 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1.5 text-sm text-muted-foreground">
            <div className="rounded-full bg-muted p-2">
              {context === "payment-proof" ? (
                <FileUp className="h-5 w-5 text-muted-foreground" />
              ) : (
                <UploadCloud className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <span className="font-medium text-foreground">
              {context === "payment-proof"
                ? "Tap to attach screenshot or receipt"
                : "Click or drop a file to upload"}
            </span>
            <span className="text-xs">
              {context === "payment-proof"
                ? "JPG, PNG, or PDF · max 10 MB"
                : context === "document"
                  ? "JPG, PNG, or PDF · max 20 MB"
                  : "PNG, JPG, WebP · max 8 MB"}
            </span>
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED[context]}
        className="sr-only"
        disabled={disabled || uploading}
        onChange={(e) => handleFiles(e.target.files)}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
