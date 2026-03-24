# Mastra - Documento Funcional y Blueprint de Produccion

> Referencia viva para construir sobre Mastra. Actualizar conforme el proyecto evolucione.

---

## 1. Principio Fundamental: No Modificar la Base

Mastra es un framework con actualizaciones frecuentes (releases semanales). La regla de oro:

- **NUNCA** modificar codigo fuente de `@mastra/*` ni hacer fork.
- Toda personalizacion se hace via configuracion, extension, o composicion.
- Usar siempre versiones `latest` o pinned en `package.json`.
- Actualizar con `npm update` y verificar changelogs antes de cada upgrade.
- Si algo no se puede hacer sin modificar la base, abrir un issue en el repo oficial.

---

## 2. Arquitectura del Proyecto

### 2.1 Estructura de Directorios

Mastra es unopinionated sobre estructura, pero recomienda esta convencion:

```
src/
  mastra/
    agents/          # Un archivo por agente
    tools/           # Tools reutilizables (un archivo por tool)
    workflows/       # Workflows multi-paso
    scorers/         # Evaluadores de calidad
    mcp/             # MCP servers propios (opcional)
    public/          # Assets estaticos copiados al build
    index.ts         # Entry point central - configuracion de Mastra
.env                 # Variables de entorno (API keys, DB URLs)
package.json
tsconfig.json
```

### 2.2 Entry Point (`src/mastra/index.ts`)

Todo se registra en una unica instancia de `Mastra`. Esto habilita dependency injection,
logging, observability, y acceso compartido a storage/memory:

```typescript
import { Mastra } from '@mastra/core'
import { PostgresStore } from '@mastra/pg'
import { PgVector } from '@mastra/pg'

export const mastra = new Mastra({
  agents: { /* ... */ },
  workflows: { /* ... */ },
  storage: new PostgresStore({
    id: 'main-storage',
    connectionString: process.env.DATABASE_URL,
  }),
  vectors: {
    pgVector: new PgVector({
      id: 'pg-vector',
      connectionString: process.env.DATABASE_URL,
    }),
  },
  logger: /* ... */,
})
```

**Regla**: Siempre acceder a agentes via `mastra.getAgentById()`, nunca importar directamente.
Esto garantiza que el agente tenga acceso a storage, memory, y observability.

---

## 3. Modelos y Model Router

### 3.1 Sintaxis

Mastra usa un model router unificado. Los modelos se especifican como strings `"provider/model-name"`:

```typescript
model: 'openai/gpt-4o-mini'        // OpenAI directo
model: 'anthropic/claude-haiku-4.5' // Anthropic directo
model: 'openrouter/minimax/minimax-m2.7' // Via OpenRouter
```

### 3.2 Modelos Seleccionados para Este Proyecto

| Uso | Modelo | Provider | Costo | Notas |
|-----|--------|----------|-------|-------|
| General / Razonamiento ligero | `openai/gpt-4o-mini` | OpenAI | Bajo | Workhorse principal |
| Razonamiento avanzado | `openai/gpt-5-mini` | OpenAI | Medio | Para tareas complejas |
| Codigo / Tareas rapidas | `anthropic/claude-haiku-4.5` | Anthropic | Bajo | Rapido y barato |
| Creatividad / MiniMax | `openrouter/minimax/minimax-m2.7` | OpenRouter | Bajo | Via OpenRouter |
| Embeddings | `openai/text-embedding-3-small` | OpenAI | Muy bajo | 1536 dims |

### 3.3 API Keys Requeridas

```
OPENAI_API_KEY=...          # Para GPT-4o-mini, GPT-5-mini, embeddings
ANTHROPIC_API_KEY=...       # Para Claude Haiku 4.5
OPENROUTER_API_KEY=...      # Para MiniMax y otros via OpenRouter (opcional)
```

Mastra detecta automaticamente las keys por variable de entorno. Si falta una, da error claro.

### 3.4 Seleccion Dinamica de Modelos

```typescript
const agent = new Agent({
  id: 'smart-router',
  model: ({ requestContext }) => {
    const tier = requestContext.get('user-tier')
    return tier === 'premium' ? 'openai/gpt-5-mini' : 'openai/gpt-4o-mini'
  },
})
```

---

## 4. Storage y Base de Datos

### 4.1 PostgreSQL como Storage Unificado

Mastra separa dos conceptos:

- **Storage** (`@mastra/pg` → `PostgresStore`): Threads, mensajes, memory, workflows, traces, evals.
- **Vectors** (`@mastra/pg` → `PgVector`): Embeddings vectoriales para RAG y semantic recall.

Ambos apuntan al mismo PostgreSQL con pgvector. Un solo servicio, cero complejidad.

### 4.2 Configuracion de Storage

```typescript
import { PostgresStore } from '@mastra/pg'

const storage = new PostgresStore({
  id: 'mastra-storage',
  connectionString: process.env.DATABASE_URL,
  // Produccion:
  max: 20,                    // Pool connections
  idleTimeoutMillis: 30000,   // Timeout idle
})
```

### 4.3 Configuracion de Vectors

```typescript
import { PgVector } from '@mastra/pg'

const vectorStore = new PgVector({
  id: 'pg-vector',
  connectionString: process.env.DATABASE_URL,
})

// Crear indice para embeddings (una vez)
await vectorStore.createIndex({
  indexName: 'knowledge-base',
  dimension: 1536,           // text-embedding-3-small
  metric: 'cosine',
  indexConfig: { type: 'hnsw' },  // Mejor para busqueda rapida
})
```

### 4.4 Connection String

```
DATABASE_URL=postgresql://mastra:<password>@127.0.0.1:5432/mastra
```

La password esta en los outputs del stack Pulumi (`pulumi stack output dataCredentials --show-secrets`).

### 4.5 Composite Storage (Futuro)

Para alto volumen de traces, separar observability a ClickHouse:

```typescript
import { MastraCompositeStore } from '@mastra/core/storage'

const storage = new MastraCompositeStore({
  id: 'composite',
  domains: {
    memory: new PostgresStore({ /* ... */ }),
    workflows: new PostgresStore({ /* ... */ }),
    observability: new ObservabilityStorageClickhouse({ /* ... */ }),
  },
})
```

---

## 5. Memory (Memoria de Agentes)

### 5.1 Capas de Memoria

| Capa | Que Hace | Cuando Usar |
|------|----------|-------------|
| **Message History** | Almacena mensajes, respuestas, tool results | Siempre (base) |
| **Working Memory** | Datos estructurados persistentes (nombre, preferencias) | Cuando el agente necesita recordar datos del usuario |
| **Semantic Recall** | Busca mensajes pasados por significado semantico | Cuando necesitas contexto relevante de conversaciones anteriores |
| **Observational Memory** | Comprime mensajes viejos en observaciones densas | **Recomendado para produccion** - evita overflow del context window |

### 5.2 Configuracion Recomendada para Produccion

```typescript
import { Memory } from '@mastra/memory'

const memory = new Memory({
  storage: storage,  // PostgresStore compartido
  options: {
    observationalMemory: true,  // Comprime historial largo
    semanticRecall: {
      topK: 5,
      messageRange: { before: 2, after: 1 },
    },
    workingMemory: {
      enabled: true,
      scope: 'resource',  // Compartido entre threads del mismo usuario
    },
  },
})
```

### 5.3 Threads y Resources

- **resource**: ID estable del usuario (ej: `user_123`). Compartido entre threads.
- **thread**: ID de una conversacion especifica. Aislado.
- **Nunca** reusar el mismo thread ID para diferentes resources.

```typescript
const response = await agent.generate('hola', {
  memory: {
    thread: 'conversation-abc-123',
    resource: 'user_123',
  },
})
```

### 5.4 Multi-Agente y Memory Scoping

- Subagentes heredan la instancia de Memory del supervisor.
- Thread ID: fresco por delegacion (historial limpio).
- Resource ID: deterministico `{parentResourceId}-{agentName}`.

---

## 6. Tools y MCP

### 6.1 Crear Tools

```typescript
import { createTool } from '@mastra/core/tools'
import { z } from 'zod'

export const searchTool = createTool({
  id: 'search-web',
  description: 'Busca informacion en la web',  // Clave: descripcion clara y concisa
  inputSchema: z.object({
    query: z.string().describe('Termino de busqueda'),
  }),
  outputSchema: z.object({
    results: z.array(z.string()),
  }),
  execute: async ({ query }) => {
    // implementacion
    return { results: ['...'] }
  },
})
```

**Best practices para tools:**
- Descripciones concisas y enfocadas en QUE hace el tool.
- Mencionar tools disponibles en las instrucciones del agente.
- Usar `activeTools` para limitar tools por request si hay muchos.

### 6.2 MCP Client (Conectar a MCP Servers Externos)

```typescript
import { MCPClient } from '@mastra/mcp'

const mcpClient = new MCPClient({
  id: 'external-tools',
  servers: {
    filesystem: {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-filesystem', '/opt/mastra/data'],
    },
    github: {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-github'],
      env: { GITHUB_TOKEN: process.env.GITHUB_TOKEN },
    },
    // HTTP/SSE remoto:
    'remote-api': {
      url: 'https://mcp.example.com/sse',
      headers: { Authorization: `Bearer ${process.env.API_TOKEN}` },
    },
  },
  timeout: 60000,
})

// Usar en agente:
const tools = await mcpClient.listTools()
const agent = new Agent({
  id: 'mcp-agent',
  tools: { ...tools, ...localTools },
})
```

**Transportes soportados:**
- `command` → Stdio (proceso local)
- `url` → Streamable HTTP (con fallback a SSE)

### 6.3 MCP Server (Exponer Tools Propios)

```typescript
import { MCPServer } from '@mastra/mcp'

const server = new MCPServer({
  id: 'my-server',
  name: 'My Mastra Server',
  version: '1.0.0',
  tools: { searchTool, analysisTool },
  agents: { myAgent },       // Se expone como tool "ask_myAgent"
  workflows: { myWorkflow },  // Se expone como tool "run_myWorkflow"
})
```

---

## 7. Workflows

### 7.1 Cuando Usar Workflows vs Agentes

- **Agentes**: Tareas abiertas donde los pasos no estan predeterminados.
- **Workflows**: Procesos multi-paso con control explicito de flujo.

### 7.2 Patrones Disponibles

| Patron | Metodo | Uso |
|--------|--------|-----|
| Secuencial | `.then()` | Paso A, luego B, luego C |
| Branching | `.branch([...])` | Condiciones paralelas |
| Paralelo | `.parallel([...])` | Ejecucion simultanea |
| Loop | `.while()` / `.until()` | Repetir hasta condicion |
| Nested | Workflow como step | Composicion de workflows |

### 7.3 Produccion

- Registrar workflows en la instancia Mastra.
- Acceder via `mastra.getWorkflow()` para type inference completo.
- Usar `restartAllActiveWorkflowRuns()` al iniciar el servidor para recuperar runs suspendidos.
- Para workflows de larga duracion, considerar Inngest como runner externo.

---

## 8. RAG (Retrieval-Augmented Generation)

### 8.1 Pipeline

```
Documento → Chunking → Embedding → Storage (PgVector) → Query → Contexto → LLM
```

### 8.2 Implementacion

```typescript
import { MDocument } from '@mastra/rag'
import { embed, embedMany } from 'ai'

// 1. Cargar y chunkar
const doc = MDocument.fromText(content)
const chunks = await doc.chunk({
  strategy: 'recursive',
  size: 512,
  overlap: 50,
})

// 2. Generar embeddings
const { embeddings } = await embedMany({
  values: chunks.map(c => c.text),
  model: openai.embedding('text-embedding-3-small'),
})

// 3. Almacenar
await vectorStore.upsert({
  indexName: 'knowledge-base',
  vectors: embeddings,
  metadata: chunks.map(c => ({ text: c.text })),
})

// 4. Consultar
const results = await vectorStore.query({
  indexName: 'knowledge-base',
  queryVector: queryEmbedding,
  topK: 5,
})
```

---

## 9. Seguridad y Guardrails

### 9.1 Input Processors (Pre-LLM)

```typescript
import {
  UnicodeNormalizer,
  PromptInjectionDetector,
  PIIDetector,
} from '@mastra/core/processors'

const secureAgent = new Agent({
  id: 'secure-agent',
  inputProcessors: [
    new UnicodeNormalizer({ stripControlChars: true }),
    new PromptInjectionDetector({
      model: 'openai/gpt-4o-mini',  // Modelo barato para deteccion
      threshold: 0.8,
      strategy: 'block',
    }),
    new PIIDetector({
      model: 'openai/gpt-4o-mini',
      strategy: 'redact',
    }),
  ],
})
```

### 9.2 Output Processors (Post-LLM)

- `SystemPromptScrubber`: Evita que el agente revele su system prompt.
- `ModerationOutputProcessor`: Filtra contenido inapropiado.
- `BatchPartsProcessor`: Optimiza streaming reduciendo overhead de red.

### 9.3 Para Produccion con Usuarios Externos

Cuando escales a 100-150 usuarios:
- Habilitar `PromptInjectionDetector` en todos los agentes publicos.
- Habilitar `PIIDetector` si manejas datos sensibles.
- Usar `SystemPromptScrubber` para evitar leaks de instrucciones.
- Implementar autenticacion en el servidor Mastra (ver docs de Custom Auth Provider).

---

## 10. Observability y Evals

### 10.1 Tracing

Mastra captura automaticamente:
- Token usage, latencia, prompts, completions.
- Decision paths, tool calls, memory operations.
- Branching, ejecucion paralela, step outputs.

Requiere storage configurado. Para alto volumen, usar ClickHouse via composite storage.

### 10.2 Evals (Evaluaciones)

```typescript
import { Agent } from '@mastra/core/agent'

const agent = new Agent({
  id: 'evaluated-agent',
  scorers: [myAccuracyScorer, myRelevanceScorer],
  scorerConfig: {
    rate: 0.1,  // Evaluar 10% de requests en produccion
  },
})
```

- **Live evals**: Corren en tiempo real, async, sin bloquear respuestas.
- **Trace evals**: Evaluan datos historicos via Studio.
- En produccion, usar sampling rate < 1.0 para reducir overhead.

---

## 11. Deployment (Self-Hosted en Hetzner)

### 11.1 Build

```bash
npx mastra build          # Genera .mastra/output/
npx mastra build --studio # Incluye Studio UI
```

### 11.2 Run

```bash
node .mastra/output/index.mjs
# O con mastra CLI:
npx mastra start
```

### 11.3 Variables de Entorno

```
PORT=4111                           # Puerto del servidor (default)
NODE_ENV=production
DATABASE_URL=postgresql://mastra:<pw>@127.0.0.1:5432/mastra
REDIS_URL=redis://:<pw>@127.0.0.1:6379/0
OPENAI_API_KEY=...
ANTHROPIC_API_KEY=...
OPENROUTER_API_KEY=...              # Solo si usas MiniMax via OpenRouter
MASTRA_STUDIO_PATH=.mastra/output/playground  # Para servir Studio
```

### 11.4 Docker (Produccion)

```dockerfile
FROM node:22-alpine
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY src ./src
RUN npx mastra build --studio

RUN addgroup -g 1001 -S nodejs && \
    adduser -S mastra -u 1001 && \
    chown -R mastra:nodejs /app
USER mastra

ENV PORT=4111
ENV NODE_ENV=production
ENV MASTRA_STUDIO_PATH=.mastra/output/playground

CMD ["node", ".mastra/output/index.mjs"]
```

### 11.5 Acceso

- **Mastra API**: `http://<server-ip>:4111/api`
- **Mastra Studio**: `http://<server-ip>:4111` (si se build con `--studio`)
- **Health check**: `GET /health`
- **OpenAPI spec**: `GET /api/openapi.json`

---

## 12. CopilotKit + AG-UI (Frontend)

Para el frontend con CopilotKit:

```bash
npx create-ag-ui-app@latest --mastra
```

Esto crea un frontend React/Next.js que se conecta al backend Mastra via AG-UI protocol.
El protocolo maneja streaming, state management, y tool calls en tiempo real.

---

## 13. Infraestructura (Referencia Rapida)

| Componente | Detalle |
|------------|---------|
| Servidor | Hetzner CX43 (8 vCPU, 16GB RAM) en hel1 |
| IP Publica | Ver `pulumi stack output mastraServerIp` en Mastra-Infra |
| IP Privada | 10.0.2.10 |
| PostgreSQL | 16 + pgvector, puerto 5432 (localhost) |
| Redis | 7, puerto 6379 (localhost) |
| SSH | `ssh root@<ip>` (key personal configurada) |
| Backups | Diarios a las 3 AM, retencion 7 dias |
| IaC Repo | `github.com/aikapenelope/Mastra-Infra` |
| App Repo | `github.com/aikapenelope/Mastra-` |

---

## 14. Checklist de Produccion

Antes de exponer a usuarios:

- [ ] Storage configurado con PostgresStore (no file-based)
- [ ] Observational memory habilitado en agentes con conversaciones largas
- [ ] Input processors (PromptInjection, PII) en agentes publicos
- [ ] Output processors (SystemPromptScrubber) en agentes publicos
- [ ] Evals con sampling rate configurado
- [ ] Autenticacion implementada en el servidor
- [ ] CORS configurado correctamente
- [ ] Studio protegido (detras de VPN/auth)
- [ ] Backups de PostgreSQL verificados
- [ ] Monitoring/alertas configuradas
- [ ] Rate limiting implementado (via Redis)
- [ ] Tailscale configurado (reemplazar SSH publico)

---

## 15. Reglas de Actualizacion

1. Revisar changelog en `mastra.ai/blog` antes de actualizar.
2. `npm update` en un branch separado.
3. Correr `npx mastra build` y verificar que compila.
4. Testear en Studio local antes de deployar.
5. Si hay breaking changes, seguir la guia de migracion oficial.
6. **Nunca** hacer cherry-pick de commits del repo de Mastra.
7. **Nunca** patchear `node_modules`.

---

*Ultima actualizacion: Marzo 2026*
*Basado en: Mastra docs, GitHub repo mastra-ai/mastra, Patterns for Building AI Agents book*
