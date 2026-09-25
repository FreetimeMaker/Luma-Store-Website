import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import PwaRegistration from "./components/PwaRegistration";
import ScrollHeader from "./components/ScrollHeader";

export const metadata: Metadata = {
  title: {
    default: "Luma Store",
    template: "%s | Luma Store",
  },
  description: "Discover Android apps and manage app submissions with Luma Store.",
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="liquid-shell min-h-full text-slate-100">
        <PwaRegistration />
        <ScrollHeader />
        <main className="liquid-main mx-auto max-w-[90rem] px-4 py-6 sm:px-6">{children}</main>
        <footer className="liquid-footer border-t px-4 py-8 sm:px-6">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-center text-xs text-slate-400 sm:flex-row sm:text-left">
            <p>© 2026 Freetime Maker</p>
            <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2" aria-label="Footer navigation">
              <Link href="/" className="transition hover:text-white">Home</Link>
              <Link href="/" className="transition hover:text-white">Apps</Link>
              <Link href="/login?next=/dashboard" className="transition hover:text-white">Developers</Link>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
