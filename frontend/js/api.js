/**
 * Funções de API: Gerenciador de Finanças Pessoais
 * Faz chamadas fetch() para o backend
 */

const API_BASE_URL = '/api/transacoes';

/**
 * Retorna os headers padrão, incluindo o ID do usuário para privacidade
 */
function getHeaders() {
    const usuarioId = sessionStorage.getItem('usuarioId');
    const headers = {
        'Content-Type': 'application/json'
    };
    if (usuarioId) {
        headers['X-User-ID'] = usuarioId;
    }
    return headers;
}

/**
 * Busca o resumo financeiro (entradas, saídas e saldo)
 * @param {number} mes 
 * @param {number} ano 
 */
async function getResumo(mes, ano) {
    try {
        let url = `${API_BASE_URL}/resumo`;
        if (mes && ano) {
            url += `?mes=${mes}&ano=${ano}`;
        }
        const response = await fetch(url, {
            headers: getHeaders()
        });
        if (!response.ok) {
            throw new Error('Erro ao buscar resumo financeiro');
        }
        return await response.json();
    } catch (error) {
        console.error('Erro na API (Resumo):', error);
        throw error;
    }
}

/**
 * Busca as transações registradas com paginação
 * @param {number} mes 
 * @param {number} ano 
 * @param {number} pagina
 * @param {number} limite
 */
async function getListaTransacoes(mes, ano, pagina = 1, limite = 5) {
    try {
        let url = `${API_BASE_URL}/lista?pagina=${pagina}&limite=${limite}`;
        if (mes && ano) {
            url += `&mes=${mes}&ano=${ano}`;
        }
        const response = await fetch(url, {
            headers: getHeaders()
        });
        if (!response.ok) {
            throw new Error('Erro ao buscar lista de transações');
        }
        return await response.json();
    } catch (error) {
        console.error('Erro na API (Lista):', error);
        throw error;
    }
}

/**
 * Busca todas as transações de um período (sem paginação)
 * @param {number} mes 
 * @param {number} ano 
 */
async function getTodasTransacoes(mes, ano) {
    try {
        let url = `${API_BASE_URL}/todas`;
        if (mes && ano) {
            url += `?mes=${mes}&ano=${ano}`;
        }
        const response = await fetch(url, {
            headers: getHeaders()
        });
        if (!response.ok) {
            throw new Error('Erro ao buscar todas as transações');
        }
        return await response.json();
    } catch (error) {
        console.error('Erro na API (Todas):', error);
        throw error;
    }
}

/**
 * Envia uma nova transação para o servidor
 * @param {Object} transacao 
 */
async function postTransacao(transacao) {
    try {
        const response = await fetch(API_BASE_URL, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(transacao)
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Erro ao salvar transação');
        }
        return await response.json();
    } catch (error) {
        console.error('Erro na API (POST):', error);
        throw error;
    }
}

/**
 * Busca dados para o gráfico de despesas por categoria
 * @param {number} mes 
 * @param {number} ano 
 */
async function getDadosGrafico(mes, ano) {
    try {
        let url = '/api/grafico/despesas';
        if (mes && ano) {
            url += `?mes=${mes}&ano=${ano}`;
        }
        const response = await fetch(url, {
            headers: getHeaders()
        });
        if (!response.ok) {
            throw new Error('Erro ao buscar dados do gráfico');
        }
        return await response.json();
    } catch (error) {
        console.error('Erro na API (Gráfico):', error);
        throw error;
    }
}

/**
 * Busca os períodos (mês/ano) que possuem transações
 */
async function getPeriodosDisponiveis() {
    try {
        const response = await fetch(`${API_BASE_URL}/periodos-disponiveis`, {
            headers: getHeaders()
        });
        if (!response.ok) {
            throw new Error('Erro ao buscar períodos disponíveis');
        }
        return await response.json();
    } catch (error) {
        console.error('Erro na API (Períodos):', error);
        throw error;
    }
}

/**
 * Envia uma requisição PATCH para alternar o status de pagamento
 * @param {number} id 
 * @param {boolean} pago 
 */
async function patchPago(id, pago) {
    try {
        const response = await fetch(`${API_BASE_URL}/${id}/pago`, {
            method: 'PATCH',
            headers: getHeaders(),
            body: JSON.stringify({ pago })
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Erro ao atualizar status de pagamento');
        }
        return await response.json();
    } catch (error) {
        console.error('Erro na API (PATCH Pago):', error);
        throw error;
    }
}

/**
 * Envia uma requisição DELETE para remover uma transação
 * @param {number} id 
 */
async function deleteTransacao(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/${id}`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Erro ao excluir transação');
        }
        return await response.json();
    } catch (error) {
        console.error('Erro na API (DELETE):', error);
        throw error;
    }
}
