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
  const usuario_id = req.usuario_id;

  if (!usuario_id) {
    return res.status(401).json({ error: 'Usuário não autenticado' });
  }

  try {
    let whereClause = "WHERE tipo = 'saida' AND usuario_id = $1";
    const values = [usuario_id];
    
    if (mes && ano) {
      whereClause += ' AND EXTRACT(MONTH FROM data) = $2 AND EXTRACT(YEAR FROM data) = $3';
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
    console.error('Erro na Query (Gráfico):', error);
    // Retorna array vazio em caso de erro para não quebrar o gráfico no frontend
    res.status(200).json([]);
  }
});

export default router;
