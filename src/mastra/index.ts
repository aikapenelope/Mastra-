import { Mastra } from '@mastra/core/mastra';
import { PostgresStore } from '@mastra/pg';
import { PgVector } from '@mastra/pg';
import { PinoLogger } from '@mastra/loggers';

import { brainAgent } from './agents/brain-agent.js';

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
// ---------------------------------------------------------------------------

export const mastra = new Mastra({
  agents: {
    brainAgent,
  },
  storage,
  vectors: {
    pgVector,
  },
  logger,
});
