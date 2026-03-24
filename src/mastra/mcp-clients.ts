import { MCPClient } from '@mastra/mcp';

/**
 * MCP Clients: External tool servers for the brain agent.
 *
 * - GitHub: search repos, read files, create issues, manage PRs
 * - Filesystem: read/write/list files on the VPS
 *
 * Tools are loaded at startup via listTools() and injected into agents.
 */
export const mcpClient = new MCPClient({
  id: 'brain-mcp',
  servers: {
    // GitHub: search repos, read files, manage issues
    github: {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-github'],
      env: {
        GITHUB_PERSONAL_ACCESS_TOKEN: process.env.GITHUB_TOKEN ?? '',
      },
      timeout: 30000,
    },
    // Filesystem: read/write files on the VPS
    filesystem: {
      command: 'npx',
      args: [
        '-y',
        '@modelcontextprotocol/server-filesystem',
        process.env.FS_ROOT ?? '/opt/mastra/data',
      ],
      timeout: 15000,
    },
  },
});
