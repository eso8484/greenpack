import Link from "next/link";

// /admin used to redirect straight to the courier queue, which worked while
// couriers were the only thing to review. With more than one queue it would
// quietly make the others unreachable — the redirect would swallow anyone who
// typed /admin, and nothing on the courier page would point at them. A chooser
// page is the smallest thing that keeps every queue one click from the door, and
// it gives the admin section a home to grow into.
//
// A Server Component with no data fetching on purpose: the queues fetch their
// own rows client-side, so this page cannot be stale and cannot fail.

const QUEUES = [
  {
    href: "/admin/vendors",
    icon: "workspace_premium",
    title: "Elite applications",
    description:
      "Shops asking for homepage placement. Approving sets the Elite Partner flag on the shop — it is never sold, and a declined shop keeps every listing it has.",
  },
  {
    href: "/admin/couriers",
    icon: "local_shipping",
    title: "Courier applications",
    description:
      "People applying to run deliveries. Approving flips their account to the courier role and they can take jobs immediately.",
  },
  {
    href: "/admin/outreach",
    icon: "mail",
    title: "Image outreach",
    description:
      "Email vendors whose shops are missing images, so they can finish and go live.",
  },
];

export default function AdminIndexPage() {
  return (
    <div className="min-h-screen bg-[#f9fafb] dark:bg-gray-900 pb-16">
      <div className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                Admin
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Review queues for what is granted, and outreach for what is missing
              </p>
            </div>
            <Link
              href="/admin/support"
              className="text-sm text-green-600 dark:text-green-400 hover:underline"
            >
              Support Console →
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 grid gap-3 sm:grid-cols-2">
        {QUEUES.map((queue) => (
          <Link
            key={queue.href}
            href={queue.href}
            className="flex flex-col gap-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 hover:border-green-300 dark:hover:border-green-700 transition-colors"
          >
            <span className="w-10 h-10 rounded-full bg-green-50 dark:bg-green-900/30 flex items-center justify-center">
              <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-[22px]">
                {queue.icon}
              </span>
            </span>
            <span className="text-base font-semibold text-gray-900 dark:text-white">
              {queue.title}
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {queue.description}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
