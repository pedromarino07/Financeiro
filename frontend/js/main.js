/**
 * Lógica do Frontend: Gerenciador de Finanças Pessoais
 * Desenvolvido por Pedro Marino Viana Lima
 */

let myChart = null; // Armazena a instância do gráfico

document.addEventListener('DOMContentLoaded', () => {
    // Verificar se o usuário está logado
    const usuarioId = localStorage.getItem('usuarioId');
    const usuarioNome = localStorage.getItem('usuarioNome');

    if (!usuarioId) {
        // Se não estiver logado, redireciona para o login
        window.location.href = 'login.html';
        return;
    }

    // Exibir informações do usuário
    const userDisplay = document.getElementById('user-display');
    const userName = document.getElementById('user-name');
    const btnLogout = document.getElementById('btn-logout');

    if (userDisplay && userName) {
        userName.textContent = usuarioNome;
        userDisplay.style.display = 'flex';
    }

    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            localStorage.removeItem('usuarioId');
            localStorage.removeItem('usuarioNome');
            window.location.href = 'login.html';
        });
    }

    carregarDashboard(usuarioId);
    
    // Adiciona o listener para o formulário
    const form = document.getElementById('finance-form');
    if (form) {
        form.addEventListener('submit', (e) => enviarTransacao(e, usuarioId));
    }
});

/**
 * Função principal que carrega os dados do dashboard
 */
async function carregarDashboard(usuarioId) {
    try {
        // Chama as funções de api.js para buscar os dados
        const resumo = await getResumo(usuarioId);
        const transacoes = await getListaTransacoes(usuarioId);
        const dadosGrafico = await getDadosGrafico(usuarioId);
        
        // Preenche os cards de resumo (DOM)
        preencherCards(resumo);
        
        // Preenche a tabela de transações (DOM)
        preencherTabela(transacoes);

        // Renderiza o gráfico de rosca
        renderizarGrafico(dadosGrafico);
        
    } catch (error) {
        console.error('Erro ao carregar dashboard:', error);
        alert('Não foi possível carregar os dados do dashboard. Verifique a conexão com o servidor.');
    }
}

/**
 * Renderiza o gráfico de rosca usando Chart.js
 * @param {Array} dados 
 */
function renderizarGrafico(dados) {
    const ctx = document.getElementById('expensesChart').getContext('2d');

    // Se já existir um gráfico, destrói para criar um novo (evita bugs de hover)
    if (myChart) {
        myChart.destroy();
    }

    if (dados.length === 0) {
        // Opcional: mostrar mensagem de "sem dados" no canvas
        return;
    }

    const labels = dados.map(d => d.categoria);
    const valores = dados.map(d => d.total);

    myChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: valores,
                backgroundColor: [
                    '#2c3e50', '#e74c3c', '#27ae60', '#f1c40f', 
                    '#8e44ad', '#3498db', '#d35400'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        boxWidth: 12,
                        padding: 20,
                        font: {
                            size: 12
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: R$ ${value.toFixed(2)} (${percentage}%)`;
                        }
                    }
                }
            },
            cutout: '70%' // Efeito de rosca (donut)
        }
    });
}

/**
 * Captura os dados do formulário e envia para o backend
 * @param {Event} event 
 * @param {string} usuarioId
 */
async function enviarTransacao(event, usuarioId) {
    event.preventDefault();
    
    const descricao = document.getElementById('descricao').value;
    const valor = parseFloat(document.getElementById('valor').value);
    const data = document.getElementById('data').value;
    const categoria = document.getElementById('categoria').value;
    const tipo = document.getElementById('tipo').value;

    // Validação básica no frontend
    if (valor <= 0) {
        alert('O valor deve ser maior que zero.');
        return;
    }

    const novaTransacao = {
        descricao,
        valor,
        data,
        categoria,
        tipo,
        usuario_id: usuarioId
    };

    try {
        await postTransacao(novaTransacao);
        
        // Limpa o formulário após sucesso
        event.target.reset();
        
        // Atualiza o dashboard automaticamente
        await carregarDashboard(usuarioId);
        
        alert('Transação adicionada com sucesso!');
    } catch (error) {
        alert('Erro ao adicionar transação: ' + error.message);
    }
}

/**
 * Pega os valores de resumo e preenche os cards na interface
 * @param {Object} resumo 
 */
function preencherCards(resumo) {
    const format = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    
    // Pega os elementos do DOM e atualiza os valores reais
    document.getElementById('total-income').textContent = format(resumo.total_entradas);
    document.getElementById('total-expense').textContent = format(resumo.total_saidas);
    document.getElementById('total-investment').textContent = format(resumo.total_guardado || 0);
    document.getElementById('total-balance').textContent = format(resumo.saldo);
}

/**
 * Pega a lista de transações e cria dinamicamente as linhas na tabela
 * @param {Array} transacoes 
 */
function preencherTabela(transacoes) {
    const tbody = document.getElementById('transactions-body');
    tbody.innerHTML = ''; // Limpa a tabela antes de popular

    if (transacoes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 2rem; color: #7f8c8d;">Nenhuma transação encontrada.</td></tr>';
        return;
    }

    transacoes.forEach(transaction => {
        const row = document.createElement('tr');
        
        // Formatação de valores e datas
        const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
        const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString('pt-BR');
        
        const typeClass = `type-${transaction.tipo.toLowerCase()}`;
        const typeLabel = transaction.tipo.charAt(0).toUpperCase() + transaction.tipo.slice(1);

        // Criação dinâmica da linha (<tr>)
        row.innerHTML = `
            <td>${transaction.descricao}</td>
            <td class="${typeClass}">${formatCurrency(transaction.valor)}</td>
            <td>${formatDate(transaction.data)}</td>
            <td>${transaction.categoria}</td>
            <td><span class="${typeClass}">${typeLabel}</span></td>
        `;
        
        tbody.appendChild(row);
    });
}
