export interface GPT {
    createTransition(from: Segment, to: Segment): Promise<Segment>;
    createNewsSummary(news: string): Promise<Segment>;
}

export type Segment = {
    segmentKind: SegmentKind,
    content: Music[] | News | Transition
}

type Music = {
    title: string,
    artistNames: string[],
    id: Number
}

type News = {
    content: string
}

type Transition = {
    content: string
}

function isMusic(segment: Segment): segment is Segment & { content: Music[] } {
    return segment.segmentKind === "Music";
}

export function getMusicContent(segment: Segment): Music[] | null {
    if (isMusic(segment)) {
        return segment.content as Music[];
    }
    return null;
}

export type SegmentKind = 'News' | 'Music' | 'Transition'

export type Interest = 'technology' | 'science' | 'business' | 'entertainment' | 'health' | 'sports'