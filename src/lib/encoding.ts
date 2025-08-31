// Lightweight mojibake repair helpers for client/runtime usage
// For external files/APIs, the server endpoint /api/encoding/convert uses chardet + iconv-lite.

function looksMojibake(s: string): boolean {
  // Patterns of common mojibake: Ã (U+00C3), Â (U+00C2), ðŸ (UTF-8 emoji seen as Latin1), � (U+FFFD)
  return /\u00C3|\u00C2|\u00F0\u0178|\uFFFD/.test(s);
}

function latin1ToUtf8(s: string): string {
  try {
    // Treat each code unit as a byte (latin1) and decode as UTF-8
    // Using TextDecoder yields better perf/size than bringing iconv to client
    const bytes = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i) & 0xff;
    return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  } catch {
    try {
      // Fallback legacy hack
      // eslint-disable-next-line no-restricted-globals
      return decodeURIComponent(escape(s));
    } catch {
      return s;
    }
  }
}

function scoreMojibake(s: string): number {
  let score = 0;
  (s.match(/\u00C3./g) || []).forEach(() => (score += 2));
  (s.match(/\u00C2/g) || []).forEach(() => (score += 1));
  (s.match(/\u00F0\u0178/g) || []).forEach(() => (score += 3));
  (s.match(/\uFFFD/g) || []).forEach(() => (score += 4));
  return score;
}

export function fixMojibake(s: string): string {
  if (!looksMojibake(s)) return s;
  const v1 = latin1ToUtf8(s);
  if (scoreMojibake(v1) < scoreMojibake(s)) return v1;
  // Common single-char cleanups
  return s.replace(/\u00C2(?=\S)/g, "");
}

export function deepFixMojibake<T>(value: T): T {
  if (value == null) return value;
  if (typeof value === "string") return fixMojibake(value) as unknown as T;
  if (Array.isArray(value)) return (value as any).map(deepFixMojibake) as unknown as T;
  if (typeof value === "object") {
    const out: any = Array.isArray(value) ? [] : {};
    for (const [k, v] of Object.entries(value as any)) out[k] = deepFixMojibake(v);
    return out as T;
  }
  return value;
}
