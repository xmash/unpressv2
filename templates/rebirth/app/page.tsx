import Link from "next/link";
import { getConfig, listDocs } from "@/lib/content";

export default function Home() {
  const c = getConfig();
  const posts = c.hasBlog ? listDocs("posts").slice(0, 3) : [];
  const cta = c.nav.find((n) => /contact/i.test(n.slug)) || c.nav[0];

  return (
    <>
      <section className="hero">
        <div className="container">
          <p className="eyebrow">{c.name}</p>
          <h1>{c.tagline || c.name}</h1>
          {c.intro && <p className="lede">{c.intro}</p>}
          {cta && (
            <Link className="btn" href={`/${cta.slug}`}>
              {/contact/i.test(cta.slug) ? "Get in touch" : `Explore ${cta.title}`}
            </Link>
          )}
        </div>
      </section>

      {c.cards.length > 0 && (
        <section className="section">
          <div className="container">
            <h2 className="section-title">Explore</h2>
            <div className="grid">
              {c.cards.map((card) => (
                <Link key={card.slug} href={`/${card.slug}`} className="card">
                  <h3>{card.title}</h3>
                  <p>{card.excerpt}</p>
                  <span className="more">Read more →</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {posts.length > 0 && (
        <section className="section alt">
          <div className="container">
            <h2 className="section-title">Latest articles</h2>
            <div className="grid">
              {posts.map((p) => (
                <Link key={p.slug} href={`/blog/${p.slug}`} className="card">
                  <span className="meta">{p.date.slice(0, 10)}</span>
                  <h3>{p.title}</h3>
                  <p>{p.excerpt}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
