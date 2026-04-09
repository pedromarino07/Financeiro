import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

let connectionString = process.env.DATABASE_URL;
if (connectionString && !connectionString.includes('sslmode=')) {
  connectionString += (connectionString.includes('?') ? '&' : '?') + 'sslmode=require';
}

const pool = new Pool({
  connectionString: connectionString,
  ssl: { rejectUnauthorized: false }
});

const indexes = `
-- Criar índices para melhorar a performance das queries
CREATE INDEX IF NOT EXISTS idx_transacoes_usuario_id ON transacoes(usuario_id);
CREATE INDEX IF NOT EXISTS idx_transacoes_data ON transacoes(data);
CREATE INDEX IF NOT EXISTS idx_transacoes_tipo ON transacoes(tipo);
CREATE INDEX IF NOT EXISTS idx_transacoes_categoria ON transacoes(categoria);
CREATE INDEX IF NOT EXISTS idx_transacoes_pago ON transacoes(pago);
`;

async function addIndexes() {
  try {
    console.log('Adicionando índices para otimização...');
    await pool.query(indexes);
    console.log('Índices adicionados com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('Erro ao adicionar índices:', error);
    process.exit(1);
  }
}

addIndexes();
