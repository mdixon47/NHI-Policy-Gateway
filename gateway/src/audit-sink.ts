import * as fs from 'fs';
import crypto from 'crypto';
import { AuditEntry } from './types';
import { config } from './config';

const GENESIS = '0'.repeat(64);

function sha256(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

// Recovers the last entry_hash from an existing audit file so the chain
// continues across restarts. Returns GENESIS for a new/empty file.
function lastHashOf(file: string): string {
  if (!fs.existsSync(file)) return GENESIS;
  const lines = fs.readFileSync(file, 'utf-8').trim().split('\n').filter(Boolean);
  if (lines.length === 0) return GENESIS;
  try {
    return (JSON.parse(lines[lines.length - 1]).entry_hash as string) || GENESIS;
  } catch {
    return GENESIS;
  }
}

let prevHash: string | undefined;
let seq = 0;
let writeChain: Promise<void> = Promise.resolve();

function ensureInit(file: string): void {
  if (prevHash !== undefined) return;
  prevHash = lastHashOf(file);
  if (fs.existsSync(file)) {
    seq = fs.readFileSync(file, 'utf-8').trim().split('\n').filter(Boolean).length;
  }
}

// Appends an audit entry to the durable hash chain. No-op when AUDIT_FILE is
// unset (demo mode). Serialized via a promise chain to preserve ordering.
export function persistAuditEntry(entry: AuditEntry): Promise<void> {
  if (!config.auditFile) return Promise.resolve();
  const file = config.auditFile;

  writeChain = writeChain.then(async () => {
    ensureInit(file);
    const record = { ...entry, seq: seq++, prev_hash: prevHash };
    const base = JSON.stringify(record);
    const entryHash = sha256(base);
    prevHash = entryHash;
    await fs.promises.appendFile(file, JSON.stringify({ ...record, entry_hash: entryHash }) + '\n');
  });

  return writeChain;
}

export interface ChainVerification {
  valid: boolean;
  count: number;
  brokenAt?: number;
}

// Re-walks the file and validates every entry_hash and prev_hash link so
// tampering (edited or removed lines) is detectable.
export function verifyAuditFile(file: string): ChainVerification {
  if (!fs.existsSync(file)) return { valid: true, count: 0 };
  const lines = fs.readFileSync(file, 'utf-8').trim().split('\n').filter(Boolean);

  let expectedPrev = GENESIS;
  for (let i = 0; i < lines.length; i++) {
    let obj: Record<string, unknown>;
    try {
      obj = JSON.parse(lines[i]);
    } catch {
      return { valid: false, count: lines.length, brokenAt: i };
    }
    const { entry_hash, ...rest } = obj as { entry_hash?: string } & Record<string, unknown>;
    if (rest.prev_hash !== expectedPrev || sha256(JSON.stringify(rest)) !== entry_hash) {
      return { valid: false, count: lines.length, brokenAt: i };
    }
    expectedPrev = entry_hash as string;
  }
  return { valid: true, count: lines.length };
}

// Test hook: reset memoized chain state.
export function resetSinkState(): void {
  prevHash = undefined;
  seq = 0;
  writeChain = Promise.resolve();
}
