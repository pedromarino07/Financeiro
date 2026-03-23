/**
 * Funções de API: Gerenciador de Finanças Pessoais
 * Faz chamadas fetch() para o backend
 */

const API_BASE_URL = '/api/transacoes';

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
        const response = await fetch(url);
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
        const response = await fetch(url);
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
 * Envia uma nova transação para o servidor
 * @param {Object} transacao 
 */
async function postTransacao(transacao) {
    try {
        const response = await fetch(API_BASE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
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
        const response = await fetch(url);
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
        const response = await fetch(`${API_BASE_URL}/periodos-disponiveis`);
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
 * Envia uma requisição DELETE para remover uma transação
 * @param {number} id 
 */
async function deleteTransacao(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/${id}`, {
            method: 'DELETE'
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
