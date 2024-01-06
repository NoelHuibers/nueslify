import { Segment, getMusicContent } from "~/utils/GPT/GPT";
import OpenAI from "openai";
import { env } from "~/env.mjs";
import { ChatCompletionMessageParam, ChatCompletionUserMessageParam } from "openai/resources/index.mjs";

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

export const createTransition = async (from: Segment, to: Segment): Promise<Segment> => {
    console.log("create transition")
    const requestMessage: ChatCompletionUserMessageParam = {
        "role": "user",
        "content": "Your previous segment was" + segmentDescription(from) + ", the next segment is " + segmentDescription(to) + " . Create a suitable and short transition between the two segments."
    }
    return request(requestMessage).then(answer => {
        console.log("received answer:", answer)
        return {
            segmentKind: 'transition',
            content: {
                content: answer?.message.content ? answer?.message.content : "Next up: " + segmentDescription(to)
            }
        }
    });
}

export const createNewsSummary = async (news: string): Promise<Segment> => {
    console.log("create news summary")
    const requestMessage: ChatCompletionUserMessageParam = {
        "role": "user",
        "content": "Create a summary for the following news: " + news
    }

    return request(requestMessage).then(answer => {
        console.log("received answer:", answer)
        return {
            segmentKind: 'news',
            content: {
                content: answer?.message.content ? answer?.message.content : "News are currently not available"
            }
        }
    })
}

const request = async (requestMessage: ChatCompletionMessageParam) => {
    const completion = await openai.chat.completions.create({
        messages: [systemMessage, requestMessage],
        model: "gpt-3.5-turbo"
    })
    return completion.choices[0]
}

const segmentDescription = (segment: Segment) => {
    if (segment.segmentKind === "music") {
        const content = getMusicContent(segment)!
        const lastSong = content[content.length - 1]
        return "the song \"" + lastSong?.title + "\" by " + lastSong?.artistNames
    } else if (segment.segmentKind === "news") {
        return "a news report"
    } else {
        return "a radio segment"
    }
}

const systemMessage: ChatCompletionMessageParam = { "role": "system", "content": "You are RadioGPT, the moderator of a radio station that broadcast specifically to only one listener, Ada. While always being truthful, you captivate with your funny jokes, witty remarks and rhetorical elements. Your output should always be suitable as a radio segment." }