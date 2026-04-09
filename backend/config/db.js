import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.DATABASE_URL) {
  console.error('ERRO: A variável de ambiente DATABASE_URL não foi definida!');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL + (process.env.DATABASE_URL.includes('?') ? '&' : '?') + 'sslmode=require',
  ssl: {
    rejectUnauthorized: false
  },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 20000, // Aumentado para 20s para lidar com cold start do Neon
});

// Função para testar a conexão com retry
const connectWithRetry = async (retries = 3, delay = 5000) => {
  for (let i = 0; i < retries; i++) {
    try {
      const client = await pool.connect();
      console.log('Conectado ao banco de dados PostgreSQL com sucesso!');
      client.release();
      return;
    } catch (err) {
      console.error(`Tentativa ${i + 1} de conexão falhou. Tentando novamente em ${delay}ms...`);
      if (i === retries - 1) throw err;
      await new Promise(res => setTimeout(res, delay));
    }
  }
};

connectWithRetry().catch(err => console.error('Erro fatal ao conectar no banco após retries:', err));

pool.on('error', (err) => {
  console.error('ERRO CRÍTICO NO BANCO:', err);
  // Não encerra o processo imediatamente para evitar loops de reinicialização no Render
});

export default pool;
