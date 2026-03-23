/**
 * Funções de API: Gerenciador de Finanças Pessoais
 * Faz chamadas fetch() para o backend
 */

const API_BASE_URL = '/api/transacoes';

/**
 * Busca o resumo financeiro (entradas, saídas e saldo)
 */
async function getResumo() {
    try {
        const response = await fetch(`${API_BASE_URL}/resumo`);
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
 * Busca as últimas 5 transações registradas
 */
async function getListaTransacoes() {
    try {
        const response = await fetch(`${API_BASE_URL}/lista`);
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
 */
async function getDadosGrafico() {
    try {
        const response = await fetch('/api/grafico/despesas');
        if (!response.ok) {
            throw new Error('Erro ao buscar dados do gráfico');
        }
        return await response.json();
    } catch (error) {
        console.error('Erro na API (Gráfico):', error);
        throw error;
    }
}
