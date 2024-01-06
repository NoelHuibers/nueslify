export interface GPT {
    createTransition(from: Segment, to: Segment): Promise<Segment>;
    createNewsSummary(news: string): Promise<Segment>;
}

export type Segment = {
    segmentKind: SegmentKind,
    title: string,
    duration: number,
    url?: URL,
    binaryString?: string | null
}

export enum SegmentKind {
    News,
    Music,
    Transition
}

export enum Interest {
    Technology = "technology",
    Science = "science",
    Business = "business",
    Entertainment = "entertainment",
    Health = "health",
    Sports = "sports"
}
