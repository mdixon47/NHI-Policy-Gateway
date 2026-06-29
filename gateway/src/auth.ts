import { Request } from 'express';
import {
  createRemoteJWKSet,
  importSPKI,
  jwtVerify,
  type JWTPayload,
  type JWTVerifyGetKey,
  type KeyLike,
} from 'jose';
import { config } from './config';
import { AgentIdentity, CredentialInfo } from './types';

export interface AuthenticatedContext {
  agent: AgentIdentity;
  credential: CredentialInfo;
  claims: JWTPayload;
}

export class AuthError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

type KeyResolver = KeyLike | Uint8Array | JWTVerifyGetKey;
let cachedKey: KeyResolver | undefined;

async function resolveKey(): Promise<KeyResolver> {
  if (cachedKey) return cachedKey;

  if (config.jwtJwksUri) {
    cachedKey = createRemoteJWKSet(new URL(config.jwtJwksUri));
  } else if (config.jwtPublicKey) {
    cachedKey = await importSPKI(config.jwtPublicKey, 'RS256');
  } else if (config.jwtSecret) {
    cachedKey = new TextEncoder().encode(config.jwtSecret);
  } else {
    throw new AuthError(
      'AUTH_MISCONFIGURED',
      'AUTH_MODE=jwt requires JWT_JWKS_URI, JWT_PUBLIC_KEY, or JWT_SECRET',
    );
  }
  return cachedKey;
}

// Test hook: clear the memoized key material between cases.
export function resetKeyCache(): void {
  cachedKey = undefined;
}

function bearerToken(req: Request): string {
  const header = (req.headers['authorization'] as string) || '';
  const [scheme, token] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    throw new AuthError('MISSING_BEARER_TOKEN', 'Authorization: Bearer <token> is required');
  }
  return token;
}

function str(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

// Maps verified JWT claims onto the policy-input identity and credential.
export function claimsToContext(claims: JWTPayload): AuthenticatedContext {
  const agentId = str(claims.sub, 'unknown');
  const environment = str(claims['environment'] ?? claims['env'], 'unknown');
  const issuedAt = typeof claims.iat === 'number' ? new Date(claims.iat * 1000).toISOString() : new Date().toISOString();
  const expiresAt = typeof claims.exp === 'number' ? new Date(claims.exp * 1000).toISOString() : new Date().toISOString();

  const agent: AgentIdentity = {
    id: agentId,
    spiffe_id: typeof claims['spiffe_id'] === 'string' ? (claims['spiffe_id'] as string) : (agentId.startsWith('spiffe://') ? agentId : undefined),
    environment,
    trust_tier: (str(claims['trust_tier'], 'foundation') as AgentIdentity['trust_tier']),
  };

  const credential: CredentialInfo = {
    type: 'jwt',
    issued_at: issuedAt,
    expires_at: expiresAt,
    is_static: false,
    last_rotated: issuedAt,
    rotation_max_age_hours: typeof claims['rotation_max_age_hours'] === 'number'
      ? (claims['rotation_max_age_hours'] as number)
      : config.rotationMaxAgeHours,
  };

  return { agent, credential, claims };
}

// Verifies the presented bearer token. Returns null when auth is disabled
// (demo mode), otherwise an authenticated context or throws AuthError.
export async function authenticate(req: Request): Promise<AuthenticatedContext | null> {
  if (config.authMode !== 'jwt') {
    return null;
  }

  const token = bearerToken(req);
  const key = await resolveKey();

  try {
    const { payload } = await jwtVerify(token, key as Parameters<typeof jwtVerify>[1], {
      issuer: config.jwtIssuer || undefined,
      audience: config.jwtAudience || undefined,
    });
    return claimsToContext(payload);
  } catch (err) {
    if (err instanceof AuthError) throw err;
    throw new AuthError('TOKEN_VERIFICATION_FAILED', (err as Error).message);
  }
}
