import { AsyncLocalStorage } from 'node:async_hooks';

export type RequestContext = {
  env: Record<string, unknown>;
  // Cache do pool de DB só durante ESSA requisição — Workers proíbe reaproveitar
  // um objeto de I/O (socket/stream) criado numa requisição a partir de outra,
  // então o pool nunca pode sobreviver além do fetch() que o criou.
  dbPool?: unknown;
};

// Guarda o `env` que a Cloudflare Workers passa pra cada fetch() (bindings como
// Hyperdrive só existem dentro do contexto de uma requisição, não como variável
// global) — populado em src/server.ts, lido por src/lib/db.ts.
export const cloudflareRequestStorage = new AsyncLocalStorage<RequestContext>();

export function getCloudflareEnv(): Record<string, unknown> | undefined {
  return cloudflareRequestStorage.getStore()?.env;
}

export function getRequestContext(): RequestContext | undefined {
  return cloudflareRequestStorage.getStore();
}
