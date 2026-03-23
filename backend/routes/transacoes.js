import express from 'express';
import pool from '../config/db.js';

const router = express.Router();

/**
 * Rota: GET /api/transacoes/resumo
 * Calcula o total de entradas, total de saídas e o saldo usando SQL puro (SUM())
 */
router.get('/resumo', async (req, res) => {
  try {
    const query = `
      SELECT 
        COALESCE(SUM(CASE WHEN tipo = 'entrada' THEN valor ELSE 0 END), 0) as total_entradas,
        COALESCE(SUM(CASE WHEN tipo = 'saida' AND categoria NOT IN ('Investimentos', 'Poupança', 'Ações') THEN valor ELSE 0 END), 0) as total_saidas_comuns,
        COALESCE(SUM(CASE WHEN tipo = 'saida' AND categoria IN ('Investimentos', 'Poupança', 'Ações') THEN valor ELSE 0 END), 0) as total_guardado
      FROM transacoes
    `;
    const { rows } = await pool.query(query);
    const { total_entradas, total_saidas_comuns, total_guardado } = rows[0];
    
    // Saldo Livre = Total Entradas - (Total Saídas Comuns + Total Guardado)
    const saldo_livre = parseFloat(total_entradas) - (parseFloat(total_saidas_comuns) + parseFloat(total_guardado));

    res.json({
      total_entradas: parseFloat(total_entradas),
      total_saidas: parseFloat(total_saidas_comuns), // Mantendo nome para compatibilidade se necessário
      total_guardado: parseFloat(total_guardado),
      saldo: saldo_livre
    });
  } catch (error) {
    console.error('Erro ao buscar resumo das transações:', error);
    res.status(500).json({ error: 'Erro interno do servidor ao buscar resumo' });
  }
});

/**
 * Rota: GET /api/transacoes/lista
 * Retorna a lista das últimas 5 transações ordenadas por data
 */
router.get('/lista', async (req, res) => {
  try {
    const query = `
      SELECT * FROM transacoes 
      ORDER BY data DESC, criado_em DESC 
      LIMIT 5
    `;
    const { rows } = await pool.query(query);
    res.json(rows);
  } catch (error) {
    console.error('Erro ao buscar lista de transações:', error);
    res.status(500).json({ error: 'Erro interno do servidor ao buscar lista' });
  }
});

/**
 * Rota: POST /api/transacoes
 * Recebe os dados da nova transação e insere no banco de dados
 */
router.post('/', async (req, res) => {
  const { descricao, valor, data, categoria, tipo } = req.body;

  // Validação no backend
  if (!descricao || !valor || !data || !categoria || !tipo) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
  }

  if (parseFloat(valor) <= 0) {
    return res.status(400).json({ error: 'O valor deve ser maior que zero.' });
  }

  try {
    const query = `
      INSERT INTO transacoes (descricao, valor, data, categoria, tipo)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const values = [descricao, valor, data, categoria, tipo];
    const { rows } = await pool.query(query, values);
    
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error('Erro ao inserir transação:', error);
    res.status(500).json({ error: 'Erro interno do servidor ao salvar transação' });
  }
});

export default router;
