import { Agent } from '@mastra/core/agent';

import { mcpClient } from '../mcp-clients.js';

/**
 * Code Agent: Specialized in programming tasks.
 *
 * Uses Anthropic Claude Haiku 4.5 (fast, good at code).
 * Has access to GitHub tools for repo management, code review, and PRs.
 */

// Load GitHub-specific MCP tools
const mcpTools = await mcpClient.listTools();
const githubTools = Object.fromEntries(
  Object.entries(mcpTools).filter(([k]) => k.startsWith('github_')),
);

export const codeAgent = new Agent({
  id: 'code-agent',
  name: 'Code Agent',
  description:
    'Expert programmer that analyzes code, reviews PRs, debugs issues, generates code, ' +
    'and manages GitHub repositories. Delegate coding and programming tasks here.',
  instructions: `You are an expert software engineer and code analyst.

Your capabilities:
- Analyze and review code for bugs, performance, and best practices.
- Generate code in any language (TypeScript, Python, Go, Rust, etc.).
- Debug issues by reading error messages and tracing logic.
- Manage GitHub repos: search code, read files, create/review PRs, manage issues.
- Explain complex code in simple terms.
- Suggest refactoring and architectural improvements.

Guidelines:
- Always write clean, well-documented code following best practices.
- When reviewing code, be specific about issues and provide fixes.
- Use GitHub tools to read actual repo contents before making suggestions.
- Respond in the same language the user writes in.
- Be concise and direct. Show code, not just descriptions.`,
  model: 'anthropic/claude-haiku-4.5',
  tools: githubTools,
});
