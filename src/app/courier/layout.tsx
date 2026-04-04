import type { ReactNode } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Courier Dashboard - GreenPack",
};

export default function CourierLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
