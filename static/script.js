document.addEventListener('DOMContentLoaded', function () {
    // --- Seletores de Elementos ---
    const dashboardView = document.getElementById('dashboard-view');
    const reportsView = document.getElementById('reports-view');
    const aboutView = document.getElementById('about-view');
    const navDashboard = document.getElementById('nav-dashboard');
    const navRelatorios = document.getElementById('nav-relatorios');
    const navSobre = document.getElementById('nav-sobre');
    const cashDrawerInputs = document.getElementById('cash-drawer-inputs');
    const btnLoadCash = document.getElementById('btn-load-cash');
    const btnCalculateChange = document.getElementById('btn-calculate-change');
    const totalCompraInput = document.getElementById('total-compra');
    const valorPagoInput = document.getElementById('valor-pago');
    const totalChangeValue = document.getElementById('total-change-value');
    const changeBreakdown = document.getElementById('change-breakdown');
    const setupFeedback = document.getElementById('setup-feedback');
    const calculationFeedback = document.getElementById('calculation-feedback');
    const reportTableBody = document.getElementById('report-table-body');
    const btnExportCsv = document.getElementById('btn-export-csv');

    // --- Estado da Aplicação ---
    let reportData = [];

    // --- Mapeamentos e Constantes ---
    const denominations = [10000, 5000, 2000, 1000, 500, 200, 100, 50, 25, 10, 5, 1];
    const denominationMap = {
        10000: "R$ 100,00", 5000: "R$ 50,00", 2000: "R$ 20,00",
        1000: "R$ 10,00", 500: "R$ 5,00", 200: "R$ 2,00",
        100: "R$ 1,00", 50: "R$ 0.50", 25: "R$ 0.25",
        10: "R$ 0.10", 5: "R$ 0.05", 1: "R$ 0.01"
    };

    // --- LÓGICA DE NAVEGAÇÃO ---
    function showView(viewToShow) {
        dashboardView.classList.add('hidden');
        reportsView.classList.add('hidden');
        aboutView.classList.add('hidden');
        document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));

        if (viewToShow === 'dashboard') {
            dashboardView.classList.remove('hidden');
            navDashboard.classList.add('active');
        } else if (viewToShow === 'reports') {
            reportsView.classList.remove('hidden');
            navRelatorios.classList.add('active');
            fetchAndRenderReport();
        } else if (viewToShow === 'about') {
            aboutView.classList.remove('hidden');
            navSobre.classList.add('active');
        }
    }

    navDashboard.addEventListener('click', (e) => { e.preventDefault(); showView('dashboard'); });
    navRelatorios.addEventListener('click', (e) => { e.preventDefault(); showView('reports'); });
    navSobre.addEventListener('click', (e) => { e.preventDefault(); showView('about'); });

    // --- LÓGICA DO DASHBOARD ---
    function generateCashDrawerInputs() {
        cashDrawerInputs.innerHTML = '';
        denominations.forEach(den => {
            const valueInReais = denominationMap[den].replace(',00', '').replace(',50', 'c').replace(',25', 'c').replace(',10', 'c').replace(',05', 'c').replace(',01', 'c');
            const group = document.createElement('div');
            group.classList.add('input-group');
            group.innerHTML = `<label for="den-${den}">${valueInReais}</label><input type="number" id="den-${den}" data-value="${den}" value="20" min="0">`;
            cashDrawerInputs.appendChild(group);
        });
    }

    btnLoadCash.addEventListener('click', async () => {
        const payload = {};
        const inputs = cashDrawerInputs.querySelectorAll('input[type="number"]');
        inputs.forEach(input => { payload[input.dataset.value] = input.value; });
        try {
            const response = await fetch('/api/setup_caixa', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            const result = await response.json();
            showFeedback(setupFeedback, result.mensagem, result.status);
        } catch (error) {
            showFeedback(setupFeedback, 'Erro de comunicação com o servidor.', 'error');
        }
    });

    btnCalculateChange.addEventListener('click', async () => {
        const totalCompra = parseFloat(totalCompraInput.value);
        const valorPago = parseFloat(valorPagoInput.value);
        if (isNaN(totalCompra) || isNaN(valorPago)) {
            showFeedback(calculationFeedback, 'Por favor, insira valores válidos.', 'error'); return;
        }
        const troco = valorPago - totalCompra;
        totalChangeValue.textContent = `R$ ${troco.toFixed(2).replace('.', ',')}`;
        calculationFeedback.style.display = 'none';
        changeBreakdown.innerHTML = '<p class="placeholder-text">Calculando...</p>';
        try {
            const response = await fetch('/api/calcular_troco', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ troco: troco }) });
            const result = await response.json();
            if (result.status === 'sucesso') {
                updateChangeDisplay(result.troco);
                updateCashDrawerDisplay(result.caixa_atualizado);
            } else {
                showFeedback(calculationFeedback, result.mensagem, 'error');
                changeBreakdown.innerHTML = '<p class="placeholder-text">Falha no cálculo.</p>';
            }
        } catch (error) {
            showFeedback(calculationFeedback, 'Erro de comunicação com o servidor.', 'error');
        }
    });

    function updateChangeDisplay(troco) {
        changeBreakdown.innerHTML = '';
        const sortedDenominations = Object.keys(troco).map(Number).sort((a, b) => b - a);
        if (sortedDenominations.length === 0) {
            changeBreakdown.innerHTML = '<p class="placeholder-text">Não há troco a ser dado.</p>'; return;
        }
        sortedDenominations.forEach(den => {
            const count = troco[den];
            const item = document.createElement('div');
            item.classList.add('change-item');
            item.innerHTML = `<span class="note">${denominationMap[den]}</span><span class="quantity">x ${count}</span>`;
            changeBreakdown.appendChild(item);
        });
    }

    function updateCashDrawerDisplay(caixa) {
        Object.keys(caixa).forEach(den => {
            const input = document.getElementById(`den-${den}`);
            if (input) { input.value = caixa[den]; }
        });
    }

    // --- LÓGICA DOS RELATÓRIOS ---
    async function fetchAndRenderReport() {
        try {
            const response = await fetch('/api/relatorio');
            reportData = await response.json();
            reportTableBody.innerHTML = '';
            if (reportData.length === 0) {
                reportTableBody.innerHTML = `<tr><td colspan="14" style="text-align: center; padding: 2rem;">Nenhuma operação registrada ainda.</td></tr>`;
                return;
            }
            reportData.forEach(log => {
                const row = document.createElement('tr');
                let cells = `<td>${log.timestamp}</td><td>${log.tipo}</td>`;
                denominations.forEach(den => {
                    const qtd = log.detalhes[den] || 0;
                    const isNonZero = qtd > 0;
                    cells += `<td class="quantity-cell ${isNonZero ? 'non-zero' : ''}">${qtd}</td>`;
                });
                cells += `<td>R$ ${log.saldo_final.toFixed(2).replace('.', ',')}</td>`;
                row.innerHTML = cells;
                reportTableBody.appendChild(row);
            });
        } catch (error) {
            console.error("Erro ao buscar relatório:", error);
            reportTableBody.innerHTML = `<tr><td colspan="14" style="text-align: center; color: var(--error-color);">Erro ao carregar dados.</td></tr>`;
        }
    }

    // --- LÓGICA DE EXPORTAÇÃO CSV ---
    btnExportCsv.addEventListener('click', () => {
        if (reportData.length === 0) {
            alert("Não há dados para exportar.");
            return;
        }
        const escapeCsvField = (field) => {
            const stringField = String(field);
            return `"${stringField.replace(/"/g, '""')}"`;
        };
        const headers = [
            "Data/Hora", "Tipo de Operacao",
            ...denominations.map(den => denominationMap[den]),
            "Saldo Final (R$)"
        ];
        const headerRow = headers.map(escapeCsvField).join(',');
        const dataRows = reportData.map(log => {
            const rowData = [
                log.timestamp,
                log.tipo,
                ...denominations.map(den => log.detalhes[den] || 0),
                log.saldo_final.toFixed(2).replace('.', ',')
            ];
            return rowData.map(escapeCsvField).join(',');
        });
        const csvString = [headerRow, ...dataRows].join('\n');
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", "relatorio_cashflow.csv");
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    });

    // --- Funções Utilitárias ---
    function showFeedback(element, message, type) {
        element.textContent = message;
        element.className = `feedback ${type}`;
        element.style.display = 'block';
        setTimeout(() => { element.style.display = 'none'; }, 5000);
    }
    // --- INICIALIZAÇÃO ---
    generateCashDrawerInputs();
    showView('dashboard');
});