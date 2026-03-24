import { Agent } from '@mastra/core/agent';

import { mcpClient } from '../mcp-clients.js';
import { ingestKnowledgeTool, queryKnowledgeTool } from '../tools/rag-tools.js';

/**
 * Research Agent: Specialized in deep web research and information synthesis.
 *
 * Uses GPT-4o-mini via OpenRouter (good at following instructions, cheap).
 * Has access to Fetch (read URLs), Brave Search (if key set), and RAG tools.
 */

// Load research-relevant MCP tools (fetch, brave-search)
const mcpTools = await mcpClient.listTools();
const researchTools = Object.fromEntries(
  Object.entries(mcpTools).filter(
    ([k]) => k.startsWith('fetch_') || k.startsWith('brave-search_'),
  ),
);

export const researchAgent = new Agent({
  id: 'research-agent',
  name: 'Research Agent',
  description:
    'Deep researcher that searches the web, reads URLs, analyzes documents, ' +
    'synthesizes information from multiple sources, and stores findings in the knowledge base. ' +
    'Delegate research, analysis, and information gathering tasks here.',
  instructions: `You are a deep research analyst and information synthesizer.

Your capabilities:
- Search the web for current information using Brave Search tools (if available).
- Read and extract content from any URL using Fetch tools.
- Store important findings in the knowledge base using ingest-knowledge.
- Query the knowledge base for previously stored research using query-knowledge.
- Synthesize information from multiple sources into clear, structured reports.
- Compare and contrast different viewpoints on a topic.

Research methodology:
1. Start by querying the knowledge base for existing information on the topic.
2. Search the web for current, authoritative sources.
3. Read the most relevant URLs to get detailed information.
4. Synthesize findings into a clear, structured response.
5. Offer to store key findings in the knowledge base for future reference.

Guidelines:
- Always cite your sources (URLs, titles).
- Distinguish between facts and opinions.
- Note when information might be outdated.
- Be thorough but concise. Prioritize quality over quantity.
- Respond in the same language the user writes in.`,
  model: 'openrouter/openai/gpt-4o-mini',
  tools: {
    ...researchTools,
    'ingest-knowledge': ingestKnowledgeTool,
    'query-knowledge': queryKnowledgeTool,
  },
});
