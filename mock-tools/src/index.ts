import express from 'express';
import cors from 'cors';
import { handleFileRead } from './tools/file_read';
import { handleDbQuery } from './tools/db_query';
import { handleApiCall } from './tools/api_call';
import { toolRegistry } from './tool-registry';

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

app.use(cors());
app.use(express.json());

app.post('/tools/file_read', handleFileRead);
app.post('/tools/db_query', handleDbQuery);
app.post('/tools/api_call', handleApiCall);

app.get('/tools', (_req, res) => {
  res.json(toolRegistry);
});

app.get('/health', (_req, res) => {
  res.json({ status: 'healthy', service: 'mock-tools', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Mock Tool Server running on port ${PORT}`);
});
