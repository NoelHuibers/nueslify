/** Markdown emphasis (`**bold**`, `__bold__`) wraps real words; unwrap it before removing stage directions. */
const MARKDOWN_BOLD = /(\*\*|__)(.+?)\1/g;
const STAGE_DIRECTION_ASTERISK = /\*[^*\n]{1,80}\*/g;
const STAGE_DIRECTION_BRACKET = /\[[^\]\n]{1,80}\]/g;
/** Short parentheticals such as "(laughs)" or "(music fades in)"; longer ones are kept as content. */
const STAGE_DIRECTION_PAREN = /\((?:\s*[\p{L}-]+){1,4}\s*\)/gu;
const SPEAKER_LABEL = /^\s*(?:host|moderator|news-lee-fy|nüslify|newsleefy|narrator)\s*:\s*/gim;
const MARKDOWN = /(?:^#{1,6}\s+|[*_`~]+|^\s*[-•]\s+|^\s*\d+\.\s+)/gm;
const EMOJI = /\p{Extended_Pictographic}/gu;
const WRAPPING_QUOTES = /^["“„'](.*)["”'“]$/s;

/** Makes model output safe to hand to a TTS voice. */
export function sanitizeForSpeech(text: string, maxLength = 2000): string {
  let result = text
    .replace(MARKDOWN_BOLD, "$2")
    .replace(STAGE_DIRECTION_ASTERISK, " ")
    .replace(STAGE_DIRECTION_BRACKET, " ")
    .replace(STAGE_DIRECTION_PAREN, " ")
    .replace(SPEAKER_LABEL, "")
    .replace(MARKDOWN, "")
    .replace(EMOJI, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .replace(/ ([,.!?;:])/g, "$1")
    .trim();

  const quoted = WRAPPING_QUOTES.exec(result);
  if (quoted?.[1] && !quoted[1].includes('"')) {
    result = quoted[1].trim();
  }

  if (result.length > maxLength) {
    const cut = result.slice(0, maxLength);
    const sentenceEnd = Math.max(
      cut.lastIndexOf(". "),
      cut.lastIndexOf("! "),
      cut.lastIndexOf("? "),
    );
    result = sentenceEnd > maxLength / 2 ? cut.slice(0, sentenceEnd + 1) : cut;
  }
  return result;
}
