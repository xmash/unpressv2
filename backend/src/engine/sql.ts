// Minimal MySQL-dump reader: just enough to pull rows out of WordPress
// `INSERT INTO` statements. mysqldump uses backslash escaping by default, which
// is what we decode here. Not a general SQL parser — it only walks VALUES tuples.

const ESCAPES: Record<string, string> = {
  n: "\n",
  r: "\r",
  t: "\t",
  b: "\b",
  "0": "\0",
  Z: "\x1a",
  "\\": "\\",
  "'": "'",
  '"': '"',
};

/** Detect the table prefix (e.g. `wp_`, `SERVMASK_PREFIX_`) from CREATE TABLE. */
export function detectPrefix(sql: string): string {
  const m = sql.match(/CREATE TABLE `([A-Za-z0-9_]*?)options`/);
  return m ? m[1] : "wp_";
}

/**
 * Yield every row of `INSERT INTO \`table\` VALUES (...),(...);` statements as
 * arrays of decoded string fields. NULLs become the empty string.
 */
export function* parseTableRows(sql: string, table: string): Generator<string[]> {
  const marker = "INSERT INTO `" + table + "`";
  let from = 0;
  let hit: number;
  while ((hit = sql.indexOf(marker, from)) !== -1) {
    const valuesAt = sql.indexOf("VALUES", hit);
    if (valuesAt === -1) break;
    const start = sql.indexOf("(", valuesAt);
    if (start === -1) break;

    const { rows, end } = parseValues(sql, start);
    for (const r of rows) yield r;
    from = end;
  }
}

function parseValues(sql: string, start: number): { rows: string[][]; end: number } {
  const rows: string[][] = [];
  const n = sql.length;
  let i = start;
  let depth = 0;
  let inStr = false;
  let row: string[] = [];
  let field = "";

  for (; i < n; i++) {
    const c = sql[i];
    if (inStr) {
      if (c === "\\") {
        const nx = sql[i + 1];
        field += ESCAPES[nx] ?? nx;
        i++;
      } else if (c === "'") {
        // doubled '' inside a string is an escaped quote
        if (sql[i + 1] === "'") {
          field += "'";
          i++;
        } else {
          inStr = false;
        }
      } else {
        field += c;
      }
      continue;
    }
    if (c === "'") {
      inStr = true;
    } else if (c === "(") {
      depth++;
      if (depth === 1) {
        row = [];
        field = "";
      }
    } else if (c === ",") {
      if (depth === 1) {
        row.push(field);
        field = "";
      }
    } else if (c === ")") {
      if (depth === 1) {
        row.push(field);
        rows.push(row);
      }
      depth--;
    } else if (c === ";" && depth === 0) {
      i++;
      break;
    } else if (depth === 1 && c !== "\n" && c !== "\r") {
      // unquoted token (numbers, NULL); whitespace between tuples ignored
      if (c !== " " || field.length > 0) field += c;
    }
  }
  // normalize bare NULL tokens to empty string
  for (const r of rows) {
    for (let k = 0; k < r.length; k++) if (r[k] === "NULL") r[k] = "";
  }
  return { rows, end: i };
}

/** Map a 2-column key/value table (options, postmeta-ish) into an object. */
export function keyValueTable(
  sql: string,
  table: string,
  cols: string[],
  keyCol: string,
  valCol: string,
): Record<string, string> {
  const ki = cols.indexOf(keyCol);
  const vi = cols.indexOf(valCol);
  const out: Record<string, string> = {};
  for (const r of parseTableRows(sql, table)) {
    if (r.length >= cols.length) out[r[ki]] = r[vi];
  }
  return out;
}

/** Map rows of a table into objects keyed by column name. */
export function rowsToObjects(
  sql: string,
  table: string,
  cols: string[],
): Record<string, string>[] {
  const out: Record<string, string>[] = [];
  for (const r of parseTableRows(sql, table)) {
    if (r.length < cols.length) continue;
    const o: Record<string, string> = {};
    for (let k = 0; k < cols.length; k++) o[cols[k]] = r[k];
    out.push(o);
  }
  return out;
}
