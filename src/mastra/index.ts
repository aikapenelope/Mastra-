import { Mastra } from '@mastra/core/mastra';
import { ModelRouterEmbeddingModel } from '@mastra/core/llm';
import { Memory } from '@mastra/memory';
import { PostgresStore } from '@mastra/pg';
import { PgVector } from '@mastra/pg';
import { PinoLogger } from '@mastra/loggers';
import { Observability, DefaultExporter } from '@mastra/observability';

import { brainOrchestrator } from './agents/brain-orchestrator.js';
import { codeAgent } from './agents/code-agent.js';
import { researchAgent } from './agents/research-agent.js';
import { knowledgeAgent } from './agents/knowledge-agent.js';
import { globalWorkspace } from './workspace.js';
import { deepResearchWorkflow } from './workflows/deep-research.js';

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
// Instance-level Memory: registered here so Studio detects it
// ---------------------------------------------------------------------------

const brainMemory = new Memory({
  storage: new PostgresStore({
    id: 'brain-memory-storage',
    connectionString: process.env.DATABASE_URL!,
  }),
  vector: new PgVector({
    id: 'brain-memory-vectors',
    connectionString: process.env.DATABASE_URL!,
  }),
  embedder: new ModelRouterEmbeddingModel({
    providerId: 'openrouter',
    modelId: 'openai/text-embedding-3-small',
    url: 'https://openrouter.ai/api/v1',
    apiKey: process.env.OPENROUTER_API_KEY ?? process.env.OPENAI_API_KEY,
  }),
  options: {
    observationalMemory: true,
    semanticRecall: {
      topK: 5,
      messageRange: { before: 2, after: 1 },
    },
    workingMemory: {
      enabled: true,
      scope: 'resource',
    },
  },
});

// ---------------------------------------------------------------------------
// Observability: traces stored in PostgreSQL via DefaultExporter
// ---------------------------------------------------------------------------

const observability = new Observability({
  configs: {
    default: {
      serviceName: 'mastra-brain',
      exporters: [new DefaultExporter()],
    },
  },
});

// ---------------------------------------------------------------------------
// Mastra Instance
// ---------------------------------------------------------------------------

export const mastra = new Mastra({
  agents: {
    brain: brainOrchestrator,
    codeAgent,
    researchAgent,
    knowledgeAgent,
  },
  workflows: {
    deepResearch: deepResearchWorkflow,
  },
  storage,
  vectors: {
    pgVector,
  },
  memory: {
    brainMemory,
  },
  workspace: globalWorkspace,
  observability,
  logger,
  server: {
    host: process.env.MASTRA_HOST ?? '0.0.0.0',
    port: Number(process.env.PORT) || 4111,
    cors: {
      origin: '*',
      allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization'],
    },
  },
});
