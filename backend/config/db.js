import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.DATABASE_URL) {
  console.error('ERRO: A variável de ambiente DATABASE_URL não foi definida!');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  max: 20, // Limite máximo de conexões no pool
  idleTimeoutMillis: 30000, // Tempo que uma conexão pode ficar ociosa antes de ser fechada
  connectionTimeoutMillis: 2000, // Tempo máximo para tentar uma conexão antes de dar timeout
});

pool.on('connect', () => {
  console.log('Conectado ao banco de dados PostgreSQL');
});

pool.on('error', (err) => {
  console.error('ERRO CRÍTICO NO BANCO:', err);
  // Não encerra o processo imediatamente para evitar loops de reinicialização no Render
});

export default pool;
