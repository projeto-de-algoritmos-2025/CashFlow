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