import { getDoc, listDocs } from "@/lib/content";
import { notFound } from "next/navigation";

export function generateStaticParams() {
  return listDocs("posts").map((d) => ({ slug: d.slug }));
}

export default async function Post({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const doc = getDoc("posts", slug);
  if (!doc) notFound();
  return (
    <article className="container article">
      <h1>{doc.title}</h1>
      {doc.date && <p className="meta">{doc.date.slice(0, 10)}</p>}
      <div className="prose" dangerouslySetInnerHTML={{ __html: doc.html }} />
    </article>
  );
}
