import { type Segment, getMusicContent } from "~/utils/GPT/GPT";
import { textoSpeech } from "../ttsFunc";
import type { User } from "../getUserData";
import { runLLM, type model } from "~/utils/GPT/langchain";

enum GPTStyle {
  Default = "Default",
  Professional = "Professional",
  Slack = "Slack",
}

export const createTransition = async (
  from: Segment,
  to: Segment,
  user: User,
): Promise<Segment> => {
  console.log("create transition");

  const requestMessage =
    "Your previous segment was" +
    segmentDescription(from, false) +
    ", the next segment is " +
    segmentDescription(to) +
    " . Create a suitable and short transition between the two segments.";

  return new Promise<Segment>((resolve, reject) => {
    request(requestMessage, user)
      .then(async (answer) => {
        const speech = await textoSpeech(answer, "transition");
        resolve({
          segmentKind: "transition",
          content: {
            content: speech,
          },
        });
      })
      .catch((error) => {
        reject(error);
      });
  });
};

export const createNewsSummary = async (
  news: string,
  title: string,
  user: User,
): Promise<Segment> => {
  console.log("create news summary");
  const requestMessage = "Create a summary for the following news: " + news;

  return new Promise<Segment>((resolve, reject) => {
    request(requestMessage, user)
      .then(async (answer) => {
        const speech = await textoSpeech(answer, "news");
        resolve({
          segmentKind: "news",
          content: {
            content: speech,
            title: title,
          },
        });
      })
      .catch((error) => {
        reject(error);
      });
  });
};

export const createStart = async (
  to: Segment,
  user: User,
): Promise<Segment> => {
  console.log("create start");
  const requestMessage =
    "News-lee-fy starts to air and you are the moderator. First, introduce yourself and the station and then create a suitable and short transition to " +
    segmentDescription(to) +
    "use a maximum of 3 sentences.";

  return new Promise<Segment>((resolve, reject) => {
    request(requestMessage, user)
      .then(async (answer) => {
        const speech = await textoSpeech(answer, "transition");
        resolve({
          segmentKind: "transition",
          content: {
            content: speech,
          },
        });
      })
      .catch((error) => {
        reject(error);
      });
  });
};

const request = async (requestMessage: string, user: User) => {
  let model: model;
  if (user.ai == "OpenAI") {
    model = "openAI";
  } else {
    model = "gemini";
  }

  console.log("sending request using model: " + model);
  const completion = await runLLM(systemMessage(user), requestMessage, model);
  return completion;
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

const systemMessage = (user: User) => {
  let content: string;
  switch (user.hostStyle) {
    case GPTStyle.Professional.valueOf():
      console.log("using professional style");
      content = professionalSystemMessage + userDescription(user);
      break;
    case GPTStyle.Slack.valueOf():
      console.log("using slack style");
      content = slackSystemMessage + userDescription(user);
      break;
    default:
      console.log("using default style");
      content = defaultSystemMessage + userDescription(user);
      break;
  }

  return content;
};

const userDescription = (user: User) => {
  const name = "The name of your listener is " + user.name + ". ";
  const age = "Your listener is " + user.age + " years old. ";
  const state =
    "Your listener lives in the German state of " + user.state + ". ";
  const interests =
    "Your listener stated the following interests: " + user.categories;
  return name + age + state + interests;
};

const instructions =
  "Your output should always be spoken content only. Make sure to never use any kind of comments, instructions, stage directions or editorial notes like for example *song begins to play* or [News-lee-fy's signature jingle plays] in your output but only spoken language! If you include such kind of comments the radio station will have to close and many people will loose their jobs! The language of your program is English.";

const defaultSystemMessage =
  "You are News-lee-fy, the moderator of a radio station that broadcast specifically to only one listener. While always being truthful, you captivate with your funny jokes, witty remarks and rhetorical elements." +
  instructions;
const professionalSystemMessage =
  "You are News-lee-fy, the moderator of a radio station that broadcast specifically to only one listener. You take your job very seriously and have no time to joke around. Instead you try to be as professional as possible and only report on the news and introduce upcoming songs. Try to match the style of news-based radio station." +
  instructions;
const slackSystemMessage =
  "You are News-lee-fy, the moderator of a radio station that broadcast specifically to only one listener. Your highest priority is to entertain the listener through jokes, rhetorical elements and a slack style. Think of yourself as being a young adult who likes to provoke thoughts but also sometimes whips up feelings. As long as you don't lie and it's not overly offensive, everything's allowed." +
  instructions;
