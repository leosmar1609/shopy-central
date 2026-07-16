import mysql from 'mysql2/promise';
import { getEnv } from './env';
import { getRequestContext } from './cloudflare-context';

type HyperdriveBinding = {
  connectionString: string;
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
};

// Usado em dev local e como fallback caso o binding do Hyperdrive não esteja
// presente (ex: rodando fora da Cloudflare). Criar o pool não abre conexão de
// verdade — mysql2 só conecta na primeira query.
const localPool = mysql.createPool({
  host: getEnv('DB_HOST', 'localhost') ?? 'localhost',
  user: getEnv('DB_USER', 'root') ?? 'root',
  password: getEnv('DB_PASSWORD', '') ?? '',
  database: getEnv('DB_NAME', '') ?? '',
  port: Number(getEnv('DB_PORT', '3306') ?? 3306),
  waitForConnections: true,
  connectionLimit: 10,
  disableEval: true,
});

// O Hyperdrive já faz o pooling de verdade do lado da Cloudflare — mas o pool
// criado aqui NUNCA pode sobreviver além da requisição atual: Workers proíbe
// reaproveitar um objeto de I/O (socket) criado numa requisição a partir de
// outra ("Cannot perform I/O on behalf of a different request"). Por isso o
// cache vive no contexto por-requisição (AsyncLocalStorage), não numa variável
// de módulo — múltiplas queries DENTRO da mesma requisição reaproveitam o
// mesmo pool, mas cada requisição nova cria o seu.
function resolvePool(): mysql.Pool {
  const ctx = getRequestContext();
  const hyperdrive = ctx?.env?.HYPERDRIVE as HyperdriveBinding | undefined;

  if (!hyperdrive) return localPool;

  if (ctx?.dbPool) return ctx.dbPool as mysql.Pool;

  const pool = mysql.createPool({
    host: hyperdrive.host,
    port: hyperdrive.port,
    user: hyperdrive.user,
    password: hyperdrive.password,
    database: hyperdrive.database,
    waitForConnections: true,
    connectionLimit: 3,
    disableEval: true,
  });

  if (ctx) ctx.dbPool = pool;
  return pool;
}

// O Hyperdrive ainda não suporta o protocolo de prepared statement do MySQL
// (COM_STMT_PREPARE), que é exatamente o que `.execute()` usa por baixo dos panos.
// `.query()` com parâmetros faz o mesmo escaping do lado do cliente (continua seguro
// contra SQL injection), só que via texto puro (COM_QUERY) — funciona com o Hyperdrive.
// Redirecionamos aqui pra não precisar trocar `db.execute(...)` em nenhum dos ~12
// arquivos de server functions que já usam esse nome em todo o projeto.
function wrapConnection(conn: mysql.PoolConnection): mysql.PoolConnection {
  return new Proxy(conn, {
    get(target, prop, receiver) {
      if (prop === 'execute') return target.query.bind(target);
      return Reflect.get(target, prop, receiver);
    },
  });
}

// Só execute/query/getConnection (e beginTransaction/commit/rollback/release nas
// conexões) são usados em todo o resto do código — mantemos a mesma API de sempre
// (`db.execute(...)`, `db.getConnection()`) sem precisar mudar nenhum arquivo.
export const db = {
  execute: (...args: Parameters<mysql.Pool['query']>) => resolvePool().query(...args),
  query: (...args: Parameters<mysql.Pool['query']>) => resolvePool().query(...args),
  getConnection: async () => wrapConnection(await resolvePool().getConnection()),
} as unknown as mysql.Pool;
