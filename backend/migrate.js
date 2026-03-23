import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

const migration = `
-- 1. Criar tabela de usuários
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    senha VARCHAR(255) NOT NULL,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Adicionar coluna usuario_id na tabela transacoes
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transacoes' AND column_name='usuario_id') THEN
        ALTER TABLE transacoes ADD COLUMN usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 3. Inserir usuários Pedro e Josy
INSERT INTO usuarios (nome, email, senha) VALUES 
('Pedro', 'pedro@email.com', '123456'),
('Josy', 'josy@email.com', '123456')
ON CONFLICT (email) DO NOTHING;

-- 4. Associar transações existentes ao primeiro usuário (Pedro) para não quebrar o sistema
UPDATE transacoes SET usuario_id = (SELECT id FROM usuarios WHERE email = 'pedro@email.com' LIMIT 1) WHERE usuario_id IS NULL;
`;

async function runMigration() {
  try {
    console.log('Iniciando migração do banco de dados...');
    await pool.query(migration);
    console.log('Migração concluída com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('Erro durante a migração:', error);
    process.exit(1);
  }
}

runMigration();
