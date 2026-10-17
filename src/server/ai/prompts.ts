import type { HostStyle, Language } from "#/lib/domain.ts";

export type ListenerContext = {
  /** `null` for shared (non-personalised) segments. */
  name: string | null;
  language: Language;
  hostStyle: HostStyle;
  regionName: string | null;
  now: Date;
};

export type ItemContext =
  | { kind: "track"; name: string; artists: string[] }
  | { kind: "music"; count: number }
  | { kind: "story"; title: string; topline: string | null }
  | { kind: "nothing" };

export type StoryContext = {
  /** Outlet name, e.g. "tagesschau" or "BBC News". */
  source: string;
  title: string;
  topline: string | null;
  body: string;
  /** `false` when all we have is the outlet's teaser. */
  fullArticle: boolean;
  ressort: string | null;
  regionName: string | null;
  /** Other outlets' reports of the same event. */
  others: readonly { source: string; title: string; teaser: string | null }[];
};

export type ScriptRequest =
  | { kind: "intro"; next: ItemContext }
  | { kind: "bridge"; from: ItemContext; to: ItemContext }
  | { kind: "news"; story: StoryContext };

/** Spelled phonetically so every TTS voice pronounces the station name the same way. */
export const SPOKEN_STATION_NAME = "News-lee-fy";
export const TIME_ZONE = "Europe/Berlin";

const STYLE_PERSONA: Record<HostStyle, string> = {
  friendly:
    "You are warm and witty. You captivate with light humour and the occasional clever remark, but you are always truthful.",
  professional:
    "You are calm, precise and serious, in the style of a public-broadcasting news presenter. No jokes, no filler.",
  laidback:
    "You are relaxed and playful, like a young late-night host who likes to provoke a thought now and then. Never offensive, never untruthful.",
};

const LANGUAGE_NAME: Record<Language, string> = { en: "English", de: "German" };

export function partOfDay(
  date: Date,
  timeZone = TIME_ZONE,
): "morning" | "afternoon" | "evening" | "night" {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone }).format(date),
  );
  if (hour >= 5 && hour < 12) {
    return "morning";
  }
  if (hour >= 12 && hour < 18) {
    return "afternoon";
  }
  if (hour >= 18 && hour < 23) {
    return "evening";
  }
  return "night";
}

export function systemPrompt(listener: ListenerContext): string {
  const language = LANGUAGE_NAME[listener.language];
  const lines = [
    `You are the host of ${SPOKEN_STATION_NAME}, a personal radio show that broadcasts to exactly one listener.`,
    STYLE_PERSONA[listener.hostStyle],
    listener.name ? `Your listener is called ${listener.name}.` : null,
    listener.regionName ? `They live in ${listener.regionName}, Germany.` : null,
    `It is ${partOfDay(listener.now)} in Germany.`,
    `Speak ${language} only.`,
    "Everything you write is read aloud by a text-to-speech voice, so:",
    "- Output only the words to be spoken. No stage directions, sound effects, speaker labels, emojis, markdown, lists or headings.",
    "- Never write things like *music plays*, [jingle] or (laughs).",
    `- Always write the station name as "${SPOKEN_STATION_NAME}".`,
    "- Do not invent facts. Only use information given to you.",
  ];
  return lines.filter((line): line is string => line !== null).join("\n");
}

export function describeItem(item: ItemContext): string {
  switch (item.kind) {
    case "track":
      return `the song "${item.name}" by ${formatList(item.artists)}`;
    case "music":
      return item.count === 1
        ? "a song from the listener's favourites"
        : "some of the listener's favourite songs";
    case "story":
      return `a news report titled "${item.title}"${item.topline ? ` (${item.topline})` : ""}`;
    case "nothing":
      return "the end of the previous segment";
    default:
      return assertNever(item);
  }
}

export function userPrompt(request: ScriptRequest): string {
  switch (request.kind) {
    case "intro":
      return [
        "Open the show.",
        "Greet the listener by name in a way that fits the time of day, introduce yourself and the station,",
        `then lead into ${describeItem(request.next)}.`,
        "Use at most three short sentences.",
      ].join(" ");
    case "bridge":
      return [
        `The previous segment was ${describeItem(request.from)}.`,
        `The next segment is ${describeItem(request.to)}.`,
        "Write a short, natural radio transition between the two. One or two sentences.",
        request.to.kind === "story"
          ? "Do not summarise the news yet; it follows right after you."
          : null,
      ]
        .filter((line): line is string => line !== null)
        .join(" ");
    case "news":
      return newsPrompt(request.story);
    default:
      return assertNever(request);
  }
}

function newsPrompt(story: StoryContext): string {
  const others = story.others.map((other) => other.source);
  const attribution =
    others.length > 0
      ? `to ${story.source}, mentioning that ${formatList(others)} reported it too`
      : `to ${story.source}`;
  return [
    `Present the following ${story.source} report for radio.`,
    story.fullArticle
      ? "Summarise it in 4 to 6 sentences (about 45 seconds when spoken), neutral and factual."
      : "You only have the outlet's teaser: summarise it in 2 to 4 sentences, neutral and factual, and add nothing that isn't in the material below.",
    others.length > 0
      ? "Other outlets' reports of the same event follow the article. Use them only to confirm or complete the picture; if they contradict each other, say so briefly."
      : null,
    `End with one short line attributing the report ${attribution}.`,
    "Translate if necessary.",
    "",
    `Title: ${story.title}`,
    story.topline ? `Topic: ${story.topline}` : null,
    story.ressort ? `Section: ${story.ressort}` : null,
    story.regionName ? `Region: ${story.regionName}` : null,
    "",
    story.body,
    ...(story.others.length > 0 ? ["", "Also reported:"] : []),
    ...story.others.map(
      (other) => `- ${other.source}: ${other.title}${other.teaser ? ` — ${other.teaser}` : ""}`,
    ),
  ]
    .filter((line): line is string => line !== null)
    .join("\n");
}

const SPEECH_STYLE: Record<HostStyle, string> = {
  friendly: "Warm, upbeat radio host. Smile in your voice, lively but clear pacing.",
  professional: "Calm, authoritative newsreader. Even pacing, crisp articulation.",
  laidback: "Relaxed late-night radio host. Easy-going, conversational, slightly playful.",
};

export function speechInstructions(style: HostStyle, language: Language): string {
  return `${SPEECH_STYLE[style]} Speak ${LANGUAGE_NAME[language]} with natural pronunciation.`;
}

export function formatList(items: readonly string[]): string {
  if (items.length <= 1) {
    return items[0] ?? "";
  }
  return `${items.slice(0, -1).join(", ")} and ${items.at(-1) ?? ""}`;
}

function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${JSON.stringify(value)}`);
}
