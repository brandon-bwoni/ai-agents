import { PineconeStore } from "@langchain/pinecone";
import { OpenAIEmbeddings } from "@langchain/openai";
import { Pinecone } from "@pinecone-database/pinecone";
import "dotenv/config";

// Initialize Pinecone client
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});

// Initialize OpenAI embeddings
const embeddings = new OpenAIEmbeddings({
  model: "text-embedding-3-small",
  openAIApiKey: process.env.OPENAI_KEY,
});

const indexName = "customer-bot";

// Define vectorStore before using it
let vectorStore;

// Create vectorStore retriever function
async function createRetriever() {
  try {
    // Get Pinecone index
    const index = pinecone.Index(indexName);

    // Initialize vector store
    vectorStore = await PineconeStore.fromExistingIndex(
      embeddings,
      {
        pineconeIndex: index,
        namespace: "customer-bot-namespace",
        textKey: "text",
      }
    );

    console.log("Successfully connected to Pinecone vector store");

    // Create and return retriever
    const retriever = vectorStore.asRetriever({
      k: 3, // Number of documents to retrieve
    });

    return retriever;
  } catch (error) {
    console.error("Error creating retriever:", error);
    throw error;
  }
}

// Create the retriever
const retriever = await createRetriever();

// Export both the retriever and vectorStore
export { retriever, vectorStore };