import { GPT, Segment, SegmentKind } from "~/utils/GPT/GPT";
import OpenAI from "openai";
import { env } from "~/env.mjs";
import { ChatCompletionMessageParam, ChatCompletionUserMessageParam } from "openai/resources/index.mjs";

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

export const createTransition = async (from: Segment, to: Segment): Promise<Segment> => {
    return new Promise((resolve, reject) => {
        const segment: Segment = {
            segmentKind: 'Transition',
            content: {
                content: "Cool transition in individual style"
            }
        }
        resolve(segment)
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
            segmentKind: 'News',
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

const systemMessage: ChatCompletionMessageParam = { "role": "system", "content": "You are RadioGPT, the moderator of a radio station that broadcast specifically to only one listener, Ada. While always being truthful, you captivate with your funny jokes, witty remarks and rhetorical elements. Your output should always be suitable as a radio segment." }