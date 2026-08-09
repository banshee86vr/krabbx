#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { requireEnv, KrabbxApiClient } from './client.js';
import { startHttpServer } from './http.js';
import { createKrabbxMcpServer } from './server.js';

async function main(): Promise<void> {
  const baseUrl = process.env.KRABBX_API_URL?.trim() || 'http://localhost:3001';
  const token = requireEnv('KRABBX_API_TOKEN');
  const client = new KrabbxApiClient(baseUrl, token);
  const httpMode = process.argv.includes('--http') || process.env.MCP_TRANSPORT === 'http';

  if (httpMode) {
    const port = Number(process.env.MCP_PORT || process.env.PORT || 3101);
    const host = process.env.MCP_HOST?.trim() || '127.0.0.1';
    const httpToken = requireEnv('MCP_HTTP_TOKEN');
    await startHttpServer({ client, port, host, httpToken });
    return;
  }

  const server = createKrabbxMcpServer(client);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
