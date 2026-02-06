"use client";

import { Toaster as Sonner } from "sonner";

export default function Toaster() {
  return (
    <Sonner
      position="top-right"
      toastOptions={{
        classNames: {
          toast:
            "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg",
          title: "text-gray-900 dark:text-gray-100",
          description: "text-gray-500 dark:text-gray-400",
          actionButton: "bg-green-500 text-white",
          cancelButton: "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100",
          closeButton: "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400",
        },
      }}
      richColors
    />
  );
}
