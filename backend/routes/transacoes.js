import express from 'express';
import pool from '../config/db.js';

const router = express.Router();

/**
 * Rota: GET /api/transacoes
 * Retorna todas as transações do usuário logado
 */
router.get('/', async (req, res) => {
  const usuario_id = req.usuario_id;

  if (!usuario_id) {
    return res.status(401).json({ error: 'Usuário não autenticado' });
  }

  try {
    const query = 'SELECT * FROM transacoes WHERE usuario_id = $1 ORDER BY data DESC, criado_em DESC';
    const { rows } = await pool.query(query, [usuario_id]);
    res.json(rows);
  } catch (error) {
    console.error('Erro ao buscar transações:', error);
    res.status(500).json({ error: 'Erro no banco' });
  }
});

/**
 * Rota: GET /api/transacoes/resumo
 * Calcula o total de entradas, saídas comuns, total guardado e o saldo livre
 * Aceita parâmetros opcionais de mês e ano
 */
router.get('/resumo', async (req, res) => {
  const { mes, ano } = req.query;
  const usuario_id = req.usuario_id;

  if (!usuario_id) {
    return res.status(401).json({ error: 'Usuário não autenticado' });
  }

  try {
    const values = [usuario_id];
    let filterClause = '';
    let cumulativeParams = '';

    if (mes && ano) {
      filterClause = ' AND EXTRACT(MONTH FROM data) = $2 AND EXTRACT(YEAR FROM data) = $3';
      values.push(parseInt(mes), parseInt(ano));
      // Filtro para acumulado: tudo até o final do mês selecionado
      cumulativeParams = ' AND data < (make_date($3, $2, 1) + interval \'1 month\')';
    }

    const query = `
      SELECT 
        (SELECT COALESCE(SUM(valor), 0) FROM transacoes WHERE usuario_id = $1 AND tipo = 'entrada' AND categoria NOT IN ('Poupança', 'Investimentos', 'Ações') ${filterClause}) as total_entradas,
        (SELECT COALESCE(SUM(valor), 0) FROM transacoes WHERE usuario_id = $1 AND tipo = 'saida' AND categoria NOT IN ('Poupança', 'Investimentos', 'Ações') ${filterClause}) as total_saidas_comuns,
        (SELECT COALESCE(SUM(CASE WHEN tipo = 'entrada' THEN valor ELSE -valor END), 0) FROM transacoes WHERE usuario_id = $1 AND categoria IN ('Poupança', 'Investimentos', 'Ações') ${cumulativeParams}) as total_guardado,
        (SELECT COALESCE(SUM(valor), 0) FROM transacoes WHERE usuario_id = $1 AND tipo = 'saida' AND pago = TRUE ${filterClause}) as total_pago,
        (SELECT COALESCE(SUM(valor), 0) FROM transacoes WHERE usuario_id = $1 AND tipo = 'saida' AND pago = FALSE ${filterClause}) as total_pendente
    `;
    const { rows } = await pool.query(query, values);
    const summary = rows[0] || {};
    
    const total_entradas = parseFloat(summary.total_entradas || 0);
    const total_saidas_comuns = parseFloat(summary.total_saidas_comuns || 0);
    const total_guardado = parseFloat(summary.total_guardado || 0);
    const total_pago = parseFloat(summary.total_pago || 0);
    const total_pendente = parseFloat(summary.total_pendente || 0);
    
    // Regra de Negócio: Saldo Livre = Entradas Reais - Saídas Comuns - Investimento Líquido do Mês
    // Investimento Líquido do Mês = (Entradas de Poupança) - (Saídas de Poupança)
    const queryInvestMes = `SELECT COALESCE(SUM(CASE WHEN tipo = 'entrada' THEN valor ELSE -valor END), 0) as invest_mes FROM transacoes WHERE usuario_id = $1 AND categoria IN ('Poupança', 'Investimentos', 'Ações') ${filterClause}`;
    const resInvestMes = await pool.query(queryInvestMes, values);
    const total_invest_mes = parseFloat(resInvestMes.rows[0]?.invest_mes || 0);

    const saldo_livre = total_entradas - total_saidas_comuns - total_invest_mes;

    res.json({
      total_entradas,
      total_saidas: total_saidas_comuns,
      total_guardado, 
      total_pago,
      total_pendente,
      saldo: saldo_livre
    });
  } catch (error) {
    console.error('ERRO CRÍTICO NO RESUMO:', {
      message: error.message,
      stack: error.stack,
      params: { mes, ano, usuario_id }
    });
    res.status(500).json({ 
      error: 'Erro no banco',
      details: error.message 
    });
  }
});

/**
 * Rota: GET /api/transacoes/lista
 * Retorna a lista de transações paginada
 * Aceita parâmetros opcionais de mês, ano, pagina e limite
 */
router.get('/lista', async (req, res) => {
  const { mes, ano, pagina = 1, limite = 5 } = req.query;
  const usuario_id = req.usuario_id;
  const page = parseInt(pagina);
  const limit = parseInt(limite);
  const offset = (page - 1) * limit;

  if (!usuario_id) {
    return res.status(401).json({ error: 'Usuário não autenticado' });
  }

  try {
    let whereClause = 'WHERE usuario_id = $1';
    const values = [usuario_id];
    
    if (mes && ano) {
      whereClause += ' AND EXTRACT(MONTH FROM data) = $2 AND EXTRACT(YEAR FROM data) = $3';
      values.push(parseInt(mes), parseInt(ano));
    }

    // Query para contar o total de registros
    const countQuery = `SELECT COUNT(*) FROM transacoes ${whereClause}`;
    const countResult = await pool.query(countQuery, values);
    const totalRecords = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalRecords / limit);

    // Query para buscar os dados paginados - Otimizada para buscar apenas o necessário
    const dataQuery = `
      SELECT id, descricao, valor, data, categoria, tipo, cartao_nome, parcela_atual, total_parcelas, usuario_nome, pago
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
    res.status(500).json({ error: 'Erro no banco' });
  }
});

/**
 * Rota: GET /api/transacoes/todas
 * Retorna todas as transações de um mês sem paginação
 */
router.get('/todas', async (req, res) => {
  const { mes, ano } = req.query;
  const usuario_id = req.usuario_id;

  if (!usuario_id) {
    return res.status(401).json({ error: 'Usuário não autenticado' });
  }

  try {
    let whereClause = 'WHERE usuario_id = $1';
    const values = [usuario_id];
    
    if (mes && ano) {
      whereClause += ' AND EXTRACT(MONTH FROM data) = $2 AND EXTRACT(YEAR FROM data) = $3';
      values.push(parseInt(mes), parseInt(ano));
    }

    const query = `
      SELECT id, descricao, valor, data, categoria, tipo, cartao_nome, parcela_atual, total_parcelas, usuario_nome, pago
      FROM transacoes 
      ${whereClause}
      ORDER BY data DESC, criado_em DESC
    `;
    const { rows } = await pool.query(query, values);
    
    const transacoes = rows.map(t => ({
      ...t,
      valor: parseFloat(t.valor)
    }));
    
    res.json(transacoes);
  } catch (error) {
    console.error('Erro ao buscar todas as transações:', error);
    res.status(500).json({ error: 'Erro no banco' });
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
    usuario_nome,
    cartao_nome, 
    total_parcelas 
  } = req.body;
  const usuario_id = req.usuario_id || req.body.usuario_id;

  if (!usuario_id) {
    return res.status(401).json({ error: 'Usuário não autenticado' });
  }

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
      error: 'Erro no banco',
      details: error.message,
      code: error.code
    });
  }
});

/**
 * Rota: GET /api/transacoes/periodos-disponiveis
 * Busca meses e anos únicos que possuem transações
 */
router.get('/periodos-disponiveis', async (req, res) => {
  const usuario_id = req.usuario_id;

  if (!usuario_id) {
    return res.status(401).json({ error: 'Usuário não autenticado' });
  }

  try {
    const query = `
      SELECT DISTINCT 
        EXTRACT(MONTH FROM data) AS mes, 
        EXTRACT(YEAR FROM data) AS ano 
      FROM transacoes 
      WHERE usuario_id = $1
      ORDER BY ano DESC, mes DESC;
    `;
    const { rows } = await pool.query(query, [usuario_id]);
    
    // Converte os valores para inteiros
    const periodos = rows.map(row => ({
      mes: parseInt(row.mes),
      ano: parseInt(row.ano)
    }));
    
    res.json(periodos);
  } catch (error) {
    console.error('Erro ao buscar períodos disponíveis:', error);
    res.status(500).json({ error: 'Erro no banco' });
  }
});

/**
 * Rota: DELETE /api/transacoes/:id
 * Remove uma transação pelo ID
 */
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const usuario_id = req.usuario_id;

  if (!usuario_id) {
    return res.status(401).json({ error: 'Usuário não autenticado' });
  }

  try {
    const query = 'DELETE FROM transacoes WHERE id = $1 AND usuario_id = $2 RETURNING *';
    const { rows } = await pool.query(query, [id, usuario_id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Transação não encontrada.' });
    }
    
    res.json({ message: 'Transação excluída com sucesso.', transacao: rows[0] });
  } catch (error) {
    console.error('Erro ao excluir transação:', error);
    res.status(500).json({ error: 'Erro no banco' });
  }
});

/**
 * Rota: PATCH /api/transacoes/:id/pago
 * Inverte o status de pagamento de uma transação
 */
router.patch('/:id/pago', async (req, res) => {
  const { id } = req.params;
  const { pago } = req.body;
  const usuario_id = req.usuario_id;

  if (!usuario_id) {
    return res.status(401).json({ error: 'Usuário não autenticado' });
  }

  try {
    const query = 'UPDATE transacoes SET pago = $1 WHERE id = $2 AND usuario_id = $3 RETURNING *';
    const { rows } = await pool.query(query, [pago, id, usuario_id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Transação não encontrada.' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('Erro ao atualizar status de pagamento:', error);
    res.status(500).json({ error: 'Erro no banco' });
  }
});

export default router;
