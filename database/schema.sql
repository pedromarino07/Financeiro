-- Script de criação das tabelas para o Gerenciador de Finanças Pessoais

CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    senha VARCHAR(255) NOT NULL,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categorias (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(50) NOT NULL,
    tipo VARCHAR(10) CHECK (tipo IN ('entrada', 'saida')),
    cor VARCHAR(7) DEFAULT '#000000'
);

CREATE TABLE IF NOT EXISTS transacoes (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    usuario_nome VARCHAR(100),
    categoria_id INTEGER REFERENCES categorias(id) ON DELETE SET NULL,
    descricao VARCHAR(255) NOT NULL,
    valor DECIMAL(10, 2) NOT NULL,
    data DATE NOT NULL DEFAULT CURRENT_DATE,
    tipo VARCHAR(10) CHECK (tipo IN ('entrada', 'saida')),
    cartao_nome VARCHAR(100),
    parcela_atual INTEGER,
    total_parcelas INTEGER,
    categoria VARCHAR(50),
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para otimização de performance
CREATE INDEX IF NOT EXISTS idx_transacoes_data ON transacoes(data);
CREATE INDEX IF NOT EXISTS idx_transacoes_tipo ON transacoes(tipo);
CREATE INDEX IF NOT EXISTS idx_transacoes_usuario_id ON transacoes(usuario_id);

-- Inserção de categorias padrão para teste
INSERT INTO categorias (nome, tipo, cor) VALUES 
('Salário', 'receita', '#2ecc71'),
('Alimentação', 'despesa', '#e74c3c'),
('Transporte', 'despesa', '#3498db'),
('Lazer', 'despesa', '#f1c40f'),
('Educação', 'despesa', '#9b59b6');
