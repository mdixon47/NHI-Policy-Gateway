import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import axios from 'axios';
import crypto from 'crypto';
import { handleToolCall } from './mcp-handler';
import { getRecentAuditEntries, addSSEClient, removeSSEClient } from './audit-logger';
import { config } from './config';
import { createServer, isTlsEnabled } from './tls';

// Optional bearer-token gate for the audit feed. Open when no token is set.
function requireAuditToken(req: Request, res: Response, next: NextFunction): void {
  if (!config.auditFeedToken) {
    next();
    return;
  }
  const header = (req.headers['authorization'] as string) || '';
  const [scheme, token] = header.split(' ');
  const provided = scheme?.toLowerCase() === 'bearer' ? token || '' : '';
  const a = Buffer.from(provided);
  const b = Buffer.from(config.auditFeedToken);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }
  next();
}

export function createApp(): Express {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));
  app.use(cors({ origin: config.corsOrigin }));
  app.use(express.json({ limit: config.maxBodyBytes }));

  const toolCallLimiter = rateLimit({
    windowMs: config.rateLimitWindowMs,
    limit: config.rateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.post('/mcp/tools/call', toolCallLimiter, async (req, res) => {
    try {
      await handleToolCall(req, res);
    } catch (err) {
      if (!res.headersSent) {
        res.status(403).json({
          status: 'DENIED',
          violations: [
            {
              policy: 'gateway',
              violation: 'GATEWAY_ERROR',
              message: 'Request denied due to an internal gateway error (fail-closed)',
              owasp_asi: 'N/A',
              owasp_nhi: 'N/A',
              zero_trust_tier: 'Foundation',
            },
          ],
        });
      }
      console.error('handleToolCall failed:', err);
    }
  });

  app.get('/audit/feed', requireAuditToken, (req, res) => {
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

  app.get('/ready', async (_req, res) => {
    try {
      await axios.get(`${config.opaUrl}/health`, { timeout: config.opaTimeoutMs });
      res.json({ status: 'ready', service: 'nhi-policy-gateway', opa: 'reachable', timestamp: new Date().toISOString() });
    } catch {
      res.status(503).json({ status: 'not_ready', service: 'nhi-policy-gateway', opa: 'unreachable', timestamp: new Date().toISOString() });
    }
  });

  return app;
}

if (require.main === module) {
  const server = createServer(createApp());
  server.listen(config.port, () => {
    console.log(`NHI Policy Gateway running on port ${config.port} (${isTlsEnabled() ? 'https' : 'http'})`);
    console.log(`Auth mode: ${config.authMode}`);
    console.log(`OPA endpoint: ${config.opaUrl}`);
    console.log(`Tool server: ${config.toolServerUrl}`);
  });
}
