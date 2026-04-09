import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  connectionTimeoutMillis: 10000, // 10 segundos para conectar (bom para Cold Start)
  idleTimeoutMillis: 30000,      // Fecha conexões ociosas após 30 segundos
  max: 10                        // Máximo de 10 conexões no pool
});

pool.on('connect', () => {
  console.log('Conectado ao banco de dados PostgreSQL');
});

pool.on('error', (err) => {
  console.error('Erro inesperado no cliente do banco de dados', err);
  // Não encerramos o processo para permitir que o pool tente se recuperar
});

export default pool;
