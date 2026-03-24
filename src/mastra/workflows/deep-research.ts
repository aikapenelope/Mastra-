import { createWorkflow, createStep } from '@mastra/core/workflows';
import { z } from 'zod';

/**
 * Deep Research Workflow
 *
 * A multi-step workflow that:
 * 1. Takes a research topic
 * 2. Delegates to the research agent for web search and synthesis
 * 3. Stores findings in the knowledge base
 *
 * Can be triggered manually or by the Brain Orchestrator.
 */

// Step 1: Research the topic using the research agent
const researchStep = createStep({
  id: 'research',
  description: 'Search and gather information on the topic',
  inputSchema: z.object({
    topic: z.string().describe('The research topic or question'),
    depth: z
      .enum(['quick', 'standard', 'deep'])
      .default('standard')
      .describe('How thorough the research should be'),
  }),
  outputSchema: z.object({
    findings: z.string().describe('Synthesized research findings'),
    sources: z.array(z.string()).describe('List of source URLs'),
    confidence: z.enum(['high', 'medium', 'low']),
  }),
  execute: async ({ inputData, mastra }) => {
    const agent = mastra?.getAgent('researchAgent');
    if (!agent) {
      return {
        findings: 'Research agent not available',
        sources: [],
        confidence: 'low' as const,
      };
    }

    const depthInstructions = {
      quick: 'Give a brief overview with 2-3 key points.',
      standard: 'Provide a thorough analysis with 5+ key findings and multiple sources.',
      deep: 'Conduct exhaustive research. Read multiple sources, cross-reference facts, identify contradictions, and provide a comprehensive report.',
    };

    const result = await agent.generate(
      `Research the following topic: "${inputData.topic}"\n\n${depthInstructions[inputData.depth]}\n\nFormat your response as:\n## Findings\n[your findings]\n\n## Sources\n[list of URLs]\n\n## Confidence\n[high/medium/low and why]`,
    );

    // Parse the response
    const text = result.text ?? '';
    const sourcesMatch = text.match(/## Sources\n([\s\S]*?)(?=## Confidence|$)/);
    const confidenceMatch = text.match(/## Confidence\n([\s\S]*?)$/);
    const sources = sourcesMatch
      ? sourcesMatch[1]
          .split('\n')
          .filter((l) => l.trim().startsWith('http') || l.trim().startsWith('-'))
          .map((l) => l.replace(/^-\s*/, '').trim())
      : [];
    const confidence = confidenceMatch?.[1]?.toLowerCase().includes('high')
      ? ('high' as const)
      : confidenceMatch?.[1]?.toLowerCase().includes('low')
        ? ('low' as const)
        : ('medium' as const);

    return {
      findings: text,
      sources,
      confidence,
    };
  },
});

// Step 2: Store findings in the knowledge base
const storeStep = createStep({
  id: 'store-findings',
  description: 'Store research findings in the knowledge base',
  inputSchema: z.object({
    findings: z.string(),
    sources: z.array(z.string()),
    confidence: z.enum(['high', 'medium', 'low']),
  }),
  outputSchema: z.object({
    stored: z.boolean(),
    title: z.string(),
    message: z.string(),
  }),
  execute: async ({ inputData, mastra }) => {
    const agent = mastra?.getAgent('knowledgeAgent');
    if (!agent) {
      return { stored: false, title: '', message: 'Knowledge agent not available' };
    }

    const result = await agent.generate(
      `Store the following research findings in the knowledge base using the ingest-knowledge tool.\n\nContent to store:\n${inputData.findings}\n\nUse an appropriate title and tags. Include the confidence level (${inputData.confidence}) and sources in the stored content.`,
    );

    return {
      stored: true,
      title: 'Research stored',
      message: result.text ?? 'Findings stored in knowledge base',
    };
  },
});

// Assemble the workflow
export const deepResearchWorkflow = createWorkflow({
  id: 'deep-research',
  description:
    'Conducts thorough multi-source research on a topic, synthesizes findings, and stores them in the knowledge base.',
  inputSchema: z.object({
    topic: z.string().describe('The research topic or question'),
    depth: z
      .enum(['quick', 'standard', 'deep'])
      .default('standard')
      .describe('How thorough the research should be'),
  }),
  outputSchema: z.object({
    stored: z.boolean(),
    title: z.string(),
    message: z.string(),
  }),
})
  .then(researchStep)
  .then(storeStep)
  .commit();
