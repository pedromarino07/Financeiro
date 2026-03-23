import pool from '../config/db.js';

export const getTransactions = async (req, res) => {
  try {
    // Removemos o filtro de usuário para que todos vejam tudo
    const query = `
      SELECT * FROM transacoes 
      ORDER BY data DESC
    `;
    const { rows } = await pool.query(query);
    res.json(rows);
  } catch (error) {
    console.error('Erro ao buscar transações:', error);
    res.status(500).json({ error: 'Erro ao buscar transações' });
  }
};

export const createTransaction = async (req, res) => {
  // Removi o categoria_id e usei categoria (texto)
  const { usuario_id, categoria, descricao, valor, data, tipo } = req.body;
  
  try {
    const query = `
      INSERT INTO transacoes (usuario_id, categoria, descricao, valor, data, tipo) 
      VALUES ($1, $2, $3, $4, $5, $6) 
      RETURNING *
    `;
    const values = [usuario_id, categoria, descricao, valor, data, tipo];
    const { rows } = await pool.query(query, values);
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error('Erro ao criar transação:', error);
    res.status(500).json({ error: 'Erro ao criar transação' });
  }
};
