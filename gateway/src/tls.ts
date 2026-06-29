import * as fs from 'fs';
import * as http from 'http';
import * as https from 'https';
import { Express } from 'express';
import { config } from './config';

function readIfSet(file: string): Buffer | undefined {
  return file ? fs.readFileSync(file) : undefined;
}

// Outbound https.Agent for mTLS to OPA / tool servers. Returns undefined when
// no outbound TLS material is configured (plain HTTP, demo mode).
function buildOutboundAgent(): https.Agent | undefined {
  const ca = readIfSet(config.outboundCaFile);
  const cert = readIfSet(config.outboundCertFile);
  const key = readIfSet(config.outboundKeyFile);

  if (!ca && !cert && !key) {
    return undefined;
  }

  return new https.Agent({
    ca,
    cert,
    key,
    rejectUnauthorized: true,
  });
}

export const outboundHttpsAgent = buildOutboundAgent();

// Creates an HTTPS server when a cert/key pair is configured (optionally
// requiring client certs for mTLS), otherwise a plain HTTP server.
export function createServer(app: Express): http.Server | https.Server {
  if (config.tlsCertFile && config.tlsKeyFile) {
    return https.createServer(
      {
        cert: fs.readFileSync(config.tlsCertFile),
        key: fs.readFileSync(config.tlsKeyFile),
        ca: readIfSet(config.tlsCaFile),
        requestCert: config.tlsRequireClientCert,
        rejectUnauthorized: config.tlsRequireClientCert,
      },
      app,
    );
  }
  return http.createServer(app);
}

export function isTlsEnabled(): boolean {
  return Boolean(config.tlsCertFile && config.tlsKeyFile);
}
