import "./globals.css";
import Link from "next/link";
import type { Metadata } from "next";
import { getConfig } from "@/lib/content";

export function generateMetadata(): Metadata {
  const c = getConfig();
  return { title: c.name, description: c.intro || c.tagline };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const c = getConfig();
  return (
    <html lang="en">
      <body>
        <header className="header">
          <div className="container header-inner">
            <Link href="/" className="brand">
              {c.name}
            </Link>
            <nav className="nav">
              <Link href="/">Home</Link>
              {c.nav.map((n) => (
                <Link key={n.slug} href={`/${n.slug}`}>
                  {n.title}
                </Link>
              ))}
              {c.hasBlog && <Link href="/blog">Articles</Link>}
            </nav>
          </div>
        </header>
        <main>{children}</main>
        <footer className="footer">
          <div className="container footer-inner">
            <span>
              © {new Date().getFullYear()} {c.name}
            </span>
            <span>
              Reborn with <strong>Unpress</strong> — no WordPress required.
            </span>
          </div>
        </footer>
      </body>
    </html>
  );
}
