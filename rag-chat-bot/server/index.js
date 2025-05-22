import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import {
  RunnablePassthrough,
  RunnableSequence,
} from "@langchain/core/runnables";
import express from "express";
import "dotenv/config";
import cors from "cors";

import { formatDocuments } from "./utils/formatDocs.js";
import { retriever } from "./utils/retriever.js";


const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// LLM
const llm = new ChatOpenAI({
  openAIApiKey: process.env.OPENAI_KEY,
  temperature: 0.1
});

const standaloneQuestionTemplate = `Given some conversation history (if any) and a question, convert it to a standalone question.
conversation history: {conv_history} 
question: {question} 
standalone question:`;
const standaloneQuestionPrompt = PromptTemplate.fromTemplate(standaloneQuestionTemplate);

// PROMPT
const answerTemplate = `You are a helpful and professional customer service assistant for a company called Webox. Your job is to answer customer questions using only the information provided in the context. If the answer to the question is not found in the context, respond with: "I'm not sure about what you're asking, please contact our customer service team at support@accompany.com or call 1-800-ACCOMPANY. Thank you." Do not guess or provide inaccurate information.Use three sentences maximum and keep the answer as concise as possible. 

context: {context}

question: {question}

Answer:
`;

// Create prompt instances
const answerPrompt = PromptTemplate.fromTemplate(answerTemplate);

// Create the RAG chain
const standaloneQuestionChain = RunnableSequence.from([
  standaloneQuestionPrompt,
  llm,
  new StringOutputParser()
]);


// Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { question, conv_history = "" } = req.body;

    if (!question) {
      return res.status(400).json({ error: "Question is required" });
    }

    console.log("Received question:", question);
    console.log("Conversation history:", conv_history);

    // Get standalone question
    const standaloneQuestion = await standaloneQuestionChain.invoke({
      question,
      conv_history
    });

    // Retrieve relevant documents
    const retrievedDocs = await retriever.invoke(standaloneQuestion);
    const context = formatDocuments(retrievedDocs);

    // Generate answer
    const answer = await RunnableSequence.from([
      answerPrompt,
      llm,
      new StringOutputParser()
    ]).invoke({
      context,
      question
    });

    console.log("Generated answer:", answer);

    // Send response
    res.json({
      answer,
      context,
      standaloneQuestion
    });

  } catch (error) {
    console.error('Error processing chat request:', error);
    res.status(500).json({
      error: "An error occurred while processing your request",
      details: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});


// const retrieverChain = RunnableSequence.from([
//   // Extract the standalone question from the previous result
//   prevResult => prevResult.standalone_question,
//   retriever,
//   formatDocuments
// ]);

// // The answer chain
// const answerChain = RunnableSequence.from([
//   answerPrompt,
//   llm,
//   new StringOutputParser()
// ]);

// // Create the RAG chain properly
// const chain = RunnableSequence.from([
//   {
//     standalone_question: standaloneQuestionChain,
//     original_input: new RunnablePassthrough()
//   },
//   {
//     context: retrieverChain,
//     // Extract the question from the original input
//     question: ({ original_input }) => original_input.question,
//     conv_history: ({ original_input }) => original_input.conv_history
//   },
//   answerChain
// ]);

// // Define sample conversation history (empty string if no history)
// const convHistory = "";

// const question = "Where are you located?";

// // Function to format conversation history (can be enhanced later)
// const formatConvHistory = (history) => {
//   return history || ""; // Return empty string if history is undefined/null
// };

// // Invoke the chain with both question and conv_history
// const response = await chain.invoke({
//   question: question,
//   conv_history: formatConvHistory(convHistory)
// });

// console.log("Response:", response);