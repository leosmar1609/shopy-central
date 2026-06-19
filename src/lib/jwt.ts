import jwt from 'jsonwebtoken';

const SECRET = process.env.PJWT_SECRET ?? 'fallback-dev-secret';

export type JWTUser = { id: string | number; email: string; isAdmin: boolean; fullName?: string };

export function signToken(payload: JWTUser): string {
  return jwt.sign(payload, SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): JWTUser {
  return jwt.verify(token, SECRET) as JWTUser;
}
