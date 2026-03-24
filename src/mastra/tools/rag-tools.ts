import { createTool } from '@mastra/core/tools';
import { ModelRouterEmbeddingModel } from '@mastra/core/llm';
import { MDocument, createVectorQueryTool } from '@mastra/rag';
import { PgVector } from '@mastra/pg';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Shared vector store and embedder for RAG
// ---------------------------------------------------------------------------

const vectorStore = new PgVector({
  id: 'rag-vectors',
  connectionString: process.env.DATABASE_URL!,
});

const embedder = new ModelRouterEmbeddingModel({
  providerId: 'openrouter',
  modelId: 'openai/text-embedding-3-small',
  url: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY ?? process.env.OPENAI_API_KEY,
});

const KNOWLEDGE_INDEX = 'knowledge-base';
const EMBEDDING_DIMENSION = 1536;

// ---------------------------------------------------------------------------
// Tool: Ingest knowledge (text content)
// The agent calls this when the user shares information to remember long-term.
// ---------------------------------------------------------------------------

export const ingestKnowledgeTool = createTool({
  id: 'ingest-knowledge',
  description:
    'Store text content in the knowledge base for long-term retrieval. ' +
    'Use this when the user explicitly asks you to remember, save, or store information, ' +
    'documents, notes, or any content they want to retrieve later.',
  inputSchema: z.object({
    content: z.string().describe('The text content to store in the knowledge base'),
    title: z.string().describe('A short descriptive title for this knowledge entry'),
    tags: z
      .string()
      .optional()
      .describe('Comma-separated tags for categorization (e.g. "project,idea,reference")'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    chunksStored: z.number(),
    message: z.string(),
  }),
  execute: async ({ content, title, tags }) => {
    // Ensure index exists (idempotent)
    const indexes = await vectorStore.listIndexes();
    if (!indexes.includes(KNOWLEDGE_INDEX)) {
      await vectorStore.createIndex({
        indexName: KNOWLEDGE_INDEX,
        dimension: EMBEDDING_DIMENSION,
        metric: 'cosine',
        indexConfig: { type: 'hnsw' },
      });
    }

    // Chunk the document
    const doc = MDocument.fromText(content);
    const chunks = await doc.chunk({
      strategy: 'recursive',
    });

    // Generate embeddings
    const chunkTexts = chunks.map((c) => c.text);
    const embeddingResults = await embedder.doEmbed({ values: chunkTexts });

    // Store with metadata
    const metadata = chunks.map((c) => ({
      text: c.text,
      title,
      tags: tags ?? '',
      ingestedAt: new Date().toISOString(),
    }));

    await vectorStore.upsert({
      indexName: KNOWLEDGE_INDEX,
      vectors: embeddingResults.embeddings,
      metadata,
    });

    return {
      success: true,
      chunksStored: chunks.length,
      message: `Stored "${title}" as ${chunks.length} chunks in the knowledge base.`,
    };
  },
});

// ---------------------------------------------------------------------------
// Tool: Query knowledge base
// Built-in Mastra tool for semantic search over stored knowledge.
// ---------------------------------------------------------------------------

export const queryKnowledgeTool = createVectorQueryTool({
  id: 'query-knowledge',
  vectorStoreName: 'pgVector',
  indexName: KNOWLEDGE_INDEX,
  model: embedder,
  description:
    'Search the knowledge base for previously stored information. ' +
    'Use this when the user asks about something they previously saved, ' +
    'or when you need to find relevant context from stored documents and notes.',
});
