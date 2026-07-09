import jwt from 'jsonwebtoken';
import { getEnv } from './env';

// No insecure fallback: this app already requires several other env vars
// (DB_HOST, ASAAS_API_KEY, etc.) to function, so failing loudly here is
// consistent. A hardcoded fallback secret would let anyone forge valid
// (including admin) JWTs if the env var was ever missing in a deployed
// environment.
const rawSecret = getEnv('PJWT_SECRET');

if (!rawSecret) {
  throw new Error(
    'PJWT_SECRET não está definido. Configure a variável de ambiente PJWT_SECRET antes de iniciar o servidor.',
  );
}

const SECRET: string = rawSecret;

export type JWTUser = { id: string | number; email: string; isAdmin: boolean; fullName?: string };

export function signToken(payload: JWTUser): string {
  return jwt.sign(payload, SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): JWTUser {
  return jwt.verify(token, SECRET) as JWTUser;
}
