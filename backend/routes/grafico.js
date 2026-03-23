import express from 'express';
import pool from '../config/db.js';

const router = express.Router();

/**
 * Rota: GET /api/grafico/despesas
 * Agrupa as transações de 'saida' por categoria e soma os valores
 */
router.get('/despesas', async (req, res) => {
  // Removemos a obrigatoriedade do usuario_id para ser compartilhado
  try {
    const query = `
      SELECT categoria, SUM(valor) as total 
      FROM transacoes 
      WHERE tipo = 'saida' 
      GROUP BY categoria
    `;
    
    // Note que agora passamos apenas a query, sem o array [usuario_id]
    const { rows } = await pool.query(query);
    
    const data = rows.map(row => ({
      categoria: row.categoria,
      total: parseFloat(row.total)
    }));

    res.json(data);
  } catch (error) {
    console.error('Erro ao buscar dados do gráfico:', error);
    res.status(500).json({ error: 'Erro interno ao buscar dados do gráfico' });
  }
});

export default router;
