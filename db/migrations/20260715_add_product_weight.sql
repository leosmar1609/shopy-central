-- Migração: peso do produto, usado para calcular o frete dinâmico.
-- Banco: lumiere (MySQL 8.0+). Rode direto no MySQL (Workbench, CLI, etc) —
-- tanto no banco local quanto no da Hostinger (produção).

-- Default de 0.3kg (300g) cobre a maioria dos itens de moda/acessórios do catálogo
-- até o lojista ajustar o peso real de cada produto no admin.
ALTER TABLE products
  ADD COLUMN weight_kg DECIMAL(6,3) NOT NULL DEFAULT 0.300;
