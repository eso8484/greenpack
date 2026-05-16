"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { BLUR_PLACEHOLDER } from "@/lib/utils";

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  folder?: string;
  className?: string;
}

const MAX_SIZE_MB = 5;
const UPLOAD_TIMEOUT_MS = 60_000;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

async function uploadFile(file: File, folder: string): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", folder);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
      credentials: "include",
      signal: controller.signal,
    });
  } catch (err) {
    if ((err as Error)?.name === "AbortError") {
      throw new Error("Upload timed out after 60s. Check your connection and try a smaller image.");
    }
    throw new Error("Network error during upload. Check your connection.");
  } finally {
    clearTimeout(timer);
  }

  let payload: { success?: boolean; url?: string; error?: string } = {};
  try {
    payload = await response.json();
  } catch {
    throw new Error(`Upload failed (HTTP ${response.status})`);
  }
  if (!response.ok || !payload.success || !payload.url) {
    throw new Error(payload.error || `Upload failed (HTTP ${response.status})`);
  }
  return payload.url;
}

export default function ImageUpload({
  value,
  onChange,
  label,
  folder = "misc",
  className = "",
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setError(null);

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Only JPEG, PNG, WebP, or GIF images are allowed");
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`Image must be under ${MAX_SIZE_MB} MB`);
      return;
    }

    setUploading(true);
    try {
      const url = await uploadFile(file, folder);
      onChange(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}

      <div className="flex items-start gap-4">
        {value ? (
          <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 shrink-0">
            <Image
              src={value}
              alt="Preview"
              fill
              className="object-cover"
              unoptimized
              placeholder="blur"
              blurDataURL={BLUR_PLACEHOLDER}
            />
          </div>
        ) : (
          <div className="w-24 h-24 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center shrink-0 bg-gray-50 dark:bg-gray-800">
            {uploading ? (
              <div className="flex flex-col items-center gap-1">
                <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-[10px] text-green-600">Uploading</span>
              </div>
            ) : (
              <svg className="w-8 h-8 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            )}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <input
            ref={inputRef}
            type="file"
            accept={ALLOWED_TYPES.join(",")}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="text-sm font-medium text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 disabled:opacity-50 cursor-pointer"
          >
            {uploading ? "Uploading..." : value ? "Change Image" : "Upload Image"}
          </button>
          {value && !uploading && (
            <>
              {" · "}
              <button
                type="button"
                onClick={() => onChange("")}
                className="text-sm text-gray-400 hover:text-red-500 cursor-pointer"
              >
                Remove
              </button>
            </>
          )}
          <p className="text-xs text-gray-400 mt-1">
            JPEG, PNG, WebP or GIF · Max {MAX_SIZE_MB} MB
          </p>
          {error && (
            <p className="text-xs text-red-500 mt-1 break-words">{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}
