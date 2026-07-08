import { createServerFn } from '@tanstack/react-start';
import { getRequestIP } from '@tanstack/react-start/server';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { db } from '@/lib/db';
import { signToken, verifyToken } from '@/lib/jwt';
import { checkRateLimit } from '@/lib/rate-limit';
import { sendPasswordResetEmail } from '@/lib/email';

const RATE_LIMIT_MESSAGE = 'Muitas tentativas. Aguarde um momento antes de tentar novamente.';
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

export const fetchMyProfileFn = createServerFn({ method: 'GET' })
  .inputValidator((data: { token: string }) => data)
  .handler(async ({ data }) => {
    const user = verifyToken(data.token);
    const [profileRows] = await db.execute('SELECT phone FROM profiles WHERE id = ?', [user.id]);
    const profile = (profileRows as any[])[0];
    const [userRows] = await db.execute('SELECT cpf FROM users WHERE id = ?', [user.id]);
    const userRow = (userRows as any[])[0];
    return {
      email: user.email,
      fullName: user.fullName ?? '',
      phone: profile?.phone ?? '',
      cpf: userRow?.cpf ?? '',
    };
  });

// Atualiza nome completo (users) e telefone (profiles) e retorna um token novo
// já com o nome atualizado, para o frontend chamar storeToken() e refletir na hora.
export const updateMyProfileFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { token: string; full_name: string; phone: string }) => data)
  .handler(async ({ data }) => {
    const user = verifyToken(data.token);

    await db.execute('UPDATE users SET full_name = ? WHERE id = ?', [data.full_name, user.id]);
    await db.execute(
      'INSERT INTO profiles (id, full_name, phone) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), phone = VALUES(phone)',
      [user.id, data.full_name, data.phone],
    );

    const token = signToken({
      id: user.id,
      email: user.email,
      isAdmin: user.isAdmin,
      fullName: data.full_name,
    });
    return { token };
  });

export const changePasswordFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { token: string; current_password: string; new_password: string }) => data)
  .handler(async ({ data }) => {
    const user = verifyToken(data.token);
    const [rows] = await db.execute('SELECT password_hash FROM users WHERE id = ?', [user.id]);
    const row = (rows as any[])[0];
    if (!row) throw new Error('Usuário não encontrado');

    const ok = await bcrypt.compare(data.current_password, row.password_hash);
    if (!ok) throw new Error('Senha atual incorreta');

    const hash = await bcrypt.hash(data.new_password, 10);
    await db.execute('UPDATE users SET password_hash = ? WHERE id = ?', [hash, user.id]);
  });

export const requestPasswordResetFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { email: string }) => data)
  .handler(async ({ data }) => {
    const ip = getRequestIP({ xForwardedFor: true }) ?? '127.0.0.1';
    if (!checkRateLimit(`forgot-password:${ip}`, { max: 3, windowMs: 10 * 60 * 1000 })) {
      throw new Error(RATE_LIMIT_MESSAGE);
    }

    const [rows] = await db.execute('SELECT id FROM users WHERE email = ?', [data.email]);
    const user = (rows as any[])[0];

    // Resposta genérica sempre — nunca revela se o e-mail existe na base.
    if (!user) return { sent: true };

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);
    await db.execute('UPDATE users SET password_reset_token = ?, password_reset_expires_at = ? WHERE id = ?', [
      token,
      expiresAt,
      user.id,
    ]);

    try {
      await sendPasswordResetEmail(data.email, token);
    } catch (err) {
      console.error('[forgot-password] Falha ao enviar e-mail:', err);
    }

    return { sent: true };
  });

export const resetPasswordFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { token: string; new_password: string }) => data)
  .handler(async ({ data }) => {
    const [rows] = await db.execute(
      'SELECT id, password_reset_expires_at FROM users WHERE password_reset_token = ?',
      [data.token],
    );
    const user = (rows as any[])[0];
    if (!user) throw new Error('Link de redefinição inválido ou já utilizado.');
    if (user.password_reset_expires_at && new Date(user.password_reset_expires_at).getTime() < Date.now()) {
      throw new Error('Link de redefinição expirado. Solicite um novo.');
    }

    const hash = await bcrypt.hash(data.new_password, 10);
    await db.execute(
      'UPDATE users SET password_hash = ?, password_reset_token = NULL, password_reset_expires_at = NULL WHERE id = ?',
      [hash, user.id],
    );
  });
