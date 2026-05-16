"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { BLUR_PLACEHOLDER } from "@/lib/utils";

interface ImageGalleryUploadProps {
  value: string[];
  onChange: (urls: string[]) => void;
  label?: string;
  folder?: string;
  maxImages?: number;
  className?: string;
}

const MAX_SIZE_MB = 5;
const UPLOAD_TIMEOUT_MS = 60_000;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

async function uploadOne(file: File, folder: string): Promise<string> {
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
      throw new Error("timed out after 60s");
    }
    throw new Error("network error");
  } finally {
    clearTimeout(timer);
  }

  let payload: { success?: boolean; url?: string; error?: string } = {};
  try {
    payload = await response.json();
  } catch {
    throw new Error(`server returned HTTP ${response.status}`);
  }
  if (!response.ok || !payload.success || !payload.url) {
    throw new Error(payload.error || `HTTP ${response.status}`);
  }
  return payload.url;
}

export default function ImageGalleryUpload({
  value,
  onChange,
  label,
  folder = "gallery",
  maxImages = 8,
  className = "",
}: ImageGalleryUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);

  const remainingSlots = Math.max(0, maxImages - value.length);

  const handleFiles = async (files: FileList) => {
    setErrors([]);
    const items = Array.from(files).slice(0, remainingSlots);
    if (items.length === 0) return;

    const newErrors: string[] = [];
    const uploaded: string[] = [];

    setUploadingCount(items.length);
    await Promise.all(
      items.map(async (file) => {
        if (!ALLOWED_TYPES.includes(file.type)) {
          newErrors.push(`${file.name}: unsupported type`);
          return;
        }
        if (file.size > MAX_SIZE_MB * 1024 * 1024) {
          newErrors.push(`${file.name}: over ${MAX_SIZE_MB} MB`);
          return;
        }
        try {
          const url = await uploadOne(file, folder);
          uploaded.push(url);
        } catch (err) {
          newErrors.push(
            `${file.name}: ${err instanceof Error ? err.message : "upload failed"}`
          );
        }
      })
    );
    setUploadingCount(0);
    if (newErrors.length) setErrors(newErrors);
    if (uploaded.length) onChange([...value, ...uploaded]);
  };

  const removeAt = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const moveLeft = (index: number) => {
    if (index === 0) return;
    const next = [...value];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    onChange(next);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {label}
          </label>
          <span className="text-xs text-gray-400">
            {value.length}/{maxImages}
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {value.map((url, i) => (
          <div
            key={url + i}
            className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 group bg-gray-50 dark:bg-gray-800"
          >
            <Image
              src={url}
              alt={`Image ${i + 1}`}
              fill
              className="object-cover"
              unoptimized
              placeholder="blur"
              blurDataURL={BLUR_PLACEHOLDER}
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-end justify-between p-1.5 opacity-0 group-hover:opacity-100">
              <button
                type="button"
                onClick={() => moveLeft(i)}
                disabled={i === 0}
                className="bg-white/90 text-gray-700 text-xs px-1.5 py-0.5 rounded shadow disabled:opacity-30 cursor-pointer"
                title="Move left"
              >
                ←
              </button>
              <button
                type="button"
                onClick={() => removeAt(i)}
                className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded shadow cursor-pointer"
              >
                Remove
              </button>
            </div>
            {i === 0 && (
              <span className="absolute top-1 left-1 bg-green-600 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded">
                Main
              </span>
            )}
          </div>
        ))}

        {Array.from({ length: uploadingCount }).map((_, i) => (
          <div
            key={`uploading-${i}`}
            className="aspect-square rounded-lg border-2 border-dashed border-green-400 dark:border-green-700 flex flex-col items-center justify-center gap-2 bg-green-50 dark:bg-green-900/20"
          >
            <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-medium text-green-600 dark:text-green-400">
              Uploading...
            </span>
          </div>
        ))}

        {remainingSlots > 0 && uploadingCount === 0 && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="aspect-square rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex flex-col items-center justify-center gap-1 hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/10 transition-colors cursor-pointer"
          >
            <svg
              className="w-7 h-7 text-gray-300 dark:text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
            <span className="text-xs text-gray-500 dark:text-gray-400">Add image</span>
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_TYPES.join(",")}
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) handleFiles(e.target.files);
          e.target.value = "";
        }}
      />

      <p className="text-xs text-gray-400">
        JPEG, PNG, WebP or GIF · Max {MAX_SIZE_MB} MB each · Up to {maxImages} images · First image is the main thumbnail
      </p>
      {errors.length > 0 && (
        <ul className="text-xs text-red-500 space-y-0.5 break-words">
          {errors.map((e, i) => (
            <li key={i}>• {e}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
