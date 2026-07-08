-- Migração: endereços salvos, favoritos, cupons e dados de cupom/endereço em orders.
-- Banco: lumiere (MySQL 8.0+). Rode este script direto no MySQL (Workbench, CLI, etc).
-- Testado contra o schema real do banco (introspecção via INFORMATION_SCHEMA em 2026-07-08):
-- todas as PKs existentes são CHAR(36) com DEFAULT (uuid()), então as novas tabelas seguem o mesmo padrão.

-- 1) Endereços salvos (área "Minha Conta" > Endereços)
CREATE TABLE addresses (
  id CHAR(36) NOT NULL DEFAULT (uuid()) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  label VARCHAR(50) NOT NULL DEFAULT 'Endereço',
  recipient_name VARCHAR(255) NOT NULL,
  phone VARCHAR(30) NOT NULL,
  zip VARCHAR(20) NOT NULL,
  address VARCHAR(255) NOT NULL,
  number VARCHAR(20) NOT NULL,
  complement VARCHAR(100) NULL,
  neighborhood VARCHAR(100) NOT NULL,
  city VARCHAR(100) NOT NULL,
  state CHAR(2) NOT NULL,
  country VARCHAR(100) NOT NULL DEFAULT 'Brasil',
  is_default TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_addresses_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_addresses_user (user_id)
);

-- 2) Favoritos persistidos no servidor (hoje só existem em localStorage no navegador)
CREATE TABLE favorites (
  id CHAR(36) NOT NULL DEFAULT (uuid()) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  product_id CHAR(36) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_favorites_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_favorites_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  UNIQUE KEY uniq_favorites_user_product (user_id, product_id)
);

-- 3) Cupons de desconto
CREATE TABLE coupons (
  id CHAR(36) NOT NULL DEFAULT (uuid()) PRIMARY KEY,
  code VARCHAR(50) NOT NULL,
  discount_type ENUM('percentage', 'fixed') NOT NULL,
  discount_value DECIMAL(10,2) NOT NULL,
  min_order_value DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  max_uses INT NULL COMMENT 'NULL = sem limite de usos',
  uses_count INT NOT NULL DEFAULT 0,
  valid_from TIMESTAMP NULL,
  valid_until TIMESTAMP NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_coupon_code (code)
);

-- 4) orders: registrar cupom aplicado + campos de endereço que o checkout já coleta
--    (bairro/estado/complemento) mas hoje são descartados antes de chegar ao banco.
ALTER TABLE orders
  ADD COLUMN coupon_code VARCHAR(50) NULL,
  ADD COLUMN discount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN shipping_neighborhood VARCHAR(100) NULL,
  ADD COLUMN shipping_state CHAR(2) NULL,
  ADD COLUMN shipping_complement VARCHAR(100) NULL;

-- Observação: a tabela `profiles` (id, full_name, phone) já existe no banco, já tem
-- FK para users(id) e está ociosa (não usada por nenhum código hoje) — vamos reaproveitá-la
-- para guardar o telefone do usuário em "Dados pessoais", sem precisar de nova tabela/ALTER.
