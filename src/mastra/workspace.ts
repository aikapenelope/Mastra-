import { Workspace, LocalFilesystem, LocalSandbox } from '@mastra/core/workspace';

/**
 * Global workspace for all agents.
 *
 * Provides:
 * - Filesystem: read/write files in /opt/mastra/data (VPS) or ./workspace (local)
 * - Sandbox: execute shell commands (npm, git, node, python, etc.)
 * - BM25 search: keyword search over indexed docs and skills
 * - Skills: reusable instructions loaded from /skills directory
 *
 * All agents inherit this workspace unless they define their own.
 */

const WORKSPACE_DIR = process.env.WORKSPACE_DIR ?? './workspace';

export const globalWorkspace = new Workspace({
  id: 'brain-workspace',
  name: 'Brain Workspace',
  filesystem: new LocalFilesystem({
    basePath: WORKSPACE_DIR,
  }),
  sandbox: new LocalSandbox({
    workingDirectory: WORKSPACE_DIR,
  }),
  skills: ['skills'],
  bm25: true,
  autoIndexPaths: ['docs', 'skills'],
});
