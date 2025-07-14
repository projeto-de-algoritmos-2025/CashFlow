import collections
from datetime import datetime

from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

# --- ESTADO GLOBAL ---
caixa_disponivel = {}
# Nova lista para guardar o histórico de todas as operações
historico_operacoes = []

# Denominações e Mapeamentos (sem alterações)
denominacoes = [10000, 5000, 2000, 1000, 500, 200, 100, 50, 25, 10, 5, 1]
mapa_denominacoes_str = {
    10000: "R$ 100,00", 5000: "R$ 50,00", 2000: "R$ 20,00",
    1000: "R$ 10,00", 500: "R$ 5,00", 200: "R$ 2,00",
    100: "R$ 1,00", 50: "R$ 0.50", 25: "R$ 0.25",
    10: "R$ 0.10", 5: "R$ 0.05", 1: "R$ 0.01"
}

def calcular_saldo_total():
    """Calcula o valor total em dinheiro no caixa."""
    return sum(den * qtd for den, qtd in caixa_disponivel.items()) / 100.0

@app.route('/')
def index():
    return render_template('index.html')

# --- NOVA ROTA PARA OBTER O RELATÓRIO ---
@app.route('/api/relatorio', methods=['GET'])
def get_relatorio():
    """Retorna o histórico de operações."""
    return jsonify(historico_operacoes)

@app.route('/api/setup_caixa', methods=['POST'])
def setup_caixa():
    global caixa_disponivel, historico_operacoes
    dados = request.get_json()
    try:
        caixa_disponivel = {int(k): int(v) for k, v in dados.items()}
        
        # --- LOG DA OPERAÇÃO ---
        log_entry = {
            "timestamp": datetime.now().strftime('%d/%m/%Y %H:%M:%S'),
            "tipo": "Carregamento de Caixa",
            "detalhes": caixa_disponivel.copy(),
            "saldo_final": calcular_saldo_total()
        }
        historico_operacoes.append(log_entry)
        # --- FIM DO LOG ---

        print(f"Caixa configurado: {caixa_disponivel}")
        return jsonify({"status": "sucesso", "mensagem": "Caixa configurado com sucesso!"})
    except (ValueError, TypeError):
        return jsonify({"status": "erro", "mensagem": "Dados de configuração inválidos."}), 400
    


@app.route('/api/calcular_troco', methods=['POST'])
def calcular_troco_endpoint():
    global caixa_disponivel, historico_operacoes
    dados = request.get_json()
    try:
        valor_troco_reais = float(dados['troco'])
        valor_troco_centavos = int(round(valor_troco_reais * 100))
    except (ValueError, KeyError):
        return jsonify({"status": "erro", "mensagem": "Valor de troco inválido."}), 400
    if valor_troco_centavos < 0:
        return jsonify({"status": "erro", "mensagem": "O valor pago não pode ser menor que o total da compra."}), 400
    if valor_troco_centavos == 0:
        return jsonify({"status": "sucesso", "troco": {}, "caixa_atualizado": caixa_disponivel})

    dp = [None] * (valor_troco_centavos + 1)
    dp[0] = collections.Counter()
    for den in denominacoes:
        qtd_disponivel = caixa_disponivel.get(den, 0)
        if qtd_disponivel <= 0: continue
        for valor in range(den, valor_troco_centavos + 1):
            valor_anterior = valor - den
            if dp[valor_anterior] is not None:
                if dp[valor_anterior][den] < qtd_disponivel:
                    nova_combinacao = dp[valor_anterior].copy()
                    nova_combinacao[den] += 1
                    if dp[valor] is None or sum(nova_combinacao.values()) < sum(dp[valor].values()):
                        dp[valor] = nova_combinacao
    
    solucao_final = dp[valor_troco_centavos]
    if solucao_final is None:
        return jsonify({"status": "erro", "mensagem": "Não é possível dar o troco exato com as notas/moedas disponíveis."})

    troco_final = dict(solucao_final)
    
    # Atualiza o caixa real
    for den, qtd in troco_final.items():
        caixa_disponivel[den] -= qtd
    
    # --- LOG DA OPERAÇÃO ---
    log_entry = {
        "timestamp": datetime.now().strftime('%d/%m/%Y %H:%M:%S'),
        "tipo": "Retirada para Troco",
        "detalhes": troco_final,
        "saldo_final": calcular_saldo_total()
    }
    historico_operacoes.append(log_entry)
    # --- FIM DO LOG ---

    return jsonify({
        "status": "sucesso",
        "troco": troco_final,
        "caixa_atualizado": caixa_disponivel
    })

if __name__ == '__main__':
    app.run(debug=True)