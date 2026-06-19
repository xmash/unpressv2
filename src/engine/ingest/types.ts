// The ingest layer turns any supported WordPress backup container into a flat
// list of files, so the recovery engine never needs to know which format the
// bytes came from. Adding a new format = adding one adapter that emits
// FileEntry[]; nothing downstream changes.

export interface FileEntry {
  /** POSIX path relative to the archive root — no leading "./" or "/". */
  path: string;
  /** Raw bytes. Adapters return subarray views where possible (no copy). */
  data: Uint8Array;
}

export type ArchiveFormat =
  | "wpress" // All-in-One WP Migration
  | "zip" // UpdraftPlus, Duplicator, BackWPup, cPanel, manual wp-content
  | "tar" // host / reseller backups
  | "gzip" // .tar.gz / .sql.gz (wrapper around tar or sql)
  | "sql" // bare database dump
  | "wxr" // WordPress Tools → Export (.xml)
  | "unknown";

export interface IngestResult {
  format: ArchiveFormat;
  /** Files for the (first) detected site. */
  files: FileEntry[];
  /**
   * How many WordPress installs were detected in the container. Always 1 today;
   * reserved for multi-site host backups (one .tar.gz holding many sites).
   */
  siteCount: number;
}

/** Thrown for formats we recognize but don't unpack yet — lets the UI show a
 * specific "coming soon" message instead of a generic failure. */
export class UnsupportedFormatError extends Error {
  readonly format: ArchiveFormat;
  constructor(format: ArchiveFormat) {
    const label =
      format === "unknown"
        ? "that file"
        : `${format.toUpperCase()} backups`;
    super(`Unpress can't open ${label} yet — for now, drop a .wpress backup.`);
    this.name = "UnsupportedFormatError";
    this.format = format;
  }
}
