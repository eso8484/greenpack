import type { ReactNode } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Become a Courier - GreenPack",
  description:
    "Apply to join the GreenPack courier network. Earn on your own schedule delivering for local businesses.",
};

export default function CourierRegisterLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <>{children}</>;
}
