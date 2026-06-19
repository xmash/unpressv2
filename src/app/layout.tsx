import type { Metadata } from "next";
import { Inter, Sora } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
  weight: ["600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Unpress — your website, set free",
  description:
    "Drop in your old WordPress .wpress backup and get your content and photos back — instantly, in your browser. Your file never leaves your computer.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${sora.variable}`}>
      <body>
        <div className="banner">
          🚀 <strong>Unpress</strong> — recover any dead WordPress backup, free. Your file never
          leaves your browser.
        </div>
        <header className="brandbar">
          <Link href="/" className="wordmark">
            un<span className="dot">press</span>
          </Link>
          <nav>
            <Link href="/how-it-works">How it works</Link>
            <Link href="/pricing">Pricing</Link>
          </nav>
        </header>

        {children}

        <footer className="site-footer">
          <div className="inner">
            <span>© {new Date().getFullYear()} Unpress — your website, set free.</span>
            <span>
              <Link href="/">Recover</Link>
              <Link href="/how-it-works">How it works</Link>
              <Link href="/pricing">Pricing</Link>
            </span>
          </div>
        </footer>
      </body>
    </html>
  );
}
