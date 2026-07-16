-- Migração: rastreio de pedido (dropshipping) e reembolso.
-- Banco: lumiere (MySQL 8.0+). Rode direto no MySQL (Workbench, CLI, etc).

ALTER TABLE orders
  ADD COLUMN tracking_code VARCHAR(100) NULL,
  ADD COLUMN carrier VARCHAR(50) NULL,
  ADD COLUMN shipped_at TIMESTAMP NULL,
  ADD COLUMN refunded_at TIMESTAMP NULL,
  ADD COLUMN refund_reason VARCHAR(255) NULL;
