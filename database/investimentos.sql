-- Script para adicionar lógica de investimentos
-- Adiciona a coluna e_investimento na tabela de transacoes (já que o sistema atual usa categoria como string)
ALTER TABLE transacoes ADD COLUMN IF NOT EXISTS e_investimento BOOLEAN DEFAULT FALSE;

-- Marca as categorias existentes como investimentos
UPDATE transacoes SET e_investimento = TRUE WHERE categoria IN ('Investimentos', 'Poupança', 'Ações');

-- Opcional: Se houver uma tabela de categorias separada, adicione a coluna lá também
-- ALTER TABLE categorias ADD COLUMN IF NOT EXISTS e_investimento BOOLEAN DEFAULT FALSE;
-- INSERT INTO categorias (nome, tipo, e_investimento) VALUES 
-- ('Investimentos', 'despesa', TRUE),
-- ('Poupança', 'despesa', TRUE),
-- ('Ações', 'despesa', TRUE);
