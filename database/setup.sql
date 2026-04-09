-- Script de configuração do Banco de Dados PostgreSQL
-- Criação da tabela de transações para o Gerenciador de Finanças

CREATE TABLE IF NOT EXISTS transacoes (
    id SERIAL PRIMARY KEY,
    descricao VARCHAR(255) NOT NULL,
    valor DECIMAL(10, 2) NOT NULL,
    data DATE NOT NULL DEFAULT CURRENT_DATE,
    categoria VARCHAR(100) NOT NULL,
    tipo VARCHAR(10) CHECK (tipo IN ('entrada', 'saida')),
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inserção de dados fictícios para teste inicial
INSERT INTO transacoes (descricao, valor, data, categoria, tipo) VALUES 
('Salário Mensal', 5000.00, '2026-03-01', 'Trabalho', 'entrada'),
('Aluguel', 1200.00, '2026-03-05', 'Moradia', 'saida'),
('Supermercado', 450.50, '2026-03-10', 'Alimentação', 'saida'),
('Freelance Design', 800.00, '2026-03-15', 'Trabalho', 'entrada'),
('Conta de Luz', 150.00, '2026-03-20', 'Contas', 'saida'),
('Internet', 100.00, '2026-03-22', 'Contas', 'saida');
