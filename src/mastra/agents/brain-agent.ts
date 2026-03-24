import { Agent } from '@mastra/core/agent';
import { ModelRouterEmbeddingModel } from '@mastra/core/llm';
import { Memory } from '@mastra/memory';
import { PostgresStore } from '@mastra/pg';
import { PgVector } from '@mastra/pg';

import { mcpClient } from '../mcp-clients.js';
import { ingestKnowledgeTool, queryKnowledgeTool } from '../tools/rag-tools.js';

// ---------------------------------------------------------------------------
// Memory: Full stack for knowledge management
// - Message history: stores all conversations
// - Working memory: persists user preferences and context across sessions
// - Semantic recall: retrieves relevant past messages by meaning
// - Observational memory: compresses old messages into dense observations
// ---------------------------------------------------------------------------

const memoryStorage = new PostgresStore({
  id: 'brain-memory-storage',
  connectionString: process.env.DATABASE_URL!,
});

const memoryVectors = new PgVector({
  id: 'brain-memory-vectors',
  connectionString: process.env.DATABASE_URL!,
});

const memory = new Memory({
  storage: memoryStorage,
  vector: memoryVectors,
  embedder: new ModelRouterEmbeddingModel('openrouter/openai/text-embedding-3-small'),
  options: {
    // Compress old messages into observations to prevent context overflow
    observationalMemory: true,
    // Retrieve relevant past messages by semantic similarity
    semanticRecall: {
      topK: 5,
      messageRange: { before: 2, after: 1 },
    },
    // Persist structured data (name, preferences, goals) across sessions
    workingMemory: {
      enabled: true,
      scope: 'resource', // Shared across threads for the same user
    },
  },
});

// ---------------------------------------------------------------------------
// Agent: Second Brain - Knowledge Manager
// ---------------------------------------------------------------------------

/**
 * Primary agent for the second-brain system.
 *
 * Model strategy:
 * - Default: gpt-4o-mini (fast, cheap, good enough for most tasks)
 * - Can be switched to haiku 4.5 or gpt-5-mini via requestContext for
 *   specific use cases (code analysis, deep reasoning)
 *
 * Tools:
 * - MCP: GitHub, filesystem, Brave Search (if key set), Fetch (URL reader)
 * - RAG: ingest-knowledge (store docs), query-knowledge (search knowledge base)
 */
// Load MCP tools at startup
const mcpTools = await mcpClient.listTools();

export const brainAgent = new Agent({
  id: 'brain-agent',
  name: 'Second Brain',
  description:
    'Personal knowledge manager that remembers context, organizes information, and retrieves relevant knowledge across conversations.',
  instructions: `You are a personal knowledge manager and second brain assistant.

Your role is to help the user:
- Capture and organize knowledge, ideas, notes, and references.
- Recall relevant information from past conversations using your memory.
- Connect related concepts and surface insights the user might have forgotten.
- Summarize, categorize, and structure information when asked.
- Search through files, repositories, and the web using your tools.
- Store important information in the knowledge base for long-term retrieval.

Available tool categories:
- ingest-knowledge: Store text content in the knowledge base for later retrieval.
- query-knowledge: Search the knowledge base for previously stored information.
- GitHub tools (prefixed github_): search repos, read files, create issues, etc.
- Filesystem tools (prefixed filesystem_): read, write, and list files on the server.
- Fetch tools (prefixed fetch_): read and extract content from any URL.
- Brave Search tools (prefixed brave-search_): web search for current information (if available).

Guidelines:
- Always be concise and direct. Avoid unnecessary verbosity.
- When recalling information, cite the context where you learned it.
- If you don't know something or can't find it in your memory, say so clearly.
- Proactively suggest connections between new information and things you already know.
- Respond in the same language the user writes in.
- Use your working memory to remember the user's name, preferences, and ongoing projects.
- When the user asks you to remember or save something long-term, use the ingest-knowledge tool.
- When the user asks about previously saved information, use query-knowledge first.
- When the user shares a URL, use fetch tools to read it, then offer to store key points.`,
  model: 'anthropic/claude-haiku-4.5',
  memory,
  tools: {
    ...mcpTools,
    'ingest-knowledge': ingestKnowledgeTool,
    'query-knowledge': queryKnowledgeTool,
  },
});
