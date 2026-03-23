import pool from '../config/db.js';

export const getTransactions = async (req, res) => {
  try {
    // Busca TUDO da tabela, sem filtrar por usuário para ser compartilhado
    const { rows } = await pool.query('SELECT * FROM transacoes ORDER BY data DESC');
    res.json(rows);
  } catch (error) {
    console.error('Erro no Banco:', error);
    res.status(500).json({ error: error.message });
  }
};

export const createTransaction = async (req, res) => {
  const { usuario_id, categoria, descricao, valor, data, tipo } = req.body;
  try {
    const query = `
      INSERT INTO transacoes (usuario_id, categoria, descricao, valor, data, tipo) 
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
    `;
    const values = [usuario_id, categoria, descricao, valor, data, tipo];
    const { rows } = await pool.query(query, values);
    res.status(201).json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Se você tiver uma rota de resumo separada, ela deve ser assim:
export const getSummary = async (req, res) => {
  try {
    const query = `
      SELECT 
        SUM(CASE WHEN tipo = 'entrada' THEN valor ELSE 0 END) as total_entradas,
        SUM(CASE WHEN tipo = 'saida' AND categoria != 'Investimentos' THEN valor ELSE 0 END) as total_saidas,
        SUM(CASE WHEN categoria = 'Investimentos' THEN valor ELSE 0 END) as total_guardado
      FROM transacoes
    `;
    const { rows } = await pool.query(query);
    const resumo = rows[0];
    const saldo = (resumo.total_entradas || 0) - (resumo.total_saidas || 0) - (resumo.total_guardado || 0);
    res.json({ ...resumo, saldo });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};