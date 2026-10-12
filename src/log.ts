import { appendFileSync, renameSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const FILE = join(tmpdir(), 'opencode-aula-f75-max.log');
const MAX_BYTES = 1 << 20;

function describe(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  return error.cause === undefined
    ? `${error.name}: ${error.message}`
    : `${error.name}: ${error.message} <- ${describe(error.cause)}`;
}

// OpenCode does not surface a plugin's console output, so what the indicator does is also written where it can be read.
export function log(message: string, error?: unknown): void {
  const line = `${new Date().toISOString()} ${message}${error === undefined ? '' : ` | ${describe(error)}`}\n`;
  try {
    if ((statSync(FILE, { throwIfNoEntry: false })?.size ?? 0) > MAX_BYTES) renameSync(FILE, `${FILE}.old`);
    appendFileSync(FILE, line);
  } catch (failure) {
    console.warn('aula-f75-max: could not write its log', failure);
  }
  if (error !== undefined) console.warn(`aula-f75-max: ${message}`, error);
}
