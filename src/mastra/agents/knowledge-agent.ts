import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';

import { mcpClient } from '../mcp-clients.js';
import { ingestKnowledgeTool, queryKnowledgeTool } from '../tools/rag-tools.js';

// ---------------------------------------------------------------------------
// Knowledge Agent: Memory + RAG + Filesystem
// ---------------------------------------------------------------------------

const mcpTools = await mcpClient.listTools();
const filesystemTools = Object.fromEntries(
  Object.entries(mcpTools).filter(([k]) => k.startsWith('filesystem_')),
);

/**
 * Knowledge Agent: Manages the second brain's persistent knowledge.
 *
 * Memory is configured at the Mastra instance level (brainMemory) and
 * referenced here by name. This ensures Studio detects it properly.
 * Has full memory stack (observational, semantic recall, working memory)
 * plus RAG tools for the knowledge base and filesystem access.
 */
export const knowledgeAgent = new Agent({
  id: 'knowledge-agent',
  name: 'Knowledge Agent',
  description:
    'Personal knowledge manager with long-term memory. Remembers past conversations, ' +
    'stores and retrieves documents from the knowledge base, and manages files. ' +
    'Delegate knowledge storage, recall, note-taking, and file management tasks here.',
  instructions: `You are a personal knowledge manager and second brain.

Your capabilities:
- Remember past conversations using your built-in memory system.
- Store important information in the knowledge base for long-term retrieval (ingest-knowledge).
- Search the knowledge base for previously stored information (query-knowledge).
- Read and write files on the server using filesystem tools.
- Track the user's name, preferences, and ongoing projects in working memory.

Guidelines:
- When the user shares knowledge, store it with clear titles and tags.
- When asked about something, check your memory AND the knowledge base.
- Proactively connect new information to things you already know.
- Be concise and direct.
- Respond in the same language the user writes in.`,
  model: 'openrouter/openai/gpt-4o-mini',
  memory: new Memory(),
  tools: {
    ...filesystemTools,
    'ingest-knowledge': ingestKnowledgeTool,
    'query-knowledge': queryKnowledgeTool,
  },
});
