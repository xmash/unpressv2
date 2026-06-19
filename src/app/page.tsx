"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { WorkerResponse } from "./recover.worker";
import type { Category, SiteStructure, TreeNode, Counts } from "@/engine";

type Status = "idle" | "working" | "done" | "error";

interface MediaState {
  count: number;
  bytes: number;
  files: string[];
  thumbs: { name: string; url: string }[];
}

interface Result {
  site: { name: string; description: string; url: string };
  counts: Counts;
  categories: Category[];
  structure: SiteStructure;
  productCount: number;
  media: MediaState;
  sample: { name: string; text: string } | null;
  url: string | null;
  filename: string;
}

export default function Home() {
  const [status, setStatus] = useState<Status>("idle");
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [dragging, setDragging] = useState(false);
  const [includeDrafts, setIncludeDrafts] = useState(false);
  const [exporting, setExporting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const includeDraftsRef = useRef(includeDrafts);
  includeDraftsRef.current = includeDrafts;

  const revokeResultUrls = useCallback((r: Result | null) => {
    if (!r) return;
    if (r.url) URL.revokeObjectURL(r.url);
    for (const t of r.media.thumbs) URL.revokeObjectURL(t.url);
  }, []);

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".wpress")) {
      setStatus("error");
      setError("That's not a .wpress file. Drop the backup from All-in-One WP Migration.");
      return;
    }
    setStatus("working");
    setError("");
    setExporting(false);
    setResult((prev) => {
      revokeResultUrls(prev);
      return null;
    });
    setFileName(file.name);
    workerRef.current?.terminate();
    workerRef.current = null;

    const worker = new Worker(new URL("./recover.worker.ts", import.meta.url));
    workerRef.current = worker;
    worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
      const data = e.data;
      if (!data.ok) {
        setError(data.error);
        setStatus("error");
        worker.terminate();
        workerRef.current = null;
        return;
      }

      if (data.kind === "preview") {
        const baseName = (data.site.name || "site").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
        setResult({
          site: data.site,
          counts: data.counts,
          categories: data.categories,
          structure: data.structure,
          productCount: data.productCount,
          media: {
            count: data.media.count,
            bytes: data.media.bytes,
            files: data.media.files,
            thumbs: data.media.thumbs
              .filter((t): t is typeof t & { blob: Blob } => t.blob instanceof Blob)
              .map((t) => ({
                name: t.name,
                url: URL.createObjectURL(t.blob),
              })),
          },
          sample: data.sample,
          url: null,
          filename: `${baseName}-recovery.zip`,
        });
        setStatus("done");
        return;
      }

      if (data.kind === "export") {
        setResult((prev) =>
          prev
            ? {
                ...prev,
                url: URL.createObjectURL(data.blob),
                filename: data.filename,
              }
            : null,
        );
        setExporting(false);
        worker.terminate();
        workerRef.current = null;
      }
    };
    worker.onerror = (err) => {
      setError(err.message || "Something went wrong reading the archive.");
      setStatus("error");
      setExporting(false);
      worker.terminate();
      workerRef.current = null;
    };

    const buf = await file.arrayBuffer();
    worker.postMessage(
      { buffer: buf, includeDrafts: includeDraftsRef.current, filename: file.name },
      [buf],
    );
  }, [revokeResultUrls]);

  const handleExport = useCallback(() => {
    const worker = workerRef.current;
    if (!worker) {
      setError("Start a new recovery to build the download.");
      setStatus("error");
      return;
    }
    setExporting(true);
    worker.postMessage({ action: "export" });
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const f = e.dataTransfer.files?.[0];
      if (f) handleFile(f);
    },
    [handleFile],
  );

  const reset = () => {
    workerRef.current?.terminate();
    workerRef.current = null;
    setExporting(false);
    setResult((prev) => {
      revokeResultUrls(prev);
      return null;
    });
    setStatus("idle");
    setFileName("");
  };

  return (
    <main className="min-h-[60vh] px-5">
      <div className="mx-auto" style={{ maxWidth: status === "done" ? 1400 : 768 }}>
          {status !== "done" && (
            <div className="text-center pt-[8vh] pb-6">
              <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
                Your website,{" "}
                <span style={{ color: "var(--accent)" }}>set free.</span>
              </h1>
              <p className="mt-4 text-base max-w-xl mx-auto" style={{ color: "var(--muted)" }}>
                Drop your old WordPress <code>.wpress</code> backup below. Instantly see every page,
                post, and photo — and download it all. No WordPress, no upload, no developer.
              </p>
            </div>
          )}

          {status !== "done" && (
            <>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                onClick={() => inputRef.current?.click()}
                className="w-full cursor-pointer rounded-2xl border-2 border-dashed px-6 py-14 transition-colors"
                style={{
                  borderColor: dragging ? "var(--accent)" : "var(--line)",
                  background: dragging ? "rgba(18,161,80,0.06)" : "var(--panel)",
                }}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept=".wpress"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                />
                {status === "working" ? (
                  <div className="flex flex-col items-center gap-3">
                    <Spinner />
                    <span className="text-sm" style={{ color: "var(--muted)" }}>
                      Recovering {fileName} … reading in your browser
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-center">
                    <span className="text-base font-medium">Drop your .wpress file here</span>
                    <span className="text-sm" style={{ color: "var(--muted)" }}>
                      or click to choose · nothing is uploaded
                    </span>
                  </div>
                )}
              </div>
              {status !== "working" && (
                <label
                  className="mt-4 flex items-center gap-2 text-sm cursor-pointer select-none"
                  style={{ color: "var(--muted)" }}
                >
                  <input
                    type="checkbox"
                    checked={includeDrafts}
                    onChange={(e) => setIncludeDrafts(e.target.checked)}
                  />
                  Also recover drafts &amp; unpublished content
                </label>
              )}
            </>
          )}

          {status === "error" && (
            <p className="mt-4 text-sm" style={{ color: "#dc2626" }}>
              {error}
            </p>
          )}

          {status === "done" && result && (
            <Results
              result={result}
              fileName={fileName}
              exporting={exporting}
              onExport={handleExport}
              onReset={reset}
            />
          )}

          <p className="mt-12 mb-10 text-center text-xs" style={{ color: "var(--muted)" }}>
            Recreated, not replicated — Unpress brings your content back to life on a modern site.
          </p>
        </div>
      </main>
  );
}

function Results({
  result,
  fileName,
  exporting,
  onExport,
  onReset,
}: {
  result: Result;
  fileName: string;
  exporting: boolean;
  onExport: () => void;
  onReset: () => void;
}) {
  const tabs: { key: string; label: string; count?: number; locked?: boolean }[] = [
    { key: "structure", label: "File structure" },
    ...result.categories.map((c) => ({ key: c.key, label: c.label, count: c.count })),
    { key: "media", label: "Media", count: result.media.count },
    { key: "products", label: "Products", count: result.productCount, locked: true },
  ];
  const [tab, setTab] = useState("structure");
  const sampleUrl = useMemo(
    () =>
      result.sample
        ? URL.createObjectURL(new Blob([result.sample.text], { type: "text/markdown" }))
        : null,
    [result.sample],
  );
  useEffect(() => () => {
    if (sampleUrl) URL.revokeObjectURL(sampleUrl);
  }, [sampleUrl]);

  return (
    <div className="pt-[5vh]">
      <div className="flex items-baseline justify-between flex-wrap gap-2 mb-1">
        <h2 className="text-2xl font-bold">{result.site.name}</h2>
        <span className="text-xs" style={{ color: "var(--muted)" }}>
          recovered from {fileName}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {result.url ? (
          <a
            href={result.url}
            download={result.filename}
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 font-semibold text-sm"
            style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
          >
            ↓ Download everything (.zip)
          </a>
        ) : (
          <button
            type="button"
            onClick={onExport}
            disabled={exporting}
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 font-semibold text-sm disabled:opacity-60"
            style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
          >
            {exporting ? (
              <>
                <Spinner /> Building your .zip …
              </>
            ) : (
              "↓ Build full download (.zip)"
            )}
          </button>
        )}
        {sampleUrl && result.sample && (
          <a
            href={sampleUrl}
            download={result.sample.name}
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 font-semibold text-sm border"
            style={{ borderColor: "var(--line)" }}
          >
            Free sample page
          </a>
        )}
      </div>

      <div className="tabs">
        {tabs.map((t) => (
          <button
            key={t.key}
            className={`tab ${tab === t.key ? "active" : ""}`}
            onClick={() => setTab(t.key)}
          >
            {t.locked && <span className="lock">🔒</span>}
            {t.label}
            {typeof t.count === "number" && <span className="pill">{t.count}</span>}
          </button>
        ))}
      </div>

      {tab === "structure" && <StructureTab structure={result.structure} />}
      {result.categories.map(
        (c) => tab === c.key && <ItemList key={c.key} items={c.items} />,
      )}
      {tab === "media" && <MediaTab media={result.media} />}
      {tab === "products" && <ProductsTab count={result.productCount} />}

      <button onClick={onReset} className="mt-7 text-sm underline" style={{ color: "var(--muted)" }}>
        Recover another site
      </button>
    </div>
  );
}

function StructureTab({ structure }: { structure: SiteStructure }) {
  return (
    <div>
      <div className="groupgrid">
        {structure.groups.map((g) => (
          <div className="groupstat" key={g.label}>
            <b>{g.count}</b>
            <span>{g.label}</span>
          </div>
        ))}
      </div>
      {structure.tree.length > 0 ? (
        <ul className="tree">{structure.tree.map((n) => <TreeItem key={n.slug} node={n} />)}</ul>
      ) : (
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          No page hierarchy found.
        </p>
      )}
    </div>
  );
}

function TreeItem({ node }: { node: TreeNode }) {
  return (
    <li>
      {node.title}
      {node.children.length > 0 && (
        <ul>{node.children.map((c) => <TreeItem key={c.slug} node={c} />)}</ul>
      )}
    </li>
  );
}

function ItemList({ items }: { items: Category["items"] }) {
  return (
    <div className="itemgrid">
      {items.map((it) => (
        <div className="itemcard" key={it.slug + it.title}>
          <div className="row">
            <h4>{it.title}</h4>
            {it.status === "draft" ? (
              <span className="badge draft">Draft</span>
            ) : (
              <span className="badge type">{it.type}</span>
            )}
          </div>
          <p>{it.excerpt || "—"}</p>
          <div className="foot">
            {it.words} words · {it.images} images
          </div>
        </div>
      ))}
    </div>
  );
}

function MediaTab({ media }: { media: MediaState }) {
  return (
    <div>
      <p className="text-sm mb-3" style={{ color: "var(--muted)" }}>
        {media.count} original files · {(media.bytes / 1e6).toFixed(1)} MB (resized duplicates
        removed)
      </p>
      {media.thumbs.length > 0 && (
        <div className="mediagrid">
          {media.thumbs.map((t) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={t.name} src={t.url} alt={t.name} loading="lazy" />
          ))}
        </div>
      )}
      <div className="filelist">
        {media.files.map((f) => (
          <div key={f}>{f}</div>
        ))}
      </div>
    </div>
  );
}

function ProductsTab({ count }: { count: number }) {
  const [joined, setJoined] = useState(false);
  return (
    <div className="locked">
      <div className="lockicon">🔒</div>
      <h3>WooCommerce store recovery</h3>
      <p>
        {count > 0
          ? `We found ${count} product${count === 1 ? "" : "s"} in this backup. `
          : "When a backup contains a store, "}
        Unpress Pro recovers your WooCommerce products, variations, categories, and customer-free
        catalog into a clean modern storefront. Available on a paid subscription.
      </p>
      {joined ? (
        <p className="pro-note">Thanks — we’ll email you when Unpress Pro launches.</p>
      ) : (
        <button className="pro-btn" onClick={() => setJoined(true)}>
          Unlock with Unpress Pro
        </button>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <div
      className="h-6 w-6 rounded-full border-2 animate-spin"
      style={{ borderColor: "var(--line)", borderTopColor: "var(--accent)" }}
    />
  );
}
