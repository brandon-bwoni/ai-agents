import { OpenAIEmbeddings } from "@langchain/openai";
import { Pinecone as PineconeClient } from "@pinecone-database/pinecone";
import "dotenv/config";
import { PineconeStore } from "@langchain/pinecone";
import { Document } from "@langchain/core/documents";

import { embeddedDocs } from "./dataRead.js";


const pinecone = new PineconeClient({
  apiKey: process.env.PINECONE_API_KEY,
  maxRetries: 5,
});

const embeddings = new OpenAIEmbeddings({
  model: "text-embedding-3-small",
  openAIApiKey: process.env.OPENAI_KEY,
});

const indexName = "customer-bot";

// Check if index exists before creating
const indexList = await pinecone.listIndexes();
console.log("Available indexes:", indexList);

// Check if index exists in the returned object
let indexExists = false;
if (indexList && indexList.indexes) {
  indexExists = indexList.indexes.some(index => index.name === indexName);
}

if (!indexExists) {
  await pinecone.createIndex({
    name: indexName,
    dimension: 1536,
    spec: {
      serverless: {
        cloud: 'aws',
        region: "us-east-1"
      },
    },
    waitUntilReady: true,
  });
  console.log("Pinecone index created");
} else {
  console.log("Pinecone index already exists");
}

// Get the index instance
const index = pinecone.index(indexName);


try {
  const index = pinecone.index(indexName);

  // Create a new vector store instance
  const vectorStore = await PineconeStore.fromExistingIndex(
    embeddings,
    {
      pineconeIndex: index,
      namespace: "customer-bot-namespace",
      textKey: "pageContent",
    }
  );

  console.log("Successfully connected to Pinecone vector store");

  console.log("Documents prepared for Pinecone:", embeddedDocs.length);

  // ADD THIS LINE HERE - Convert documents to have the text field
  const docsWithText = embeddedDocs.map(doc => ({
    ...doc,
    text: doc.pageContent,
  }));

  // Add documents to the vector store
  await vectorStore.addDocuments(docsWithText, {
    namespace: "customer-bot-namespace",
    textKey: "text",
  });
  console.log("Documents added successfully:", docsWithText.length);

  // Example query to test the connection
  const results = await vectorStore.similaritySearch("customer question", 3);
  console.log("Search results:", results);

} catch (error) {
  console.error("Error in Pinecone connection:", error);
  // Log more details about the error
  if (error.stack) {
    console.error("Error stack:", error.stack);
  }
}

// Wait for indexing to complete
console.log("Waiting for indexing to complete...");
await new Promise(resolve => setTimeout(resolve, 5000));

// Check index stats
const stats = await index.describeIndexStats();
console.log("Index stats:", stats);
console.log("Documents added to Pinecone index");


// Optional filter
const similaritySearchResults = await vectorStore.similaritySearch(
  "user-query",
  2,
);

for (const doc of similaritySearchResults) {
  console.log(`* ${doc.pageContent} [${JSON.stringify(doc.metadata, null)}]`);
}


export const retriever = vectorStore.asRetriever({
  filter: filter,
  k: 2, // number of results
});

await retriever.invoke("user-query");
