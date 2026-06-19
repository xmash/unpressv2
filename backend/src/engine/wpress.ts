// Reader for the All-in-One WP Migration `.wpress` archive format.
//
// Layout: repeating blocks of a 4377-byte header followed by raw file content.
//   header = name(255) + size(14) + mtime(12) + prefix(4096), each a
//   null-terminated ASCII string. A header of all-zero bytes marks EOF.
// Works identically on a Node Buffer or a browser File's ArrayBuffer — both are
// Uint8Array. We never copy content: each entry's `data` is a subarray view.

const HEADER = 4377;
const NAME = 255;
const SIZE = 14;
const MTIME = 12;
const PREFIX = 4096;

export interface WpressEntry {
  name: string;
  prefix: string;
  path: string;
  size: number;
  data: Uint8Array;
}

const decoder = new TextDecoder("utf-8");

function field(buf: Uint8Array, start: number, len: number): string {
  const sub = buf.subarray(start, start + len);
  let end = sub.indexOf(0);
  if (end === -1) end = sub.length;
  return decoder.decode(sub.subarray(0, end));
}

function isAllZero(buf: Uint8Array): boolean {
  for (let i = 0; i < buf.length; i++) {
    if (buf[i] !== 0) return false;
  }
  return true;
}

/** Lazily yield every file entry in the archive. */
export function* iterateWpress(bytes: Uint8Array): Generator<WpressEntry> {
  let off = 0;
  while (off + HEADER <= bytes.length) {
    const header = bytes.subarray(off, off + HEADER);
    if (isAllZero(header)) break;

    const name = field(header, 0, NAME);
    const sizeStr = field(header, NAME, SIZE).trim();
    const prefix = field(header, NAME + SIZE + MTIME, PREFIX).replace(/\\/g, "/");
    const size = sizeStr ? parseInt(sizeStr, 10) : 0;

    const dataStart = off + HEADER;
    const data = bytes.subarray(dataStart, dataStart + size);
    const path = prefix ? `${prefix}/${name}` : name;

    yield { name, prefix, path, size, data };
    off = dataStart + size;
  }
}
