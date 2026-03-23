/**
 * Lógica do Frontend: Gerenciador de Finanças Pessoais
 * Desenvolvido por Pedro Marino Viana Lima
 */

let myChart = null; // Armazena a instância do gráfico
let currentPage = 1; // Página atual da tabela
const itemsPerPage = 5; // Limite de itens por página

document.addEventListener('DOMContentLoaded', () => {
    // 1. Verificar se o usuário está logado
    const usuarioId = localStorage.getItem('usuarioId');
    const usuarioNome = localStorage.getItem('usuarioNome');

    if (!usuarioId) {
        window.location.href = 'login.html';
        return;
    }

    // 2. Configurar Modo Escuro/Claro
    const themeToggle = document.getElementById('theme-toggle');
    const currentTheme = localStorage.getItem('theme') || 'light';
    
    if (currentTheme === 'dark') {
        document.body.classList.add('dark-mode');
    }
    atualizarIconeTema();

    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        const isDark = document.body.classList.contains('dark-mode');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        
        atualizarIconeTema();
        
        // Atualiza o gráfico se existir
        if (myChart) {
            carregarDashboard();
        }
    });

    // 3. Configurar Filtro Mensal
    const periodFilter = document.getElementById('periodo');
    
    // 4. Exibir informações do usuário
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

    // 5. Carregar dados iniciais
    carregarPeriodosEPagina();
    
    const form = document.getElementById('finance-form');
    if (form) {
        form.addEventListener('submit', (e) => enviarTransacao(e, usuarioId));
    }

    periodFilter.addEventListener('change', () => {
        localStorage.setItem('filtroPeriodo', periodFilter.value);
        currentPage = 1; // Resetar para a primeira página ao mudar o filtro
        carregarDashboard();
    });

    // 6. Configurar Paginação
    const btnPrev = document.getElementById('prev-page');
    const btnNext = document.getElementById('next-page');

    if (btnPrev && btnNext) {
        btnPrev.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                carregarDashboard();
            }
        });

        btnNext.addEventListener('click', () => {
            currentPage++;
            carregarDashboard();
        });
    }

    // 7. Criar container de toasts
    const toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
});

/**
 * Carrega os períodos disponíveis e então carrega o dashboard
 */
async function carregarPeriodosEPagina() {
    const periodFilter = document.getElementById('periodo');
    try {
        const periodos = await getPeriodosDisponiveis();
        
        // Limpa o select
        periodFilter.innerHTML = '';
        
        if (periodos.length === 0) {
            const agora = new Date();
            const mesAtual = agora.getMonth(); // 0-indexed: 2 para Março
            const anoAtual = agora.getFullYear();
            const option = document.createElement('option');
            option.value = `${mesAtual}-${anoAtual}`;
            option.textContent = `${getNomeMes(mesAtual)} ${anoAtual}`;
            periodFilter.appendChild(option);
        } else {
            periodos.forEach(p => {
                const option = document.createElement('option');
                // Ajusta mês do backend (1-indexed) para frontend (0-indexed)
                const mesZeroIndexed = p.mes - 1;
                option.value = `${mesZeroIndexed}-${p.ano}`;
                option.textContent = `${getNomeMes(mesZeroIndexed)} ${p.ano}`;
                periodFilter.appendChild(option);
            });
        }

        // Recuperar filtro salvo ou usar o atual/primeiro disponível
        const filtroSalvo = localStorage.getItem('filtroPeriodo');
        if (filtroSalvo && Array.from(periodFilter.options).some(opt => opt.value === filtroSalvo)) {
            periodFilter.value = filtroSalvo;
        } else {
            // Se não houver filtro salvo ou o salvo não existir mais, pega o primeiro (mais recente)
            periodFilter.selectedIndex = 0;
            localStorage.setItem('filtroPeriodo', periodFilter.value);
        }

        // Carregar dashboard após popular períodos
        carregarDashboard();
    } catch (error) {
        console.error('Erro ao carregar períodos:', error);
        // Fallback básico em caso de erro
        const agora = new Date();
        const mesAtual = agora.getMonth() + 1;
        const anoAtual = agora.getFullYear();
        periodFilter.innerHTML = `<option value="${mesAtual}-${anoAtual}">${getNomeMes(mesAtual)} ${anoAtual}</option>`;
        carregarDashboard();
    }
}

/**
 * Retorna o nome do mês a partir do número
 * @param {number} mes 
 */
function getNomeMes(mes) {
    const meses = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return meses[mes]; // mes 2 -> Março
}

/**
 * Atualiza o ícone do tema (Sol/Lua)
 */
function atualizarIconeTema() {
    const themeToggle = document.getElementById('theme-toggle');
    const isDark = document.body.classList.contains('dark-mode');
    
    // Substitui o conteúdo do botão para garantir que o Lucide funcione corretamente
    themeToggle.innerHTML = `<i data-lucide="${isDark ? 'sun' : 'moon'}"></i>`;
    lucide.createIcons();
}

/**
 * Função principal que carrega os dados do dashboard
 */
async function carregarDashboard() {
    try {
        const periodFilter = document.getElementById('periodo');
        if (!periodFilter.value) return;

        const [mes, ano] = periodFilter.value.split('-').map(Number);

        // Busca dados filtrados - Ajusta mês 0-indexed para 1-indexed para a API
        const resumo = await getResumo(mes + 1, ano);
        const listaData = await getListaTransacoes(mes + 1, ano, currentPage, itemsPerPage);
        const dadosGrafico = await getDadosGrafico(mes + 1, ano);
        
        preencherCards(resumo);
        preencherTabela(listaData.transacoes);
        renderizarGrafico(dadosGrafico);
        
        // Atualiza controles de paginação
        atualizarPaginacao(listaData.pagina, listaData.totalPaginas);
        
    } catch (error) {
        console.error('Erro ao carregar dashboard:', error);
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

    const isMobile = window.innerWidth < 768;
    const isDarkMode = document.body.classList.contains('dark-mode');
    const textColor = isDarkMode ? '#e0e0e0' : '#7f8c8d';

    myChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: valores,
                backgroundColor: [
                    '#3d5afe', '#e74c3c', '#27ae60', '#f1c40f', 
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
                        color: textColor,
                        boxWidth: isMobile ? 8 : 12,
                        padding: isMobile ? 10 : 20,
                        font: {
                            size: isMobile ? 10 : 12
                        }
                    }
                },
                tooltip: {
                    bodyFont: {
                        size: isMobile ? 10 : 12
                    },
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
        
        // Atualiza o dashboard e os períodos automaticamente
        await carregarPeriodosEPagina();
        
        showToast('Transação adicionada com sucesso!', 'success');
    } catch (error) {
        showToast('Erro ao adicionar transação: ' + error.message, 'error');
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
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem; color: #7f8c8d;">Nenhuma transação encontrada.</td></tr>';
        return;
    }

    transacoes.forEach(transaction => {
        const row = document.createElement('tr');
        
        // Formatação de valores e datas
        const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
        const formatDate = (dateStr) => {
            const d = new Date(dateStr);
            return d.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
        };
        
        const typeClass = `type-${transaction.tipo.toLowerCase()}`;
        const typeLabel = transaction.tipo.charAt(0).toUpperCase() + transaction.tipo.slice(1);

        // Criação dinâmica da linha (<tr>)
        row.innerHTML = `
            <td data-label="Descrição">${transaction.descricao}</td>
            <td data-label="Valor" class="${typeClass}">${formatCurrency(transaction.valor)}</td>
            <td data-label="Data">${formatDate(transaction.data)}</td>
            <td data-label="Categoria">${transaction.categoria}</td>
            <td data-label="Tipo"><span class="${typeClass}">${typeLabel}</span></td>
            <td>
                <button class="btn-delete" onclick="excluirTransacao('${transaction.id}')" title="Excluir">
                    <i data-lucide="trash-2"></i>
                </button>
            </td>
        `;
        
        tbody.appendChild(row);
    });

    // Inicializa os ícones da tabela
    lucide.createIcons();
}

/**
 * Exclui uma transação após confirmação
 * @param {string} id 
 */
async function excluirTransacao(id) {
    console.log('Tentando excluir ID:', id);
    if (confirm('Tem certeza que deseja excluir esta transação?')) {
        try {
            await deleteTransacao(id);
            // Se excluir o último item da página, volta uma página (se não for a primeira)
            const tbody = document.getElementById('transactions-body');
            if (tbody.children.length === 1 && currentPage > 1) {
                currentPage--;
            }
            // Recarrega o dashboard para atualizar cards, gráfico e tabela
            await carregarDashboard();
            // Também recarrega os períodos caso a exclusão tenha removido o último registro de um mês
            await carregarPeriodosEPagina();
            
            showToast('Transação excluída com sucesso!', 'success');
        } catch (error) {
            showToast('Erro ao excluir: ' + error.message, 'error');
        }
    }
}

// Torna a função global para que o onclick no HTML funcione
window.excluirTransacao = excluirTransacao;

/**
 * Exibe uma notificação toast na tela
 * @param {string} message 
 * @param {string} type 'success' | 'error'
 */
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const iconName = type === 'success' ? 'check-circle' : 'alert-circle';
    
    toast.innerHTML = `
        <i data-lucide="${iconName}"></i>
        <span>${message}</span>
    `;

    container.appendChild(toast);
    lucide.createIcons();

    // Remove o toast após 3 segundos
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

/**
 * Atualiza os controles de paginação na interface
 * @param {number} pagina 
 * @param {number} totalPaginas 
 */
function atualizarPaginacao(pagina, totalPaginas) {
    const btnPrev = document.getElementById('prev-page');
    const btnNext = document.getElementById('next-page');
    const pageInfo = document.getElementById('page-info');

    if (btnPrev && btnNext && pageInfo) {
        currentPage = pagina;
        pageInfo.textContent = `Página ${pagina} de ${totalPaginas || 1}`;
        
        btnPrev.disabled = pagina <= 1;
        btnNext.disabled = pagina >= totalPaginas || totalPaginas === 0;
    }
}
