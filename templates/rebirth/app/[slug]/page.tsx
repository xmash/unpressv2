import { getConfig, getDoc, listDocs } from "@/lib/content";
import { notFound } from "next/navigation";

export function generateStaticParams() {
  const c = getConfig();
  return listDocs("pages")
    .filter((d) => d.slug !== c.homeSlug)
    .map((d) => ({ slug: d.slug }));
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const doc = getDoc("pages", slug);
  if (!doc) notFound();
  return (
    <article className="container article">
      <h1>{doc.title}</h1>
      <div className="prose" dangerouslySetInnerHTML={{ __html: doc.html }} />
    </article>
  );
}
