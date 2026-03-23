import express from 'express';
import pool from '../config/db.js';

const router = express.Router();

/**
 * Rota: GET /api/grafico/despesas
 * Agrupa as transações de 'saida' por categoria e soma os valores
 * Aceita parâmetros opcionais de mês e ano
 */
router.get('/despesas', async (req, res) => {
  const { mes, ano } = req.query;
  try {
    let whereClause = "WHERE tipo = 'saida'";
    const values = [];
    
    if (mes && ano) {
      whereClause += ' AND EXTRACT(MONTH FROM data) = $1 AND EXTRACT(YEAR FROM data) = $2';
      values.push(parseInt(mes), parseInt(ano));
    }

    const query = `
      SELECT categoria, SUM(valor) as total
      FROM transacoes
      ${whereClause}
      GROUP BY categoria
      ORDER BY total DESC
    `;
    const { rows } = await pool.query(query, values);
    
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
