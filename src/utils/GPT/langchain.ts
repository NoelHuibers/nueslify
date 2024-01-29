import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { env } from "~/env.mjs";

type model = "openAI" | "gemini";

const prompt = ChatPromptTemplate.fromMessages([
  ["system", "You are Nueslify, a radio host"],
  ["human", "{input}"],
]);

const runLLM = async (content: string, model: model) => {
  let chatModel: ChatOpenAI | ChatGoogleGenerativeAI;

  if (model == "openAI") {
    chatModel = new ChatOpenAI({
      openAIApiKey: env.OPENAI_API_KEY,
    });
  } else if (model == "gemini") {
    chatModel = new ChatGoogleGenerativeAI({
      apiKey: env.GOOGLE_API_KEY,
    });
  } else {
    chatModel = new ChatOpenAI({
      openAIApiKey: env.OPENAI_API_KEY,
    });
  }

  const outputParser = new StringOutputParser();
  const llmChain = prompt.pipe(chatModel).pipe(outputParser);

  const res = await llmChain.invoke({
    input: content,
  });

  console.log(res);

  return res;
};

export default runLLM;
