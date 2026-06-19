// Turn raw WordPress post_content (Fusion/Avada shortcodes, Gutenberg blocks, or
// Classic HTML) into clean HTML + Markdown, with media URLs rewritten to local
// paths. This is the keystone the existing WXR-based exporters never had to do.
//
// The HTML→Markdown step is intentionally DOM-free (pure string) so the exact
// same code runs in Node (CLI), the browser, and a Web Worker — where there is
// no `document`/`DOMParser` for libraries like Turndown to use.

export interface CleanedContent {
  html: string;
  markdown: string;
  images: string[];
}

const ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
  ldquo: "“", rdquo: "”", lsquo: "‘", rsquo: "’",
  ndash: "–", mdash: "—", hellip: "…", copy: "©",
  reg: "®", trade: "™",
};

function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_m, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_m, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&([a-z]+);/gi, (m, name) => ENTITIES[name] ?? ENTITIES[name.toLowerCase()] ?? m);
}

/**
 * Strip WordPress's generated size suffix so a URL points back at the original
 * upload: `logo-300x100.png` → `logo.png`, `photo-scaled.jpg` → `photo.jpg`.
 */
export function stripSizeSuffix(p: string): string {
  return p
    .replace(/-\d+x\d+(\.\w+)(?=$|\?|#)/i, "$1")
    .replace(/-scaled(\.\w+)(?=$|\?|#)/i, "$1");
}

/** Rewrite any uploads URL to a local original-media `media/...` path. */
export function rewriteUrls(input: string): string {
  return input.replace(
    /https?:\/\/[^\s"')]+\/uploads\/(?:sites\/\d+\/)?([^\s"')]+)/gi,
    (_m, p) => "media/" + stripSizeSuffix(String(p)),
  );
}

function stripFusion(s: string): string {
  s = s.replace(/\[fusion_title[^\]]*\]([\s\S]*?)\[\/fusion_title\]/gi, "<h2>$1</h2>");
  s = s.replace(/\[fusion_text[^\]]*\]([\s\S]*?)\[\/fusion_text\]/gi, "<div>$1</div>");
  s = s.replace(/\[fusion_li_item[^\]]*\]([\s\S]*?)\[\/fusion_li_item\]/gi, "<li>$1</li>");
  s = s.replace(
    /\[fusion_imageframe[^\]]*\]([\s\S]*?)\[\/fusion_imageframe\]/gi,
    (_m, inner) => {
      const url = String(inner).trim();
      return url ? `<p><img src="${url}" /></p>` : "";
    },
  );
  s = s.replace(
    /\[fusion_button[^\]]*\blink="([^"]*)"[^\]]*\]([\s\S]*?)\[\/fusion_button\]/gi,
    '<p><a href="$1">$2</a></p>',
  );
  return s;
}

// DOM-free HTML → Markdown. Handles the structural subset WordPress page
// builders emit: headings, paragraphs, lists, links, images, emphasis, quotes.
function htmlToMarkdown(html: string): string {
  let s = html;
  s = s.replace(/<(script|style)[\s\S]*?<\/\1>/gi, "");

  // images & links first (they carry attributes)
  s = s.replace(/<img[^>]*?\balt="([^"]*)"[^>]*?\bsrc="([^"]+)"[^>]*>/gi, "![$1]($2)");
  s = s.replace(/<img[^>]*?\bsrc="([^"]+)"[^>]*>/gi, "![]($1)");
  s = s.replace(/<a[^>]*?\bhref="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (_m, href, txt) =>
    `[${txt.replace(/<[^>]+>/g, "").trim()}](${href})`,
  );

  // inline emphasis
  s = s.replace(/<(strong|b)>([\s\S]*?)<\/\1>/gi, "**$2**");
  s = s.replace(/<(em|i)>([\s\S]*?)<\/\1>/gi, "*$2*");

  // headings
  s = s.replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi, (_m, lvl, txt) =>
    `\n\n${"#".repeat(Number(lvl))} ${txt.replace(/<[^>]+>/g, "").trim()}\n\n`,
  );

  // list items
  s = s.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_m, txt) =>
    `\n- ${txt.replace(/<[^>]+>/g, "").trim()}`,
  );

  // blockquotes
  s = s.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_m, txt) =>
    `\n> ${txt.replace(/<[^>]+>/g, "").trim()}\n`,
  );

  // block breaks
  s = s.replace(/<\/(p|div|section|ul|ol|tr|table|h[1-6])>/gi, "\n\n");
  s = s.replace(/<br\s*\/?>/gi, "\n");
  s = s.replace(/<hr\s*\/?>/gi, "\n\n---\n\n");

  // strip whatever tags remain
  s = s.replace(/<[^>]+>/g, "");
  s = decodeEntities(s);

  // tidy
  s = s.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").replace(/[ \t]{2,}/g, " ");
  return s.trim();
}

/** Clean a raw post_content string into HTML + Markdown + referenced images. */
export function cleanContent(raw: string): CleanedContent {
  if (!raw || !raw.trim()) return { html: "", markdown: "", images: [] };

  let s = raw;
  s = s.replace(/<!--\s*\/?wp:[\s\S]*?-->/g, ""); // Gutenberg delimiters
  s = stripFusion(s);
  s = s.replace(/\[\/?[a-zA-Z0-9_]+[^\]]*\]/g, " "); // flatten remaining shortcodes
  s = rewriteUrls(s);
  s = s.replace(/(\r\n|\r|\n){3,}/g, "\n\n").trim();

  const images: string[] = [];
  const imgRe = /<img[^>]+src="([^"]+)"/gi;
  let m: RegExpExecArray | null;
  while ((m = imgRe.exec(s)) !== null) images.push(m[1]);

  return { html: s, markdown: htmlToMarkdown(s), images };
}
