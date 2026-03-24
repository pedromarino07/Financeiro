import express from 'express';
import pool from '../config/db.js';

const router = express.Router();

/**
 * Rota: GET /api/transacoes/resumo
 * Calcula o total de entradas, saídas comuns, total guardado e o saldo livre
 * Aceita parâmetros opcionais de mês e ano
 */
router.get('/resumo', async (req, res) => {
  const { mes, ano } = req.query;
  try {
    let whereClause = '';
    const values = [];
    
    if (mes && ano) {
      whereClause = 'WHERE EXTRACT(MONTH FROM data) = $1 AND EXTRACT(YEAR FROM data) = $2';
      values.push(parseInt(mes), parseInt(ano));
    }

    const query = `
      SELECT 
        COALESCE(SUM(CASE WHEN tipo = 'entrada' THEN valor ELSE 0 END), 0) as total_entradas,
        COALESCE(SUM(CASE WHEN tipo = 'saida' AND categoria NOT IN ('Poupança', 'Investimentos') THEN valor ELSE 0 END), 0) as total_saidas_comuns,
        COALESCE(SUM(CASE WHEN tipo = 'saida' AND categoria IN ('Poupança', 'Investimentos') THEN valor ELSE 0 END), 0) as total_guardado
      FROM transacoes
      ${whereClause};
    `;
    const { rows } = await pool.query(query, values);
    
    const total_entradas = parseFloat(rows[0].total_entradas);
    const total_saidas_comuns = parseFloat(rows[0].total_saidas_comuns);
    const total_guardado = parseFloat(rows[0].total_guardado);
    
    // Regra de Negócio: Saldo Livre = Entradas - Saídas Comuns - Total Guardado
    const saldo_livre = total_entradas - total_saidas_comuns - total_guardado;

    res.json({
      total_entradas: total_entradas,
      total_saidas: total_saidas_comuns,
      total_guardado: total_guardado,
      saldo: saldo_livre
    });
  } catch (error) {
    console.error('Erro ao buscar resumo das transações:', error);
    res.status(500).json({ error: 'Erro interno do servidor ao buscar resumo' });
  }
});

/**
 * Rota: GET /api/transacoes/lista
 * Retorna a lista de transações paginada
 * Aceita parâmetros opcionais de mês, ano, pagina e limite
 */
router.get('/lista', async (req, res) => {
  const { mes, ano, pagina = 1, limite = 5 } = req.query;
  const page = parseInt(pagina);
  const limit = parseInt(limite);
  const offset = (page - 1) * limit;

  try {
    let whereClause = '';
    const values = [];
    
    if (mes && ano) {
      whereClause = 'WHERE EXTRACT(MONTH FROM data) = $1 AND EXTRACT(YEAR FROM data) = $2';
      values.push(parseInt(mes), parseInt(ano));
    }

    // Query para contar o total de registros
    const countQuery = `SELECT COUNT(*) FROM transacoes ${whereClause}`;
    const countResult = await pool.query(countQuery, values);
    const totalRecords = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalRecords / limit);

    // Query para buscar os dados paginados - Otimizada para buscar apenas o necessário
    const dataQuery = `
      SELECT id, descricao, valor, data, categoria, tipo, cartao_nome, parcela_atual, total_parcelas, usuario_nome
      FROM transacoes 
      ${whereClause}
      ORDER BY data DESC, criado_em DESC 
      LIMIT $${values.length + 1} OFFSET $${values.length + 2}
    `;
    const dataValues = [...values, limit, offset];
    const { rows } = await pool.query(dataQuery, dataValues);
    
    // Garante que o valor seja numérico antes de enviar ao frontend
    const transacoes = rows.map(t => ({
      ...t,
      valor: parseFloat(t.valor)
    }));
    
    res.json({
      transacoes,
      pagina: page,
      totalPaginas: totalPages,
      totalRegistros: totalRecords
    });
  } catch (error) {
    console.error('Erro ao buscar lista de transações:', error);
    res.status(500).json({ error: 'Erro interno do servidor ao buscar lista' });
  }
});

/**
 * Rota: POST /api/transacoes
 * Recebe os dados da nova transação e insere no banco de dados.
 * Suporta parcelamento (loop de inserção) e salva o nome do autor.
 */
router.post('/', async (req, res) => {
  const { 
    descricao, 
    valor, 
    data, 
    categoria, 
    tipo, 
    usuario_id, 
    usuario_nome,
    cartao_nome, 
    total_parcelas 
  } = req.body;

  console.log('Recebendo nova transação:', req.body);

  // Validação básica
  if (!descricao || !valor || !data || !categoria || !tipo) {
    return res.status(400).json({ error: 'Campos obrigatórios ausentes (descricao, valor, data, categoria, tipo).' });
  }

  try {
    const numParcelas = parseInt(total_parcelas) || 1;
    const valorTotal = parseFloat(valor);
    const valorParcela = valorTotal / numParcelas;
    const transacoesInseridas = [];

    // Loop para inserção de parcelas
    for (let i = 0; i < numParcelas; i++) {
      // Calcula a data da parcela (adiciona i meses)
      const dataObjeto = new Date(data + 'T12:00:00'); // T12:00:00 evita problemas de fuso horário
      dataObjeto.setMonth(dataObjeto.getMonth() + i);
      const dataFormatada = dataObjeto.toISOString().split('T')[0];
      
      // Descrição com indicação de parcela se houver mais de uma
      const descricaoFinal = numParcelas > 1 
        ? `${descricao} (${i + 1}/${numParcelas})` 
        : descricao;

      // Query de inserção
      // Nota: usuario_id pode ser nulo se o frontend não enviar, mas usuario_nome é salvo conforme solicitado
      const query = `
        INSERT INTO transacoes (
          descricao, 
          valor, 
          data, 
          categoria, 
          tipo, 
          usuario_id, 
          usuario_nome,
          cartao_nome, 
          parcela_atual, 
          total_parcelas
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `;
      
      const values = [
        descricaoFinal, 
        valorParcela, 
        dataFormatada, 
        categoria, 
        tipo, 
        usuario_id ? parseInt(usuario_id) : null,
        usuario_nome || 'Sistema',
        cartao_nome || null,
        numParcelas > 1 ? (i + 1) : null,
        numParcelas > 1 ? numParcelas : null
      ];
      
      const { rows } = await pool.query(query, values);
      transacoesInseridas.push(rows[0]);
    }
    
    // Retorna a primeira transação inserida (ou todas se preferir)
    res.status(201).json(transacoesInseridas[0]);
  } catch (error) {
    console.error('ERRO CRÍTICO AO SALVAR TRANSAÇÃO:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor ao salvar transação',
      details: error.message,
      code: error.code // Útil para debugar erros do Postgres (ex: 42703 para coluna inexistente)
    });
  }
});

/**
 * Rota: GET /api/transacoes/periodos-disponiveis
 * Busca meses e anos únicos que possuem transações
 */
router.get('/periodos-disponiveis', async (req, res) => {
  try {
    const query = `
      SELECT DISTINCT 
        EXTRACT(MONTH FROM data) AS mes, 
        EXTRACT(YEAR FROM data) AS ano 
      FROM transacoes 
      ORDER BY ano DESC, mes DESC;
    `;
    const { rows } = await pool.query(query);
    
    // Converte os valores para inteiros
    const periodos = rows.map(row => ({
      mes: parseInt(row.mes),
      ano: parseInt(row.ano)
    }));
    
    res.json(periodos);
  } catch (error) {
    console.error('Erro ao buscar períodos disponíveis:', error);
    res.status(500).json({ error: 'Erro interno do servidor ao buscar períodos' });
  }
});

/**
 * Rota: DELETE /api/transacoes/:id
 * Remove uma transação pelo ID
 */
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const query = 'DELETE FROM transacoes WHERE id = $1 RETURNING *';
    const { rows } = await pool.query(query, [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Transação não encontrada.' });
    }
    
    res.json({ message: 'Transação excluída com sucesso.', transacao: rows[0] });
  } catch (error) {
    console.error('Erro ao excluir transação:', error);
    res.status(500).json({ error: 'Erro interno do servidor ao excluir transação' });
  }
});

export default router;
