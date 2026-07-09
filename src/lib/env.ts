import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import dotenv from 'dotenv';

function loadEnvFiles(): void {
  const cwd = process.cwd();
  const mode = (process.env.VITE_APP_ENV || process.env.NODE_ENV || 'development').toLowerCase();
  const candidates = [
    `.env.${mode}`,
    '.env.local',
    '.env',
    `.env.${mode}.local`,
  ];

  const seen = new Set<string>();
  for (const candidate of candidates) {
    if (!candidate) continue;
    const normalized = candidate.replace(/\\/g, '/');
    if (seen.has(normalized)) continue;
    seen.add(normalized);

    const fullPath = resolve(cwd, normalized);
    if (existsSync(fullPath)) {
      dotenv.config({ path: fullPath, override: false });
    }
  }
}

loadEnvFiles();

export function getEnv(name: string, fallback?: string): string | undefined {
  const metaEnv = typeof import.meta !== 'undefined' ? (import.meta as ImportMeta & { env?: Record<string, string | boolean | undefined> }).env : undefined;
  const fromMeta = metaEnv?.[name];
  if (typeof fromMeta === 'string' && fromMeta.trim()) {
    return fromMeta.trim();
  }
  if (typeof fromMeta === 'boolean') {
    return String(fromMeta);
  }

  const fromProcess = process.env[name];
  if (typeof fromProcess === 'string' && fromProcess.trim()) {
    return fromProcess.trim();
  }

  return fallback;
}
