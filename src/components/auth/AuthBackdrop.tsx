/**
 * Decorative, non-interactive backdrop for auth pages — subtle green glow +
 * a warm accent bloom + faint grid, matching the homepage hero. Purely visual;
 * sits behind the centered auth card.
 */
export default function AuthBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-grid-faint opacity-[0.15] dark:opacity-[0.07]" />
      <div className="absolute -top-24 -left-24 w-[30rem] h-[30rem] rounded-full bg-green-500/15 blur-3xl animate-float-slow" />
      <div className="absolute -bottom-28 -right-24 w-[26rem] h-[26rem] rounded-full bg-accent-500/10 blur-3xl animate-float" />
    </div>
  );
}
