const RANGE_HEADER = /^bytes=(\d*)-(\d*)$/;

/** Parses a single-range `Range: bytes=start-end` header. Multi-range requests are not supported. */
export function parseRange(
  header: string | null,
  size: number,
): { start: number; end: number } | "invalid" | null {
  if (!header) {
    return null;
  }
  const match = RANGE_HEADER.exec(header.trim());
  if (!match) {
    return "invalid";
  }
  const [, rawStart = "", rawEnd = ""] = match;
  if (rawStart === "" && rawEnd === "") {
    return "invalid";
  }
  let start: number;
  let end: number;
  if (rawStart === "") {
    const suffix = Number(rawEnd);
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number(rawStart);
    end = rawEnd === "" ? size - 1 : Math.min(Number(rawEnd), size - 1);
  }
  if (start > end || start >= size) {
    return "invalid";
  }
  return { start, end };
}

export function audioContentType(key: string): string {
  return key.endsWith(".wav") ? "audio/wav" : "audio/mpeg";
}

/** Constant-time comparison for shared secrets. */
export function safeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const left = encoder.encode(a);
  const right = encoder.encode(b);
  let diff = left.length ^ right.length;
  for (let i = 0; i < Math.max(left.length, right.length); i += 1) {
    diff |= (left[i] ?? 0) ^ (right[i] ?? 0);
  }
  return diff === 0;
}
