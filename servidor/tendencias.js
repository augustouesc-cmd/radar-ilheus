'use strict';

/* ============================================================
   tendencias.js — Análise de tendências via OpenAI
   Radar Ilhéus | gpt-4o-mini

   Uso:
     const { analisarTendencias } = require('./tendencias');
     const r = await analisarTendencias(artigos, client);
     // r: { tendencias, alertas, sugestoes, sinais_analisados, timestamp }
   ============================================================ */

/* ── Pool de sinais simulados ────────────────────────────── */
const SINAIS_POOL = [
  // Segurança / Urgência
  'Acidente com veículos na BR-101 km 432 sentido Itabuna bloqueia pista',
  'Incêndio de pequenas proporções em estabelecimento comercial no Centro de Ilhéus',
  'Polícia Militar intensifica patrulhamento em bairros após registros de assaltos',
  'Tiroteio registrado no Salobrinho deixa dois feridos, segundo PM',
  'Deslizamento de terra interdita estrada vicinal entre Ilhéus e Uruçuca',

  // Clima / Alerta
  'Temporal causa alagamentos nos bairros Pontalzinho e Salobrinho',
  'INMET emite alerta laranja de chuvas intensas para o sul da Bahia nas próximas 48h',
  'Risco de deslizamento em encostas do Malhado após chuvas consecutivas',
  'Previsão do tempo indica chuvas acima da média para os próximos 10 dias em Ilhéus',
  'Nível do Rio Cachoeira sobe e Defesa Civil monitora margens',

  // Saúde
  'Vigilância em Saúde confirma alta de 40% nos casos de dengue em Ilhéus no mês',
  'Secretaria Municipal de Saúde convoca agentes de saúde para reunião urgente',
  'Nova UTI pediátrica é entregue à população no Hospital Regional de Ilhéus',
  'Campanha de vacinação contra gripe começa segunda-feira em todas as UBS',

  // Serviços / Infraestrutura
  'Embasa prevê interrupção no abastecimento de água em 5 bairros de Ilhéus amanhã',
  'Motoristas de ônibus ameaçam paralisar serviço por atraso nos salários',
  'Greve dos servidores da saúde municipal entra no segundo dia em Ilhéus',
  'Moradores do Nossa Senhora da Vitória protestam por terceiro dia contra falta de água',
  'Escola estadual em Ilhéus é interditada por risco estrutural',

  // Política / Gestão
  'Câmara Municipal vota projeto de reajuste do IPTU nesta terça-feira',
  'Prefeito anuncia convênio de R$ 8 milhões para pavimentação de ruas',
  'Audiência pública debate instalação de nova planta industrial no Porto de Ilhéus',
  'TCM apura irregularidades em licitação da Prefeitura de Ilhéus',

  // Positivas / Cultura / Economia
  'Festival do Chocolate de Ilhéus 2025 anuncia programação completa',
  'Ilhéus AC vence Vitória da Conquista e garante classificação',
  'Cacau de Ilhéus conquista prêmio internacional de qualidade em Londres',
  'Turismo no sul da Bahia cresce 28% na alta temporada — SETUR-BA',
  'Concurso público da Prefeitura de Ilhéus abre 350 vagas em diversas áreas',
  'Feira do Produtor Rural acontece neste fim de semana na Praça Castro Alves',
  'Grupo Pão de Açúcar confirma abertura de nova loja em Ilhéus em novembro',
];

/* ── Prompt ──────────────────────────────────────────────── */
const SYSTEM_PROMPT = `Você é analista de tendências jornalísticas para a redação do "Radar Ilhéus", portal de notícias de Ilhéus e sul da Bahia.

Analise os sinais de monitoramento e identifique tendências com base em:
- Urgência: está acontecendo agora ou nas próximas horas?
- Impacto: afeta muitas pessoas em Ilhéus/região?
- Risco: há risco à saúde, segurança ou bem-estar público?
- Relevância pública: a população precisa saber?
- Repetição: sinal que aparece mais de uma vez indica tendência crescente

Retorne APENAS JSON puro, sem markdown, sem blocos de código, sem texto extra.
Formato exato:
{
  "tendencias": [
    {
      "tema": "Nome curto do tema (máx 5 palavras)",
      "score": <número decimal 1.0 a 10.0>,
      "categoria": "urgente|alerta|politica|positiva|comum",
      "motivo": "Por que está em alta (máx 2 frases curtas)",
      "sinais": ["sinal relevante 1", "sinal relevante 2"]
    }
  ],
  "alertas": [
    {
      "tipo": "urgente|alerta|tendencia",
      "titulo": "Título do alerta (máx 8 palavras)",
      "descricao": "Detalhes do que está acontecendo (1-2 frases)",
      "acao": "O que a redação deve fazer agora (1 frase, verbo no imperativo)"
    }
  ],
  "sugestoes": [
    {
      "titulo_sugerido": "Título de notícia pronto, forte e viral (máx 90 chars)",
      "categoria": "Política|Saúde|Segurança|Economia|Cultura|Esportes|Cidades",
      "justificativa": "Por que publicar esta notícia agora (1 frase)",
      "angulo": "Ângulo/enfoque específico para a cobertura (1 frase)"
    }
  ]
}

Regras:
- Retorne exatamente 3 tendencias, ordenadas por score decrescente (mínimo score 4.0)
- Gere alertas APENAS para score >= 7.0 ou categorias urgente/alerta (0 a 3 alertas)
- Retorne exatamente 3 sugestoes alinhadas às tendências
- Se artigos já cobriram o tema, sugira um ângulo complementar diferente`;

/* ── Helpers ─────────────────────────────────────────────── */
function extrairJSON(raw) {
  const limpo = raw.trim()
    .replace(/^```json?\s*/i, '')
    .replace(/```\s*$/, '')
    .trim();
  try { return JSON.parse(limpo); } catch {
    const m = limpo.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]);
    throw new Error('Resposta da IA não é JSON válido.');
  }
}

function sortearSinais() {
  const embaralhados = [...SINAIS_POOL].sort(() => Math.random() - 0.5);
  const sinais = embaralhados.slice(0, 7 + Math.floor(Math.random() * 4));
  if (Math.random() > 0.6) {
    const idx = Math.floor(Math.random() * Math.min(3, sinais.length));
    sinais.splice(idx + 1, 0, sinais[idx]);
  }
  return sinais;
}

/* ── Função principal — exportada ────────────────────────── */

async function analisarTendencias(artigos, client) {
  const sinais = sortearSinais();

  const hora = new Date().toLocaleTimeString('pt-BR', {
    timeZone: 'America/Bahia', hour: '2-digit', minute: '2-digit'
  });

  const artigosCtx = artigos.length
    ? `\nArtigos já publicados:\n${artigos.slice(0, 8).map(a => `• ${a.title} [${a.category || 'Geral'}]`).join('\n')}`
    : '\nPortal sem artigos publicados ainda.';

  const userMsg = `Horário: ${hora} (Ilhéus, Bahia)\n\nSinais detectados:\n${sinais.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n${artigosCtx}`;

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 1800,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user',   content: userMsg }
    ]
  });

  const raw = response.choices[0]?.message?.content;
  if (!raw) throw new Error('Resposta vazia da IA.');

  const resultado = extrairJSON(raw);

  return {
    tendencias:        resultado.tendencias || [],
    alertas:           resultado.alertas    || [],
    sugestoes:         resultado.sugestoes  || [],
    sinais_analisados: sinais.length,
    timestamp:         new Date().toISOString(),
  };
}

module.exports = { analisarTendencias };
