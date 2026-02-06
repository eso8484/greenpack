import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { CartProvider } from "@/context/CartContext";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import Toaster from "@/components/ui/Toaster";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "GreenPack - Discover Local Shops & Services",
  description:
    "Connect with local shops and service providers near you. Browse, discover, and reach out to trusted businesses.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider>
          <CartProvider>
            <Header />
            <main className="min-h-screen bg-white dark:bg-gray-900">
              {children}
            </main>
            <Footer />
            <Toaster />
          </CartProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
