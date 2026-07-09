import { Resend } from 'resend';
import { getEnv } from './env';

function getResendClient(): Resend {
  const apiKey = getEnv('RESEND_API_KEY');
  if (!apiKey) {
    throw new Error('RESEND_API_KEY não configurado. Configure a variável de ambiente para habilitar o envio de e-mails.');
  }
  return new Resend(apiKey);
}

function getFromAddress(): string {
  return getEnv('EMAIL_FROM', 'Lumière <onboarding@resend.dev>') || 'Lumière <onboarding@resend.dev>';
}

export function getSiteUrl(): string {
  return getEnv('VITE_APP_URL', 'http://localhost:5173') || 'http://localhost:5173';
}

export async function sendEmail(opts: { to: string; subject: string; html: string }): Promise<void> {
  const resend = getResendClient();
  const { error } = await resend.emails.send({
    from: getFromAddress(),
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
  });
  if (error) {
    throw new Error(`Falha ao enviar e-mail: ${error.message}`);
  }
}

function emailShell(title: string, bodyHtml: string): string {
  return `
    <div style="font-family: -apple-system, Segoe UI, Roboto, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; color: #1c1917;">
      <h1 style="font-size: 20px; margin: 0 0 16px;">${title}</h1>
      ${bodyHtml}
      <p style="margin-top: 32px; font-size: 12px; color: #78716c;">Lumière — este é um e-mail automático, não responda.</p>
    </div>
  `;
}

export async function sendVerificationEmail(to: string, fullName: string, token: string): Promise<void> {
  const link = `${getSiteUrl()}/verify-email?token=${token}`;
  await sendEmail({
    to,
    subject: 'Confirme sua conta Lumière',
    html: emailShell(
      'Confirme sua conta',
      `
        <p>Olá, ${fullName || 'cliente'}!</p>
        <p>Falta pouco para começar a usar sua conta na Lumière. Clique no botão abaixo para confirmar seu e-mail:</p>
        <p style="margin: 24px 0;">
          <a href="${link}" style="background:#c1602c;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600;">Confirmar e-mail</a>
        </p>
        <p style="font-size: 13px; color: #78716c;">Ou copie e cole este link no navegador: <br>${link}</p>
        <p style="font-size: 13px; color: #78716c;">Este link expira em 24 horas.</p>
      `,
    ),
  });
}

export async function sendPasswordResetEmail(to: string, token: string): Promise<void> {
  const link = `${getSiteUrl()}/reset-password?token=${token}`;
  await sendEmail({
    to,
    subject: 'Redefinição de senha — Lumière',
    html: emailShell(
      'Redefinir senha',
      `
        <p>Recebemos um pedido para redefinir a senha da sua conta.</p>
        <p style="margin: 24px 0;">
          <a href="${link}" style="background:#c1602c;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600;">Redefinir senha</a>
        </p>
        <p style="font-size: 13px; color: #78716c;">Ou copie e cole este link no navegador: <br>${link}</p>
        <p style="font-size: 13px; color: #78716c;">Este link expira em 1 hora. Se você não pediu essa redefinição, ignore este e-mail.</p>
      `,
    ),
  });
}
