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
