import { createServerFn } from '@tanstack/react-start';
import { getRequestIP } from '@tanstack/react-start/server';
import bcrypt from 'bcryptjs';
import { randomBytes, randomUUID } from 'crypto';
import { db } from '@/lib/db';
import { signToken } from '@/lib/jwt';
import { checkRateLimit } from '@/lib/rate-limit';
import { isValidCPF } from '@/lib/masks';
import { sendVerificationEmail } from '@/lib/email';

const RATE_LIMIT_MESSAGE = 'Muitas tentativas. Aguarde um momento antes de tentar novamente.';
const EMAIL_NOT_VERIFIED_MESSAGE = 'EMAIL_NOT_VERIFIED';
const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

function newVerificationToken(): { token: string; expiresAt: Date } {
  return { token: randomBytes(32).toString('hex'), expiresAt: new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS) };
}

export const loginFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { email: string; password: string }) => data)
  .handler(async ({ data }) => {
    const ip = getRequestIP({ xForwardedFor: true }) ?? '127.0.0.1';
    if (!checkRateLimit(`login:${ip}`, { max: 5, windowMs: 60 * 1000 })) {
      throw new Error(RATE_LIMIT_MESSAGE);
    }

    const [rows] = await db.execute('SELECT * FROM users WHERE email = ?', [data.email]);
    const user = (rows as any[])[0];
    if (!user) throw new Error('E-mail ou senha inválidos');
    const ok = await bcrypt.compare(data.password, user.password_hash);
    if (!ok) throw new Error('E-mail ou senha inválidos');

    if (!user.email_verified) {
      throw new Error(EMAIL_NOT_VERIFIED_MESSAGE);
    }

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
  .inputValidator((data: { email: string; password: string; full_name: string; cpf: string }) => data)
  .handler(async ({ data }) => {
    const ip = getRequestIP({ xForwardedFor: true }) ?? '127.0.0.1';
    if (!checkRateLimit(`signup:${ip}`, { max: 3, windowMs: 60 * 60 * 1000 })) {
      throw new Error(RATE_LIMIT_MESSAGE);
    }

    const cpf = data.cpf.replace(/\D/g, '');
    if (!isValidCPF(cpf)) throw new Error('CPF inválido. Verifique os números digitados.');

    const [existingEmail] = await db.execute('SELECT id FROM users WHERE email = ?', [data.email]);
    if ((existingEmail as any[]).length > 0) throw new Error('E-mail já cadastrado');

    const [existingCpf] = await db.execute('SELECT id FROM users WHERE cpf = ?', [cpf]);
    if ((existingCpf as any[]).length > 0) throw new Error('CPF já cadastrado');

    const hash = await bcrypt.hash(data.password, 10);
    const id = randomUUID();
    const { token: verificationToken, expiresAt } = newVerificationToken();

    await db.execute(
      `INSERT INTO users
        (id, email, password_hash, full_name, cpf, email_verified, email_verification_token, email_verification_expires_at)
       VALUES (?, ?, ?, ?, ?, 0, ?, ?)`,
      [id, data.email, hash, data.full_name, cpf, verificationToken, expiresAt],
    );

    let emailSent = true;
    try {
      await sendVerificationEmail(data.email, data.full_name, verificationToken);
    } catch (err) {
      console.error('[signup] Falha ao enviar e-mail de confirmação:', err);
      emailSent = false;
    }

    // Login fica bloqueado até a confirmação — não emitimos token aqui.
    return { emailSent };
  });

export const verifyEmailFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { token: string }) => data)
  .handler(async ({ data }) => {
    const [rows] = await db.execute(
      'SELECT id, email_verification_expires_at FROM users WHERE email_verification_token = ?',
      [data.token],
    );
    const user = (rows as any[])[0];
    if (!user) throw new Error('Link de confirmação inválido ou já utilizado.');
    if (user.email_verification_expires_at && new Date(user.email_verification_expires_at).getTime() < Date.now()) {
      throw new Error('Link de confirmação expirado. Solicite um novo e-mail de confirmação.');
    }

    await db.execute(
      'UPDATE users SET email_verified = 1, email_verification_token = NULL, email_verification_expires_at = NULL WHERE id = ?',
      [user.id],
    );
  });

export const resendVerificationEmailFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { email: string }) => data)
  .handler(async ({ data }) => {
    const ip = getRequestIP({ xForwardedFor: true }) ?? '127.0.0.1';
    if (!checkRateLimit(`resend-verify:${ip}`, { max: 3, windowMs: 10 * 60 * 1000 })) {
      throw new Error(RATE_LIMIT_MESSAGE);
    }

    const [rows] = await db.execute(
      'SELECT id, full_name, email_verified FROM users WHERE email = ?',
      [data.email],
    );
    const user = (rows as any[])[0];
    // Resposta genérica sempre — não revela se o e-mail existe na base.
    if (!user || user.email_verified) {
      return { sent: true };
    }

    const { token: verificationToken, expiresAt } = newVerificationToken();
    await db.execute(
      'UPDATE users SET email_verification_token = ?, email_verification_expires_at = ? WHERE id = ?',
      [verificationToken, expiresAt, user.id],
    );

    try {
      await sendVerificationEmail(data.email, user.full_name ?? '', verificationToken);
    } catch (err) {
      console.error('[resend-verification] Falha ao enviar e-mail:', err);
    }

    return { sent: true };
  });
