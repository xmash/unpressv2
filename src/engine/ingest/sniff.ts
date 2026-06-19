import type { ArchiveFormat } from "./types";

const td = new TextDecoder("utf-8", { fatal: false });

/** Decode the first `n` bytes as text for content sniffing. */
function head(bytes: Uint8Array, n = 2048): string {
  return td.decode(bytes.subarray(0, Math.min(n, bytes.length)));
}

/** tar stores the magic "ustar" at offset 257 of the first 512-byte header. */
function isTar(b: Uint8Array): boolean {
  if (b.length < 263) return false;
  return (
    b[257] === 0x75 && // u
    b[258] === 0x73 && // s
    b[259] === 0x74 && // t
    b[260] === 0x61 && // a
    b[261] === 0x72 //   r
  );
}

/**
 * Identify a backup container from its bytes (and filename as a tiebreaker).
 * `.wpress` has no magic number, so the extension is authoritative for it;
 * everything else is detected by magic bytes first, then content, then name.
 */
export function sniffFormat(bytes: Uint8Array, filename = ""): ArchiveFormat {
  const name = filename.toLowerCase();
  if (name.endsWith(".wpress")) return "wpress";

  const b = bytes;
  // ZIP: "PK\x03\x04" (also \x05\x06 empty, \x07\x08 spanned).
  if (b.length >= 4 && b[0] === 0x50 && b[1] === 0x4b && (b[2] === 0x03 || b[2] === 0x05 || b[2] === 0x07)) {
    return "zip";
  }
  // gzip: 0x1f 0x8b — could wrap a tar (.tar.gz) or a sql dump (.sql.gz);
  // the gzip adapter decompresses one layer then re-sniffs.
  if (b.length >= 2 && b[0] === 0x1f && b[1] === 0x8b) return "gzip";
  if (isTar(b)) return "tar";

  const text = head(b).toLowerCase();
  // WXR is an RSS/XML feed with the WordPress export namespace.
  if (text.includes("xmlns:wp=") || text.includes("<wp:") || (text.includes("<rss") && text.includes("<?xml"))) {
    return "wxr";
  }
  // Raw SQL dump.
  if (text.includes("mysql dump") || /create table|insert into|drop table/.test(text)) {
    return "sql";
  }

  // Fall back to extension when bytes were inconclusive.
  if (name.endsWith(".zip")) return "zip";
  if (name.endsWith(".tar")) return "tar";
  if (name.endsWith(".gz") || name.endsWith(".tgz")) return "gzip";
  if (name.endsWith(".sql")) return "sql";
  if (name.endsWith(".xml") || name.endsWith(".wxr")) return "wxr";
  return "unknown";
}
