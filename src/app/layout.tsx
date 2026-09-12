import type { Metadata } from "next";
import { headers } from "next/headers";
import { Inter } from "next/font/google";
import "./globals.css";
import AppChrome from "@/components/layout/AppChrome";
import { CartProvider } from "@/context/CartContext";
import { AuthProvider } from "@/context/AuthContext";
import { WishlistProvider } from "@/context/WishlistContext";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import Toaster from "@/components/ui/Toaster";
import InactivityWatch from "@/components/auth/InactivityWatch";
import { isVendorHost } from "@/lib/hosts";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "GreenPack - Discover Local Shops & Services",
  description:
    "Connect with local shops and service providers near you. Browse, discover, and reach out to trusted businesses.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Which host are we rendering for? The vendor centre and the storefront are
  // the same deployment, and the storefront Header must not appear on vendor
  // pages — but a client-side hostname check would flash it before hydration, so
  // the host is resolved here on the server and handed to AppChrome as a prop.
  //
  // This costs nothing: the app is already fully dynamic (db.ts reaches
  // supabase/server.ts, which awaits cookies()), so reading headers() adds no
  // rendering-mode change.
  const onVendorHost = isVendorHost((await headers()).get("host"));

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          rel="preload"
          href="/fonts/material-symbols-outlined.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider>
          <AuthProvider>
            <WishlistProvider>
              <CartProvider>
                <AppChrome onVendorHost={onVendorHost}>{children}</AppChrome>
                <Toaster />
                <InactivityWatch />
              </CartProvider>
            </WishlistProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
