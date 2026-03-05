"use client";

import { useRef, useState, useEffect, useCallback } from "react";

interface OTPInputProps {
  length?: number;
  onComplete: (code: string) => void;
  disabled?: boolean;
}

export default function OTPInput({
  length = 6,
  onComplete,
  disabled = false,
}: OTPInputProps) {
  const [values, setValues] = useState<string[]>(Array(length).fill(""));
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  const handleComplete = useCallback(
    (newValues: string[]) => {
      const code = newValues.join("");
      if (code.length === length) {
        onComplete(code);
      }
    },
    [length, onComplete]
  );

  const handleChange = (index: number, value: string) => {
    // Only allow digits
    const digit = value.replace(/\D/g, "").slice(-1);

    const newValues = [...values];
    newValues[index] = digit;
    setValues(newValues);

    // Auto-focus next input
    if (digit && index < length - 1) {
      inputs.current[index + 1]?.focus();
    }

    // Auto-submit when all digits entered
    if (digit && newValues.every((v) => v !== "")) {
      handleComplete(newValues);
    }
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Backspace") {
      if (!values[index] && index > 0) {
        // Move back on empty backspace
        const newValues = [...values];
        newValues[index - 1] = "";
        setValues(newValues);
        inputs.current[index - 1]?.focus();
      } else {
        const newValues = [...values];
        newValues[index] = "";
        setValues(newValues);
      }
    }

    if (e.key === "ArrowLeft" && index > 0) {
      inputs.current[index - 1]?.focus();
    }
    if (e.key === "ArrowRight" && index < length - 1) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);

    if (pasted.length > 0) {
      const newValues = Array(length).fill("");
      pasted.split("").forEach((char, i) => {
        if (i < length) newValues[i] = char;
      });
      setValues(newValues);

      // Focus the next empty input or the last one
      const nextEmpty = newValues.findIndex((v) => v === "");
      if (nextEmpty >= 0) {
        inputs.current[nextEmpty]?.focus();
      } else {
        inputs.current[length - 1]?.focus();
        handleComplete(newValues);
      }
    }
  };

  // Focus first input on mount
  useEffect(() => {
    if (!disabled) {
      inputs.current[0]?.focus();
    }
  }, [disabled]);

  return (
    <div className="flex gap-3 justify-center" onPaste={handlePaste}>
      {values.map((val, i) => (
        <input
          key={i}
          ref={(el) => {
            inputs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={1}
          value={val}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onFocus={(e) => e.target.select()}
          disabled={disabled}
          className={`w-12 h-14 text-center text-xl font-bold rounded-xl border-2 outline-none transition-all
            ${
              val
                ? "border-green-500 bg-green-50 dark:bg-green-900/20 text-gray-900 dark:text-white"
                : "border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
            }
            focus:border-green-500 focus:ring-2 focus:ring-green-500/20
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
        />
      ))}
    </div>
  );
}
