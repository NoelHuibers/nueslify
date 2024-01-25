import { type Segment, getMusicContent } from "~/utils/GPT/GPT";
import OpenAI from "openai";
import { env } from "~/env.mjs";
import type {
  ChatCompletionMessageParam,
  ChatCompletionUserMessageParam,
} from "openai/resources/index.mjs";

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

enum GPTStyle {
  Default,
  Professional,
  Slack
}

const selectedStyle: GPTStyle = GPTStyle.Slack

export const createTransition = async (
  from: Segment,
  to: Segment,
): Promise<Segment> => {
  console.log("create transition");
  const requestMessage: ChatCompletionUserMessageParam = {
    role: "user",
    content:
      "Your previous segment was" +
      segmentDescription(from, false) +
      ", the next segment is " +
      segmentDescription(to) +
      " . Create a suitable and short transition between the two segments.",
  };
  return request(requestMessage).then((answer) => {
    console.log("received answer:", answer);
    return {
      segmentKind: "transition",
      content: {
        content: answer?.message.content
          ? answer?.message.content
          : "Next up: " + segmentDescription(to),
      },
    };
  });
};

export const createNewsSummary = async (news: string): Promise<Segment> => {
  console.log("create news summary");
  const requestMessage: ChatCompletionUserMessageParam = {
    role: "user",
    content: "Create a summary for the following news: " + news,
  };

  return request(requestMessage).then((answer) => {
    console.log("received answer:", answer);
    return {
      segmentKind: "news",
      content: {
        content: answer?.message.content
          ? answer?.message.content
          : "News are currently not available",
      },
    };
  });
};

export const createStart = async (to: Segment): Promise<Segment> => {
  console.log("create start");
  const requestMessage: ChatCompletionUserMessageParam = {
    role: "user",
    content:
      "RadioGPT starts to air and you are the moderator. First, introduce yourself and the station and then create a suitable and short transition to " +
      segmentDescription(to),
  };

  return request(requestMessage).then((answer) => {
    console.log("received answer:", answer);
    return {
      segmentKind: "transition",
      content: {
        content: answer?.message.content
          ? answer?.message.content
          : "Next up: " + segmentDescription(to),
      },
    };
  });
};

const request = async (requestMessage: ChatCompletionMessageParam) => {
  const completion = await openai.chat.completions.create({
    messages: [systemMessage(selectedStyle), requestMessage],
    model: "gpt-3.5-turbo",
  });
  return completion.choices[0];
};

const segmentDescription = (segment: Segment, isNext = true) => {
  if (segment.segmentKind === "music") {
    const content = getMusicContent(segment)!;
    const song = (isNext ? content[0] : content[content.length - 1])!;
    return 'the song "' + song.title + '" by ' + song.artistNames.toString();
  } else if (segment.segmentKind === "news") {
    return "a news report";
  } else {
    return "a radio segment";
  }
};

const systemMessage = (style: GPTStyle): ChatCompletionMessageParam => {
  let content: string
  switch (style) {
    case GPTStyle.Professional:
      content = professionalSystemMessage;
      break;
    case GPTStyle.Slack:
      content = slackSystemMessage;
      break;
    default:
      content = defaultSystemMessage;
      break;
  }

  return {
    role: "system",
    content: content
  }
};

const defaultSystemMessage = "You are RadioGPT, the moderator of a radio station that broadcast specifically to only one listener. While always being truthful, you captivate with your funny jokes, witty remarks and rhetorical elements. Your output should always be suitable as a radio segment, that later gets converted with OpenAIs TTS into a listenable audio file."
const professionalSystemMessage = "You are RadioGPT, the moderator of a radio station that broadcast specifically to only one listener. You take your job very seriously and have no time to joke around. Instead you try to be as professional as possible and only report on the news and introduce upcoming songs. Try to match the style of news-based radio station. Your output should always be suitable as a radio segment, that later gets converted with OpenAIs TTS into a listenable audio file."
const slackSystemMessage = "You are RadioGPT, the moderator of a radio station that broadcast specifically to only one listener. Your highest priority is to entertain the listener through jokes, rhetorical elements and a slack style. Think of yourself as being a young adult who likes to provoke thoughts but also sometimes whips up feelings. As long as you don't lie and it's not overly offensive, everything's allowed . Your output should always be suitable as a radio segment, that later gets converted with OpenAIs TTS into a listenable audio file."