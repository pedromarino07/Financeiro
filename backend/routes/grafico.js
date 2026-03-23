import express from 'express';
import pool from '../config/db.js';

const router = express.Router();

/**
 * Rota: GET /api/grafico/despesas
 * Agrupa as transações de 'saida' por categoria e soma os valores
 */
router.get('/despesas', async (req, res) => {
  const { usuario_id } = req.query;

  if (!usuario_id) {
    return res.status(400).json({ error: 'ID do usuário é obrigatório.' });
  }

  try {
    const query = `
      SELECT categoria, SUM(valor) as total
      FROM transacoes
      WHERE tipo = 'saida' AND usuario_id = $1
      GROUP BY categoria
      ORDER BY total DESC
    `;
    const { rows } = await pool.query(query, [usuario_id]);
    
    // Converte os valores para float
    const data = rows.map(row => ({
      categoria: row.categoria,
      total: parseFloat(row.total)
    }));

    res.json(data);
  } catch (error) {
    console.error('Erro ao buscar dados do gráfico:', error);
    res.status(500).json({ error: 'Erro interno do servidor ao buscar dados do gráfico' });
  }
});

export default router;
