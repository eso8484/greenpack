"use client";

interface PasswordStrengthProps {
  password: string;
}

interface StrengthResult {
  score: number;       // 0-4
  label: string;
  color: string;
  bgColor: string;
  checks: { label: string; passed: boolean }[];
}

function evaluateStrength(password: string): StrengthResult {
  const checks = [
    { label: "At least 8 characters", passed: password.length >= 8 },
    { label: "Uppercase letter (A-Z)", passed: /[A-Z]/.test(password) },
    { label: "Lowercase letter (a-z)", passed: /[a-z]/.test(password) },
    { label: "Number (0-9)", passed: /[0-9]/.test(password) },
    { label: "Special character (!@#$...)", passed: /[^A-Za-z0-9]/.test(password) },
  ];

  const passed = checks.filter((c) => c.passed).length;

  const levels: Omit<StrengthResult, "checks">[] = [
    { score: 0, label: "Too weak", color: "text-red-500", bgColor: "bg-red-500" },
    { score: 1, label: "Weak", color: "text-red-400", bgColor: "bg-red-400" },
    { score: 2, label: "Fair", color: "text-yellow-500", bgColor: "bg-yellow-500" },
    { score: 3, label: "Good", color: "text-blue-500", bgColor: "bg-blue-500" },
    { score: 4, label: "Strong", color: "text-green-500", bgColor: "bg-green-500" },
  ];

  const level = levels[Math.min(passed, 4)];
  return { ...level, checks };
}

export default function PasswordStrength({ password }: PasswordStrengthProps) {
  if (!password) return null;

  const strength = evaluateStrength(password);

  return (
    <div className="mt-2 space-y-2">
      {/* Strength bars */}
      <div className="flex gap-1.5">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
              i <= strength.score - 1
                ? strength.bgColor
                : "bg-gray-200 dark:bg-gray-700"
            }`}
          />
        ))}
      </div>

      {/* Label */}
      <div className="flex items-center justify-between">
        <span className={`text-xs font-semibold ${strength.color}`}>
          {strength.label}
        </span>
      </div>

      {/* Checklist */}
      <div className="space-y-1">
        {strength.checks.map((check) => (
          <div key={check.label} className="flex items-center gap-2">
            {check.passed ? (
              <svg className="w-3.5 h-3.5 text-green-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 100-12 6 6 0 000 12z" clipRule="evenodd" />
              </svg>
            )}
            <span
              className={`text-xs ${
                check.passed
                  ? "text-green-600 dark:text-green-400"
                  : "text-gray-400 dark:text-gray-500"
              }`}
            >
              {check.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Returns true if password meets minimum requirements (score >= 2 and length >= 8) */
export function isPasswordStrong(password: string): boolean {
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password)
  );
}
