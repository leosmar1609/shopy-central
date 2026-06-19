import { createServerFn } from '@tanstack/react-start';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { signToken } from '@/lib/jwt';
import { randomUUID } from 'crypto';

export const loginFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { email: string; password: string }) => data)
  .handler(async ({ data }) => {
    const [rows] = await db.execute('SELECT * FROM users WHERE email = ?', [data.email]);
    const user = (rows as any[])[0];
    if (!user) throw new Error('E-mail ou senha inválidos');
    const ok = await bcrypt.compare(data.password, user.password_hash);
    if (!ok) throw new Error('E-mail ou senha inválidos');
    const [roleRows] = await db.execute(
      'SELECT 1 FROM user_roles WHERE user_id = ? AND role = "admin"',
      [user.id]
    );
    const isAdmin = (roleRows as any[]).length > 0;
    const token = signToken({
      id: user.id,
      email: user.email,
      isAdmin,
      fullName: user.full_name || user.fullName,
    });
    return { token };
  });

export const signupFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { email: string; password: string; full_name: string }) => data)
  .handler(async ({ data }) => {
    const [existing] = await db.execute('SELECT id FROM users WHERE email = ?', [data.email]);
    if ((existing as any[]).length > 0) throw new Error('E-mail já cadastrado');
    const hash = await bcrypt.hash(data.password, 10);
    const id = randomUUID();
    await db.execute(
      'INSERT INTO users (id, email, password_hash, full_name) VALUES (?, ?, ?, ?)',
      [id, data.email, hash, data.full_name]
    );
    const token = signToken({
      id,
      email: data.email,
      isAdmin: false,
      fullName: data.full_name,
    });
    return { token };
  });
