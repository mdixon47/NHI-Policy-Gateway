export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  opaUrl: process.env.OPA_URL || 'http://localhost:8181',
  toolServerUrl: process.env.TOOL_SERVER_URL || 'http://localhost:3001',
  logLevel: process.env.LOG_LEVEL || 'info',
  opaTimeoutMs: parseInt(process.env.OPA_TIMEOUT_MS || '2000', 10),
  toolTimeoutMs: parseInt(process.env.TOOL_TIMEOUT_MS || '5000', 10),
  corsOrigin: process.env.CORS_ORIGIN || '*',
  maxBodyBytes: process.env.MAX_BODY_BYTES || '256kb',
  auditRetention: parseInt(process.env.AUDIT_RETENTION || '1000', 10),
  delegationMaxDepth: parseInt(process.env.DELEGATION_MAX_DEPTH || '3', 10),

  // Authentication: 'disabled' (header/profile demo mode) or 'jwt'
  authMode: (process.env.AUTH_MODE || 'disabled') as 'disabled' | 'jwt',
  jwtJwksUri: process.env.JWT_JWKS_URI || '',
  jwtPublicKey: process.env.JWT_PUBLIC_KEY || '',
  jwtSecret: process.env.JWT_SECRET || '',
  jwtIssuer: process.env.JWT_ISSUER || '',
  jwtAudience: process.env.JWT_AUDIENCE || '',
  rotationMaxAgeHours: parseInt(process.env.ROTATION_MAX_AGE_HOURS || '24', 10),

  // Durable tamper-evident audit sink (append-only hash chain)
  auditFile: process.env.AUDIT_FILE || '',
  // Bearer token required to read /audit/feed (empty = open, demo mode)
  auditFeedToken: process.env.AUDIT_FEED_TOKEN || '',

  // Rate limiting for the tool-call endpoint
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '120', 10),

  // TLS / mTLS (empty = plain HTTP, demo mode)
  tlsCertFile: process.env.TLS_CERT_FILE || '',
  tlsKeyFile: process.env.TLS_KEY_FILE || '',
  tlsCaFile: process.env.TLS_CA_FILE || '',
  tlsRequireClientCert: process.env.TLS_REQUIRE_CLIENT_CERT === 'true',
  // Outbound client cert for mTLS to OPA / tool servers
  outboundCertFile: process.env.OUTBOUND_CERT_FILE || '',
  outboundKeyFile: process.env.OUTBOUND_KEY_FILE || '',
  outboundCaFile: process.env.OUTBOUND_CA_FILE || '',
};
