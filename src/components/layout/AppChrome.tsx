"use client";

import { usePathname } from "next/navigation";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

const STANDALONE_PREFIXES = ["/seller", "/admin/support"];

export default function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "";
  const isStandalone = STANDALONE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (isStandalone) {
    return <>{children}</>;
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#f6f8f7] dark:bg-gray-900">{children}</main>
      <Footer />
    </>
  );
}
