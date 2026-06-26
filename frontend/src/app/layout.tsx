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
    "Drop in your old WordPress .wpress backup and get your content and photos back — instantly. Every page, post, image and more, recovered.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${sora.variable}`}>
      <body>
        <div className="banner">
          🚀 <strong>Unpress</strong> — recover any dead WordPress backup, free.
        </div>
        <header className="brandbar">
          <Link href="/" className="wordmark" aria-label="Unpress home">
            <span className="wm-badge" aria-hidden="true">
              <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 3.2 19 11.4h-4v5.1H9v-5.1H5z" />
                <rect x="6" y="19.2" width="12" height="2.4" rx="1.2" />
              </svg>
            </span>
            <span className="wm-text">
              un<span className="wm-mid">·</span>press
            </span>
          </Link>
          <nav>
            <a href="/#how">How it works</a>
            <a href="/#formats">Formats</a>
            <a href="/#pricing">Pricing</a>
            <a href="/#faq">FAQ</a>
            <a href="/#recover" className="navcta">Recover a site</a>
          </nav>
        </header>

        {children}

        <footer className="site-footer">
          <div className="inner">
            <span>© {new Date().getFullYear()} Unpress — your website, set free.</span>
            <span>
              <a href="/#recover">Recover</a>
              <a href="/#how">How it works</a>
              <Link href="/limits">Limits &amp; pricing</Link>
              <Link href="/terms">Terms</Link>
              <Link href="/privacy-policy">Privacy</Link>
              <Link href="/cookie-policy">Cookies</Link>
            </span>
          </div>
        </footer>
      </body>
    </html>
  );
}
