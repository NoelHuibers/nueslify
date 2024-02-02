export interface GPT {
  createTransition(from: Segment, to: Segment): Promise<Segment>;
  createNewsSummary(news: string): Promise<Segment>;
}

export type Segment = {
  segmentKind: "music" | "news" | "transition";
  content: Music[] | News | Transition;
};

export type Music = {
  title?: string;
  artistNames: string[];
  id: string;
};

export type News = {
  content: string;
};

export type Transition = {
  content: string;
};

function isMusic(segment: Segment): segment is Segment & { content: Music[] } {
  return segment.segmentKind === "music";
}

export function getMusicContent(segment: Segment): Music[] | null {
  if (isMusic(segment)) {
    return segment.content as Music[];
  }
  return null;
}

export type Interest =
  | "inland"
  | "ausland"
  | "wirtschaft"
  | "investigativ"
  | "sport";
