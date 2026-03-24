import { MCPClient } from '@mastra/mcp';

/**
 * MCP Clients: External tool servers for the brain agent.
 *
 * - GitHub: search repos, read files, create issues, manage PRs
 * - Filesystem: read/write/list files on the VPS
 * - Brave Search: web search for current information (requires BRAVE_API_KEY)
 * - Fetch: read and extract content from URLs
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
    // Brave Search: web and local search for current information
    ...(process.env.BRAVE_API_KEY
      ? {
          'brave-search': {
            command: 'npx',
            args: ['-y', '@modelcontextprotocol/server-brave-search'],
            env: {
              BRAVE_API_KEY: process.env.BRAVE_API_KEY,
            },
            timeout: 30000,
          },
        }
      : {}),
    // Fetch: read and extract content from any URL
    fetch: {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-fetch'],
      timeout: 30000,
    },
    // Playwright: browser automation (navigate, click, fill, extract, screenshot)
    // DISABLED: JSON Schema draft 2020-12 incompatibility with Mastra's draft-07 validation.
    // Re-enable when @playwright/mcp updates schema format or Mastra adds 2020-12 support.
    // playwright: {
    //   command: 'npx',
    //   args: ['-y', '@playwright/mcp@latest', '--headless'],
    //   timeout: 60000,
    // },
  },
});
