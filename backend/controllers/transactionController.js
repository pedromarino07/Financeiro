import pool from '../config/db.js';

export const getTransactions = async (req, res) => {
  try {
    const query = `
      SELECT t.*, c.nome as categoria_nome 
      FROM transacoes t 
      LEFT JOIN categorias c ON t.categoria_id = c.id 
      ORDER BY t.data DESC
    `;
    const { rows } = await pool.query(query);
    res.json(rows);
  } catch (error) {
    console.error('Erro ao buscar transações:', error);
    res.status(500).json({ error: 'Erro interno do servidor ao buscar transações' });
  }
};

export const createTransaction = async (req, res) => {
  const { usuario_id, categoria_id, descricao, valor, data, tipo } = req.body;
  try {
    const query = `
      INSERT INTO transacoes (usuario_id, categoria_id, descricao, valor, data, tipo) 
      VALUES ($1, $2, $3, $4, $5, $6) 
      RETURNING *
    `;
    const values = [usuario_id, categoria_id, descricao, valor, data, tipo];
    const { rows } = await pool.query(query, values);
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error('Erro ao criar transação:', error);
    res.status(500).json({ error: 'Erro interno do servidor ao criar transação' });
  }
};
