import { Mastra } from '@mastra/core/mastra';
import { PostgresStore } from '@mastra/pg';
import { PgVector } from '@mastra/pg';
import { PinoLogger } from '@mastra/loggers';

import { brainOrchestrator } from './agents/brain-orchestrator.js';
import { codeAgent } from './agents/code-agent.js';
import { researchAgent } from './agents/research-agent.js';
import { knowledgeAgent } from './agents/knowledge-agent.js';

// ---------------------------------------------------------------------------
// Storage: PostgreSQL for threads, memory, workflows, traces
// ---------------------------------------------------------------------------

const storage = new PostgresStore({
  id: 'mastra-storage',
  connectionString: process.env.DATABASE_URL!,
});

// ---------------------------------------------------------------------------
// Vectors: PgVector for RAG embeddings and semantic recall
// ---------------------------------------------------------------------------

const pgVector = new PgVector({
  id: 'pg-vector',
  connectionString: process.env.DATABASE_URL!,
});

// ---------------------------------------------------------------------------
// Logger
// ---------------------------------------------------------------------------

const logger = new PinoLogger({
  name: 'MastraBrain',
  level: process.env.NODE_ENV === 'production' ? 'warn' : 'info',
});

// ---------------------------------------------------------------------------
// Mastra Instance
//
// Agents registered:
//   - brain: Supervisor orchestrator (routes to specialists)
//   - code-agent: Programming, GitHub, code review
//   - research-agent: Web search, URL reading, deep analysis
//   - knowledge-agent: Memory, knowledge base, file management
// ---------------------------------------------------------------------------

export const mastra = new Mastra({
  agents: {
    brain: brainOrchestrator,
    codeAgent,
    researchAgent,
    knowledgeAgent,
  },
  storage,
  vectors: {
    pgVector,
  },
  logger,
});
