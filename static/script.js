

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