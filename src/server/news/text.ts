const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ndash: "–",
  mdash: "—",
  hellip: "…",
  bdquo: "„",
  ldquo: "“",
  rdquo: "”",
  sbquo: "‚",
  lsquo: "‘",
  rsquo: "’",
  auml: "ä",
  ouml: "ö",
  uuml: "ü",
  Auml: "Ä",
  Ouml: "Ö",
  Uuml: "Ü",
  szlig: "ß",
  euro: "€",
};

export const MAX_BODY_LENGTH = 6000;

const ENTITY = /&(#x[\da-f]+|#\d+|[a-z]+);/gi;
const TAG = /<[^>]*>/g;
const WHITESPACE = /\s+/g;

export function decodeEntities(input: string): string {
  return input.replace(ENTITY, (match, entity: string) => {
    if (entity.startsWith("#x") || entity.startsWith("#X")) {
      return String.fromCodePoint(Number.parseInt(entity.slice(2), 16));
    }
    if (entity.startsWith("#")) {
      return String.fromCodePoint(Number.parseInt(entity.slice(1), 10));
    }
    return NAMED_ENTITIES[entity] ?? match;
  });
}

/** Converts a tagesschau HTML fragment to a single line of plain text. */
export function htmlToText(html: string): string {
  return decodeEntities(html.replace(TAG, " ")).replace(WHITESPACE, " ").trim();
}

/** Lines such as "Das Erste | tagesthemen | 16.10.2026 | 21:45 Uhr" reference broadcasts, not content. */
const BROADCAST_REFERENCE = /\|\s*\d{2}\.\d{2}\.\d{4}/;

export function isBroadcastReference(text: string): boolean {
  return BROADCAST_REFERENCE.test(text);
}

/** Cuts text at a paragraph or sentence boundary so prompts stay small. */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  const slice = text.slice(0, maxLength);
  const boundary = Math.max(slice.lastIndexOf("\n\n"), slice.lastIndexOf(". "));
  return (boundary > maxLength / 2 ? slice.slice(0, boundary + 1) : slice).trim();
}
