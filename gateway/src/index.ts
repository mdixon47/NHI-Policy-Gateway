import express from 'express';
import cors from 'cors';
import { handleToolCall } from './mcp-handler';
import { getRecentAuditEntries, addSSEClient, removeSSEClient } from './audit-logger';
import { config } from './config';

const app = express();

app.use(cors());
app.use(express.json());

app.post('/mcp/tools/call', (req, res) => {
  handleToolCall(req, res);
});

app.get('/audit/feed', (req, res) => {
  const accept = req.headers.accept || '';

  if (accept.includes('text/event-stream')) {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    res.write('data: {"type":"connected"}\n\n');
    addSSEClient(res);

    req.on('close', () => {
      removeSSEClient(res);
    });
  } else {
    res.json(getRecentAuditEntries());
  }
});

app.get('/health', (_req, res) => {
  res.json({ status: 'healthy', service: 'nhi-policy-gateway', timestamp: new Date().toISOString() });
});

app.listen(config.port, () => {
  console.log(`NHI Policy Gateway running on port ${config.port}`);
  console.log(`OPA endpoint: ${config.opaUrl}`);
  console.log(`Tool server: ${config.toolServerUrl}`);
});
