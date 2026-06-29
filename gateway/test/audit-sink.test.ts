import { describe, it, expect, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { AuditEntry } from '../src/types';

const tmpFiles: string[] = [];

function tmpFile(): string {
  const file = path.join(os.tmpdir(), `audit-${Date.now()}-${Math.random().toString(16).slice(2)}.log`);
  tmpFiles.push(file);
  return file;
}

function entry(id: string): AuditEntry {
  return {
    id,
    timestamp: new Date().toISOString(),
    agent_id: 'agent-alpha',
    tool: 'file_read',
    decision: 'ALLOW',
    violations: [],
    latency_ms: 1,
    request_hash: 'sha256:abc',
  };
}

afterEach(() => {
  for (const f of tmpFiles) if (fs.existsSync(f)) fs.unlinkSync(f);
  tmpFiles.length = 0;
  vi.resetModules();
});

describe('durable audit sink', () => {
  it('writes a verifiable hash chain', async () => {
    const file = tmpFile();
    process.env.AUDIT_FILE = file;
    vi.resetModules();
    const sink = await import('../src/audit-sink');
    sink.resetSinkState();

    await sink.persistAuditEntry(entry('dec-1'));
    await sink.persistAuditEntry(entry('dec-2'));
    await sink.persistAuditEntry(entry('dec-3'));

    const result = sink.verifyAuditFile(file);
    expect(result.valid).toBe(true);
    expect(result.count).toBe(3);
    delete process.env.AUDIT_FILE;
  });

  it('detects tampering with a recorded entry', async () => {
    const file = tmpFile();
    process.env.AUDIT_FILE = file;
    vi.resetModules();
    const sink = await import('../src/audit-sink');
    sink.resetSinkState();

    await sink.persistAuditEntry(entry('dec-1'));
    await sink.persistAuditEntry(entry('dec-2'));

    const lines = fs.readFileSync(file, 'utf-8').trim().split('\n');
    const obj = JSON.parse(lines[0]);
    obj.tool = 'db_query';
    lines[0] = JSON.stringify(obj);
    fs.writeFileSync(file, lines.join('\n') + '\n');

    const result = sink.verifyAuditFile(file);
    expect(result.valid).toBe(false);
    expect(result.brokenAt).toBe(0);
    delete process.env.AUDIT_FILE;
  });

  it('is a no-op when AUDIT_FILE is unset', async () => {
    delete process.env.AUDIT_FILE;
    vi.resetModules();
    const sink = await import('../src/audit-sink');
    sink.resetSinkState();
    await expect(sink.persistAuditEntry(entry('dec-x'))).resolves.toBeUndefined();
  });
});
