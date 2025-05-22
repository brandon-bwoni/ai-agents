import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { DocxLoader } from "@langchain/community/document_loaders/fs/docx";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { OpenAIEmbeddings } from "@langchain/openai";
import "dotenv/config";

// Configuration
const pdfFilePath = "./company_doc.pdf";

// Initialize loaders
const pdfLoader = new PDFLoader(pdfFilePath, {
  parsedItemSeparator: "",
});

async function processPdfDocuments() {
  try {
    // Load the PDF file
    console.log("Loading PDF document...");
    const pdfDocs = await pdfLoader.load();
    console.log(`Loaded ${pdfDocs.length} documents from PDF`);

    // Validate document content
    const validDocs = pdfDocs.map(doc => {
      if (typeof doc.pageContent !== 'string') {
        doc.pageContent = String(doc.pageContent || '');
      }
      return doc;
    });

    // Split the document into smaller chunks
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 200,
      chunkOverlap: 0,
    });

    // Use validDocs instead of raw pdfDocs
    const docs = await textSplitter.splitDocuments(validDocs);
    console.log(`Created ${docs.length} document chunks`);

    // Initialize embedding model
    const embeddings = new OpenAIEmbeddings({
      model: "text-embedding-3-small",
      openAIApiKey: process.env.OPENAI_KEY,
    });

    // Extract text content for embedding
    const textContents = docs.map(doc => doc.pageContent);

    // Generate embeddings for the text content
    console.log("Generating embeddings...");
    const embeddingVectors = await embeddings.embedDocuments(textContents);
    console.log(`Generated embeddings for ${embeddingVectors.length} chunks`);

    // Combine docs with their embeddings
    const embeddedDocs = docs.map((doc, i) => ({
      ...doc,
      embedding: embeddingVectors[i]
    }));

    return { docs, embeddedDocs };
  } catch (error) {
    console.error("Error processing PDF documents:", error);
    throw error;
  }
}

// Process the documents and export the results
const { docs, embeddedDocs } = await processPdfDocuments();
export { docs, embeddedDocs };