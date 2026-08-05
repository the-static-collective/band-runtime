import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createBandRuntimeMcpServer } from './server';

async function main(): Promise<void> {
  const server = createBandRuntimeMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error: unknown) => {
  console.error('Band Runtime MCP server failed:', error);
  process.exitCode = 1;
});
