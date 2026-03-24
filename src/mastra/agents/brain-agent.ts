import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { PostgresStore } from '@mastra/pg';
import { PgVector } from '@mastra/pg';

import { mcpClient } from '../mcp-clients.js';

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
 */
// Load MCP tools (GitHub, filesystem) at startup
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
- Search through files and repositories using your GitHub and filesystem tools.

Available tool categories:
- GitHub tools (prefixed github_): search repos, read files, create issues, etc.
- Filesystem tools (prefixed filesystem_): read, write, and list files on the server.

Guidelines:
- Always be concise and direct. Avoid unnecessary verbosity.
- When recalling information, cite the context where you learned it.
- If you don't know something or can't find it in your memory, say so clearly.
- Proactively suggest connections between new information and things you already know.
- Respond in the same language the user writes in.
- Use your working memory to remember the user's name, preferences, and ongoing projects.
- When the user shares new knowledge, acknowledge it and note how it connects to existing knowledge.`,
  model: 'openai/gpt-4o-mini',
  memory,
  tools: mcpTools,
});
