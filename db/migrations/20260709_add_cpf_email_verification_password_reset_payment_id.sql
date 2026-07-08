-- Migração: CPF do cliente, confirmação de conta por e-mail, redefinição de senha
-- por e-mail, e retomada de pagamento pendente (PIX/boleto).
-- Banco: lumiere (MySQL 8.0+). Rode direto no MySQL (Workbench, CLI, etc).

-- `email_verified` nasce com DEFAULT 1 de propósito: os 2 usuários já existentes no banco
-- (incluindo qualquer conta admin) ficam automaticamente confirmados e não são bloqueados
-- no login quando essa migração entrar no ar. Cadastros NOVOS explicitamente gravam 0.
ALTER TABLE users
  ADD COLUMN cpf VARCHAR(14) NULL,
  ADD UNIQUE KEY uniq_users_cpf (cpf),
  ADD COLUMN email_verified TINYINT(1) NOT NULL DEFAULT 1,
  ADD COLUMN email_verification_token VARCHAR(64) NULL,
  ADD COLUMN email_verification_expires_at TIMESTAMP NULL,
  ADD COLUMN password_reset_token VARCHAR(64) NULL,
  ADD COLUMN password_reset_expires_at TIMESTAMP NULL;

-- Guarda o ID do pagamento no Asaas para permitir buscar de novo o QR code PIX ou a
-- linha digitável do boleto depois (tela "Pagar agora" em Minha Conta > Pedidos),
-- sem precisar gerar uma nova cobrança nem inventar um token próprio.
ALTER TABLE orders
  ADD COLUMN asaas_payment_id VARCHAR(64) NULL;
