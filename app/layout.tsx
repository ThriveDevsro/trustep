import type { Metadata, Viewport } from "next";
import "./globals.css";
import AppChrome from "@/components/AppChrome";
import { LanguageProvider } from "@/components/LanguageProvider";

export const metadata: Metadata = {
  title: "FEELSODD — Verify before you trust",
  description:
    "FEELSODD verifies who is behind suspicious digital communication and whether it is safe to act.",
};

export const viewport: Viewport = {
  themeColor: "#020617",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="sk">
      <body className="bg-white text-slate-900 antialiased">
        <LanguageProvider>
          <AppChrome>{children}</AppChrome>
        </LanguageProvider>
      </body>
    </html>
  );
}
