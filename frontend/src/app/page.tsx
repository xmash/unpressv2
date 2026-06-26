"use client";

import { useCallback, useRef, useState } from "react";
import type { WorkerResponse } from "./recover.worker";
import { sizeError, sha256Hex, checkParse } from "../lib/limits";
import CheckoutModal from "./CheckoutModal";
import type {
  Category,
  SiteStructure,
  TreeNode,
  Counts,
  RecoveredComment,
  ThemeInfo,
  PluginInfo,
  ProductPreview,
  FontInfo,
} from "@unpress/engine";

type Status = "idle" | "working" | "done" | "error";

const PRICE = 19; // USD per website
const WOO = 59; // USD per store add-on

const FORMATS = [
  { ext: ".wpress", what: "All-in-One WP Migration", sites: "1" },
  { ext: ".zip", what: "UpdraftPlus · Duplicator · cPanel · manual", sites: "1+" },
  { ext: ".tar / .tar.gz / .tgz", what: "Host / reseller / cPanel full backup", sites: "1–many" },
  { ext: ".gz", what: "Gzipped dump or archive", sites: "1–many" },
  { ext: ".sql / .sql.gz", what: "Bare database dump (content only)", sites: "1" },
  { ext: ".xml (WXR)", what: "WordPress → Tools → Export", sites: "1" },
];

const FAQS = [
  {
    q: "Is my backup uploaded anywhere?",
    a: "No. Unpress reads the file entirely inside your browser — it never touches a server. We literally couldn't see it if we wanted to. That's the whole point.",
  },
  {
    q: "Which backup formats work?",
    a: "Drop almost anything: .wpress, .zip, .tar / .tar.gz, .sql / .sql.gz, or a WordPress WXR .xml export. The format is auto-detected — you don't pick anything.",
  },
  {
    q: "Do I need WordPress, hosting, or a developer?",
    a: "None of them. A dead backup file is all you need. Unpress turns it straight into readable content and a downloadable site.",
  },
  {
    q: "My backup has lots of sites in it. What happens?",
    a: "Host backups often hold many installs. Unpress detects every site, previews them all free, and you download only the ones you want — $19 each.",
  },
  {
    q: "Will it work with my old theme or page builder?",
    a: "Yes — Avada, Divi, Elementor, Gutenberg, Classic. We recover your content, not the disposable theme. Recreated, not replicated.",
  },
  {
    q: "What's in the download?",
    a: "Every page and post as clean Markdown + HTML, all your original images, and an inventory.json. Ready to drop into any modern site.",
  },
];

interface MediaState {
  count: number;
  bytes: number;
  files: string[];
  filesTotal: number;
  thumbs: { name: string; url: string }[];
  referenced: string[];
}

interface Result {
  site: { name: string; description: string; url: string };
  counts: Counts;
  categories: Category[];
  structure: SiteStructure;
  productCount: number;
  productSample: ProductPreview[];
  comments: RecoveredComment[];
  commentsTotal: number;
  themes: ThemeInfo[];
  fonts: FontInfo;
  plugins: PluginInfo[];
  spamCount: number;
  media: MediaState;
  sample: { name: string; text: string } | null;
}

export default function Home() {
  const [status, setStatus] = useState<Status>("idle");
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [dragging, setDragging] = useState(false);
  const [includeDrafts, setIncludeDrafts] = useState(false);
  const [entitled, setEntitled] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [checkout, setCheckout] = useState(false);
  const [checkoutStore, setCheckoutStore] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const includeDraftsRef = useRef(includeDrafts);
  includeDraftsRef.current = includeDrafts;

  const triggerDownload = (blob: Blob, name: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  const handleFile = useCallback(async (file: File) => {
    // Free-tier file-size cap (cheap pre-check before reading anything).
    const tooBig = sizeError(file.size);
    if (tooBig) {
      setFileName(file.name);
      setError(tooBig);
      setStatus("error");
      return;
    }

    workerRef.current?.terminate();
    setStatus("working");
    setError("");
    setResult(null);
    setEntitled(false);
    setFileName(file.name);

    const buf = await file.arrayBuffer();
    // Hash → daily free-recovery limit (re-parsing the same file is free).
    const hash = await sha256Hex(buf);
    const rl = checkParse(hash);
    if (!rl.allowed) {
      setError(rl.reason ?? "Daily free limit reached.");
      setStatus("error");
      return;
    }

    const worker = new Worker(new URL("./recover.worker.ts", import.meta.url));
    workerRef.current = worker;
    worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
      const data = e.data;
      if (!data.ok) {
        setError(data.error);
        setStatus("error");
        return;
      }
      if (data.kind === "export") {
        triggerDownload(data.blob, data.filename);
        setExporting(false);
        return;
      }
      // preview
      setResult({
        site: data.site,
        counts: data.counts,
        categories: data.categories,
        structure: data.structure,
        productCount: data.productCount,
        productSample: data.productSample,
        comments: data.comments,
        commentsTotal: data.commentsTotal,
        themes: data.themes,
        fonts: data.fonts,
        plugins: data.plugins,
        spamCount: data.spamCount,
        media: {
          count: data.media.count,
          bytes: data.media.bytes,
          files: data.media.files,
          filesTotal: data.media.filesTotal,
          thumbs: data.media.thumbs.map((t) => ({ name: t.name, url: URL.createObjectURL(t.blob) })),
          referenced: data.media.referenced,
        },
        sample: data.sample,
      });
      setStatus("done");
    };
    worker.onerror = (err) => {
      setError(err.message || "Something went wrong reading the archive.");
      setStatus("error");
    };

    // `buf` was already read above (for hashing); transfer it to the worker.
    worker.postMessage(
      { buffer: buf, includeDrafts: includeDraftsRef.current, filename: file.name },
      [buf],
    );
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

  const requestExport = () => {
    if (!workerRef.current) return;
    setExporting(true);
    workerRef.current.postMessage({ action: "export" });
  };

  const onBuy = () => {
    if (entitled) return requestExport();
    setCheckoutStore(false);
    setCheckout(true); // open Stripe / PayPal checkout
  };

  const onStore = () => {
    setCheckoutStore(true); // open checkout with the store add-on pre-selected
    setCheckout(true);
  };

  const onPaid = () => {
    setEntitled(true);
    setCheckout(false);
    requestExport(); // worker still holds the parse — download fires immediately
  };

  const onSample = () => {
    if (!result?.sample) return;
    triggerDownload(new Blob([result.sample.text], { type: "text/markdown" }), result.sample.name);
  };

  const reset = () => {
    workerRef.current?.terminate();
    workerRef.current = null;
    setStatus("idle");
    setResult(null);
    setFileName("");
    setEntitled(false);
  };

  const scrollToDrop = () => {
    document.getElementById("recover")?.scrollIntoView({ behavior: "smooth" });
    inputRef.current?.focus();
  };

  return (
    <>
      {checkout && (
        <CheckoutModal
          sitePrice={PRICE}
          storePrice={WOO}
          productCount={result?.productCount ?? 0}
          initialStore={checkoutStore}
          onPaid={onPaid}
          onClose={() => setCheckout(false)}
        />
      )}
      {status !== "idle" && (
        <main className="recover-view">
          {status === "working" && (
            <div className="processing">
              <Spinner />
              <p>Recovering {fileName} … reading in your browser</p>
            </div>
          )}
          {status === "error" && (
            <div className="recover-error">
              <div className="rx-icon">⚠️</div>
              <h2>That didn’t open</h2>
              <p>{error}</p>
              <button className="btn-primary" onClick={reset}>
                ← Try another file
              </button>
            </div>
          )}
          {status === "done" && result && (
            <Results
              result={result}
              fileName={fileName}
              entitled={entitled}
              exporting={exporting}
              onBuy={onBuy}
              onStore={onStore}
              onSample={onSample}
              onReset={reset}
            />
          )}
        </main>
      )}

      {status === "idle" && (
        <>
      {/* ───────────────── HERO + PRODUCT ───────────────── */}
      <section className="hero" id="recover">
        <div className="hero-inner">
          <span className="eyebrow">Dead WordPress backup? Not anymore.</span>
          <h1 className="hero-h1">
            Your website,
            <br />
            <span className="grad">set free.</span>
          </h1>
          <p className="hero-sub">
            Drop your old WordPress backup — any format — and get every page, post and photo back.
            In your browser. No WordPress, no hosting, no developer.
          </p>

          <div className="drop-wrap">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => inputRef.current?.click()}
              className={`dropzone ${dragging ? "drag" : ""}`}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".wpress,.zip,.tar,.gz,.tgz,.sql,.xml"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
              <div className="drop-icon">⬆</div>
              <div className="drop-title">Drop your backup here</div>
              <div className="drop-note">
                .wpress · .zip · .tar.gz · .sql · .xml — auto-detected · nothing is uploaded
              </div>
              <button className="btn-primary drop-btn" type="button">
                Choose a file
              </button>
            </div>
            <label className="drafts">
              <input
                type="checkbox"
                checked={includeDrafts}
                onChange={(e) => setIncludeDrafts(e.target.checked)}
              />
              Also recover drafts &amp; unpublished content
            </label>
            <div className="trust">
              <span>🔒 Runs in your browser</span>
              <span>⚡ Instant preview</span>
              <span>🧩 Any theme or builder</span>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────── VALUE CARDS ───────────────── */}
      <section className="section">
        <h2 className="section-title">You drop. We recover.</h2>
        <p className="section-lead">
          The only tool that turns a <em>dead</em> WordPress backup straight into content — privately,
          automatically, instantly.
        </p>
        <div className="vcards">
          {[
            ["🔍", "Auto-detects any format", "Drop .wpress, zip, tar.gz, .sql or a WP export. No menus, no guessing — we read the bytes."],
            ["⚡", "See everything instantly", "Every page, post and photo, organized into tabs with your site structure mapped."],
            ["🔒", "100% in your browser", "Your backup never leaves your computer. No upload, no account, no risk."],
            ["⬇️", "Take it with you", "Clean Markdown + HTML + every original image, ready for any modern site."],
          ].map(([icon, title, body]) => (
            <div className="vcard" key={title}>
              <div className="vcard-icon">{icon}</div>
              <h3>{title}</h3>
              <p>{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ───────────────── HOW IT WORKS ───────────────── */}
      <section className="section alt" id="how">
        <h2 className="section-title">Back online in three steps</h2>
        <div className="steps">
          <div className="step">
            <span className="num">1</span>
            <h3>Drop your backup</h3>
            <p>Any WordPress backup format. It opens right here in your browser — nothing uploads.</p>
          </div>
          <div className="step">
            <span className="num">2</span>
            <h3>See everything, free</h3>
            <p>Browse every recovered page, post and photo. Confirm it&apos;s all there before you pay a cent.</p>
          </div>
          <div className="step">
            <span className="num">3</span>
            <h3>Download your site</h3>
            <p>Get the full export — clean content + all media — for ${PRICE} per website.</p>
          </div>
        </div>
      </section>

      {/* ───────────────── FORMATS TABLE ───────────────── */}
      <section className="section" id="formats">
        <h2 className="section-title">Every backup format. Auto-detected.</h2>
        <p className="section-lead">
          You never choose a format. Drop the file and Unpress identifies it — including host backups
          with many sites inside.
        </p>
        <div className="ftable-wrap">
          <table className="ftable">
            <thead>
              <tr>
                <th>Format</th>
                <th>Where it comes from</th>
                <th>Sites / file</th>
                <th>Preview</th>
                <th>Download</th>
              </tr>
            </thead>
            <tbody>
              {FORMATS.map((f) => (
                <tr key={f.ext}>
                  <td><code>{f.ext}</code></td>
                  <td>{f.what}</td>
                  <td>{f.sites}</td>
                  <td><span className="free-pill">Free</span></td>
                  <td>${PRICE}{f.sites !== "1" ? " × sites" : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="ftable-foot">
          A <code>tar.gz</code> with 50 sites? Preview all 50 free, download the ones you want at ${PRICE}
          each.
        </p>
      </section>

      {/* ───────────────── BAND ───────────────── */}
      <section className="band">
        <div className="band-big">Any theme. Any builder. Any format.</div>
        <div className="band-sub">One drop — and your content is yours again.</div>
      </section>

      {/* ───────────────── PRICING ───────────────── */}
      <section className="section alt" id="pricing">
        <h2 className="section-title">Free to look. ${PRICE} to take it.</h2>
        <p className="section-lead">No subscription. No account to download. Pay per site, only when you want it.</p>
        <div className="pricing3">
          <div className="ptier">
            <span className="tag" />
            <h3>Preview</h3>
            <div className="price">$0</div>
            <p className="desc">See everything, every time.</p>
            <ul>
              <li>Recover any format in your browser</li>
              <li>Every page, post, structure &amp; photo</li>
              <li>One free watermarked sample page</li>
              <li>100% private — nothing uploaded</li>
            </ul>
            <button className="cta" onClick={scrollToDrop}>Try it now</button>
          </div>
          <div className="ptier featured">
            <span className="tag">Per website</span>
            <h3>Recover</h3>
            <div className="price">${PRICE}<small> / site</small></div>
            <p className="desc">Download the whole site.</p>
            <ul>
              <li>Every page &amp; post — Markdown + HTML</li>
              <li>All original images &amp; media</li>
              <li>inventory.json content map</li>
              <li>Multi-site backups: ${PRICE} per site</li>
            </ul>
            <button className="cta primary" onClick={scrollToDrop}>Recover a site</button>
          </div>
          <div className="ptier">
            <span className="tag">Add-on</span>
            <h3>Store export</h3>
            <div className="price">+${WOO}<small> / store</small></div>
            <p className="desc">If the backup has a shop.</p>
            <ul>
              <li>WooCommerce products &amp; variations</li>
              <li>Prices, SKUs &amp; stock</li>
              <li>Categories &amp; attributes</li>
              <li>Import-ready CSV + JSON</li>
            </ul>
            <button className="cta" onClick={scrollToDrop}>Add to a recovery</button>
          </div>
        </div>
      </section>

      {/* ───────────────── FAQ ───────────────── */}
      <section className="section" id="faq">
        <h2 className="section-title">Questions, answered</h2>
        <div className="faq">
          {FAQS.map((f) => (
            <details key={f.q}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ───────────────── FINAL CTA ───────────────── */}
      <section className="cta-band">
        <h2>Your site is still in there.</h2>
        <p>Drop the backup. See it come back. It takes about ten seconds.</p>
        <button className="btn-primary big" onClick={scrollToDrop}>Recover my site →</button>
      </section>
        </>
      )}
    </>
  );
}

/* ───────────────────────── results ───────────────────────── */

function Results({
  result,
  fileName,
  entitled,
  exporting,
  onBuy,
  onStore,
  onSample,
  onReset,
}: {
  result: Result;
  fileName: string;
  entitled: boolean;
  exporting: boolean;
  onBuy: () => void;
  onStore: () => void;
  onSample: () => void;
  onReset: () => void;
}) {
  const hasAppearance = result.themes.length > 0 || result.fonts.families.length > 0;
  const tabs: { key: string; label: string; count?: number; group: string }[] = [
    { key: "structure", label: "File structure", group: "Overview" },
    ...result.categories.map((c) => ({ key: c.key, label: c.label, count: c.count, group: "Content" })),
    { key: "media", label: "Media", count: result.media.count || result.media.referenced.length, group: "Site" },
    ...(result.commentsTotal ? [{ key: "comments", label: "Comments", count: result.commentsTotal, group: "Site" }] : []),
    ...(hasAppearance ? [{ key: "appearance", label: "Appearance", count: result.themes.length + result.fonts.families.length, group: "Site" }] : []),
    ...(result.plugins.length ? [{ key: "plugins", label: "Plugins", count: result.plugins.length, group: "Site" }] : []),
    ...(result.productCount ? [{ key: "products", label: "Store", count: result.productCount, group: "Site" }] : []),
  ];
  const GROUPS = ["Overview", "Content", "Site"];
  const [tab, setTab] = useState("structure");
  const c = result.counts;

  return (
    <div className="results">
      <div className="dlbox">
        <div className="dlbox-info">
          <div className="dlbox-eyebrow">recovered from {fileName}</div>
          <div className="dlbox-title">{result.site.name}</div>
          <div className="dlbox-sub">
            {c.pages} pages · {c.posts} posts · {result.media.count} photos — clean Markdown, HTML &amp;
            original images
          </div>
        </div>
        <div className="dlbox-actions">
          <button className="btn-buy" onClick={onBuy} disabled={exporting}>
            {exporting
              ? "Building your zip…"
              : entitled
                ? "↓ Download (.zip)"
                : "Download"}
          </button>
          {result.sample && (
            <button className="btn-ghost" onClick={onSample}>
              Download a free sample page
            </button>
          )}
        </div>
      </div>

      <div className="results-body">
        <aside className="tab-rail">
          {GROUPS.map((g) => {
            const inGroup = tabs.filter((t) => t.group === g);
            if (!inGroup.length) return null;
            return (
              <div className="rail-group" key={g}>
                <div className="rail-label">{g}</div>
                {inGroup.map((t) => (
                  <button
                    key={t.key}
                    className={`rail-tab ${tab === t.key ? "active" : ""}`}
                    onClick={() => setTab(t.key)}
                  >
                    <span className="rail-tab-label">{t.label}</span>
                    {typeof t.count === "number" && <span className="pill">{t.count}</span>}
                  </button>
                ))}
              </div>
            );
          })}
        </aside>

        <div className="tab-panel">
          {tab === "structure" && <StructureTab structure={result.structure} spamCount={result.spamCount} />}
          {result.categories.map(
            (cat) => tab === cat.key && <ItemList key={cat.key} items={cat.items} total={cat.count} />,
          )}
          {tab === "media" && <MediaTab media={result.media} />}
          {tab === "comments" && <CommentsTab comments={result.comments} total={result.commentsTotal} />}
          {tab === "appearance" && <AppearanceTab themes={result.themes} fonts={result.fonts} />}
          {tab === "plugins" && <PluginsTab plugins={result.plugins} />}
          {tab === "products" && <ProductsTab count={result.productCount} sample={result.productSample} onAddStore={onStore} />}

          <button onClick={onReset} className="recover-another">
            ← Recover another backup
          </button>
        </div>
      </div>
    </div>
  );
}

function StructureTab({ structure, spamCount }: { structure: SiteStructure; spamCount: number }) {
  return (
    <div>
      {spamCount > 0 && (
        <div className="spam-note">
          🛡️ Filtered out <strong>{spamCount.toLocaleString()}</strong> injected spam post
          {spamCount === 1 ? "" : "s"} (casino/gambling). Your old site was likely compromised — these
          were excluded from the recovery.
        </div>
      )}
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
        <p className="muted-note">No page hierarchy found.</p>
      )}
    </div>
  );
}

function TreeItem({ node }: { node: TreeNode }) {
  return (
    <li>
      {node.title}
      {node.children.length > 0 && <ul>{node.children.map((c) => <TreeItem key={c.slug} node={c} />)}</ul>}
    </li>
  );
}

function MoreItems({ hidden, noun }: { hidden: number; noun: string }) {
  if (hidden <= 0) return null;
  return (
    <div className="more-items">
      +{hidden.toLocaleString()} more {noun} in the full download
    </div>
  );
}

function ItemList({ items, total }: { items: Category["items"]; total: number }) {
  const noun = items[0]?.type === "page" ? "pages" : items[0]?.type === "post" ? "posts" : "items";
  return (
    <div>
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
            {it.fields.length > 0 && (
              <dl className="fields">
                {it.fields.slice(0, 6).map((f) => (
                  <div className="field" key={f.key}>
                    <dt>{f.label}</dt>
                    <dd>{f.value}</dd>
                  </div>
                ))}
              </dl>
            )}
            <p>{it.excerpt || "—"}</p>
            <div className="foot">
              {it.words} words · {it.images} images
            </div>
          </div>
        ))}
      </div>
      <MoreItems hidden={total - items.length} noun={noun} />
    </div>
  );
}

function CommentsTab({ comments, total }: { comments: RecoveredComment[]; total: number }) {
  if (!total) return <p className="muted-note">No comments found in this backup.</p>;
  return (
    <div>
      <p className="muted-note mb">{total.toLocaleString()} approved comments recovered.</p>
      <div className="itemgrid">
        {comments.map((cm) => (
          <div className="itemcard" key={cm.id}>
            <div className="row">
              <h4>{cm.author}</h4>
              {!cm.approved && <span className="badge draft">Pending</span>}
            </div>
            <p>{cm.content.slice(0, 220) || "—"}</p>
            <div className="foot">{cm.date?.slice(0, 10)} · on post #{cm.postId}</div>
          </div>
        ))}
      </div>
      <MoreItems hidden={total - comments.length} noun="comments" />
    </div>
  );
}

function AppearanceTab({ themes, fonts }: { themes: ThemeInfo[]; fonts: FontInfo }) {
  if (!themes.length && !fonts.families.length) {
    return <p className="muted-note">No themes or fonts found in this backup.</p>;
  }
  return (
    <div>
      {themes.length > 0 && (
        <>
          <h4 className="ap-h">Themes</h4>
          <p className="muted-note mb">
            {themes.length} theme{themes.length === 1 ? "" : "s"} found. Informational only — Unpress
            recovers your content, not the disposable theme.
          </p>
          <div className="filelist">
            {themes.map((t) => (
              <div key={t.slug}>
                {t.name}
                {t.active && <span className="badge type" style={{ marginLeft: 8 }}>Active</span>}
              </div>
            ))}
          </div>
        </>
      )}

      {fonts.families.length > 0 && (
        <>
          <h4 className="ap-h" style={{ marginTop: 24 }}>Fonts</h4>
          <p className="muted-note mb">
            {fonts.families.length} font famil{fonts.families.length === 1 ? "y" : "ies"} · {fonts.faces}{" "}
            face{fonts.faces === 1 ? "" : "s"} (WordPress Font Library).
          </p>
          <div className="filelist">
            {fonts.families.map((f) => (
              <div key={f}>{f}</div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function PluginsTab({ plugins }: { plugins: PluginInfo[] }) {
  if (!plugins.length) return <p className="muted-note">No plugins found in this backup.</p>;
  const active = plugins.filter((p) => p.active).length;
  return (
    <div>
      <p className="muted-note mb">
        {plugins.length} plugin{plugins.length === 1 ? "" : "s"} found ({active} active).
      </p>
      <div className="filelist">
        {plugins.map((p) => (
          <div key={p.slug}>
            {p.slug}
            {p.active && <span className="badge type" style={{ marginLeft: 8 }}>Active</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

function MediaTab({ media }: { media: MediaState }) {
  // Database-only backup: no image files, but the DB references them. Show a
  // manifest the customer can hand to their host to demand the uploads folder.
  if (media.count === 0 && media.referenced.length > 0) {
    const downloadList = () => {
      const header = [
        "# Images referenced by your WordPress database but NOT included in this backup.",
        "# These files live in wp-content/uploads/ on your server.",
        "# Ask your hosting provider to send you this folder (or a full backup).",
        "",
      ].join("\n");
      const blob = new Blob([header + media.referenced.join("\n") + "\n"], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "missing-images-to-request.txt";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    };
    return (
      <div>
        <div className="db-only">
          <div className="db-only-icon">🗄️</div>
          <div>
            <h3>This is a database-only backup</h3>
            <p>
              It has all your content — but WordPress stores images as <strong>files</strong> in{" "}
              <code>wp-content/uploads/</code>, which isn&apos;t inside a database (<code>.sql</code>)
              dump. We found <strong>{media.referenced.length} images</strong> your site uses, listed
              below. Ask your host for the <code>wp-content/uploads</code> folder (or a full backup),
              then drop it here to recover the actual files.
            </p>
            <button className="btn-buy" onClick={downloadList}>
              ↓ Download the list to send your host (.txt)
            </button>
          </div>
        </div>
        <p className="muted-note mb">{media.referenced.length} images referenced · server paths:</p>
        <div className="filelist">
          {media.referenced.map((f) => (
            <div key={f}>{f}</div>
          ))}
        </div>
      </div>
    );
  }

  if (media.count === 0) {
    return <p className="muted-note">No media found in this backup.</p>;
  }

  return (
    <div>
      <p className="muted-note mb">
        {media.count} original files · {(media.bytes / 1e6).toFixed(1)} MB (resized duplicates removed)
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
      <MoreItems hidden={media.filesTotal - media.files.length} noun="images & files" />
    </div>
  );
}

function ProductsTab({ count, sample, onAddStore }: { count: number; sample: ProductPreview[]; onAddStore: () => void }) {
  if (count === 0) {
    return <p className="muted-note">No WooCommerce products found in this backup.</p>;
  }
  return (
    <div>
      <p className="muted-note mb">
        {count.toLocaleString()} product{count === 1 ? "" : "s"} found.
      </p>
      <div className="itemgrid">
        {sample.map((p) => (
          <div className="itemcard" key={p.slug + p.title}>
            <div className="row">
              <h4>{p.title}</h4>
              <span className="badge type">product</span>
            </div>
          </div>
        ))}
      </div>
      <MoreItems hidden={count - sample.length} noun="products" />

      <div className="store-cta">
        <h3>🛍️ Store export</h3>
        <p>
          Get every product with variations, prices, SKUs and categories as an import-ready export —
          a +${WOO} add-on to your download.
        </p>
        <button className="pro-btn" onClick={onAddStore}>
          Add store export — +${WOO}
        </button>
      </div>
    </div>
  );
}

function Spinner() {
  return <div className="spinner" />;
}
