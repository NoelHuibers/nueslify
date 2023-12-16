import {GPT, Segment, SegmentKind} from "~/utils/GPT/GPT";
import OpenAI from "openai";
import {env} from "~/env.mjs";

const openai = new OpenAI({apiKey: env.OPENAI_API_KEY});

export class OpenAIGPT implements GPT {
    async createNewsSummary(news: string): Promise<Segment> {
        console.log("create news summary")
        return this.request().then(answer => {
            console.log("received answer:", answer)
            return {
                duration: 1000,
                segmentKind: SegmentKind.News,
                title: "Daily News Summary",
                binaryString: answer?.message.content
            }
        })
    }

    async createTransition(from: Segment, to: Segment): Promise<Segment> {
        return new Promise((resolve, reject) => {
            const segment: Segment = {
                duration: 250,
                segmentKind: SegmentKind.Transition,
                title: "A nice transition"
            }
            resolve(segment)
        });
    }

    async request() {
        const completion = await openai.chat.completions.create({
            messages: [{role: "system", content: "You are a helpful assistant"}],
            model: "gpt-3.5-turbo"
        })
        return completion.choices[0]
    }
}