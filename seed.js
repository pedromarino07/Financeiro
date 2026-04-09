import pool from './backend/config/db.js';

async function seed() {
  try {
    // Inserir usuária Elione
    const query = "INSERT INTO usuarios (nome, email, senha) VALUES ('Elione', 'elione@email.com', '123456') ON CONFLICT (email) DO NOTHING RETURNING id, nome";
    const { rows } = await pool.query(query);
    
    if (rows.length > 0) {
      console.log('Usuária Elione criada com sucesso:', rows[0]);
    } else {
      console.log('Usuária Elione já existe ou não pôde ser criada.');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Erro ao popular banco de dados:', error);
    process.exit(1);
  }
}

seed();
