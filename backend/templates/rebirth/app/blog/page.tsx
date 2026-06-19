import Link from "next/link";
import { listDocs } from "@/lib/content";

export default function Blog() {
  const posts = listDocs("posts");
  return (
    <div className="container article">
      <h1>Articles</h1>
      <div className="grid" style={{ marginTop: "28px" }}>
        {posts.map((p) => (
          <Link key={p.slug} href={`/blog/${p.slug}`} className="card">
            <span className="meta">{p.date.slice(0, 10)}</span>
            <h3>{p.title}</h3>
            <p>{p.excerpt}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
