'use strict';

/* ============================================================
   classificador.js — Classificação de notícias via OpenAI
   Radar Ilhéus | gpt-4o-mini

   Uso:
     const { classificarNoticia } = require('./classificador');
     const r = await classificarNoticia({ titulo, conteudo }, client);
     // r.classificacao: 'urgente'|'alerta'|'politica'|'positiva'|'comum'
   ============================================================ */

const CATEGORIAS = ['urgente', 'alerta', 'politica', 'positiva', 'comum'];

const PALAVRAS_CHAVE = {
  urgente: [
    'morreu','morte','mortal','óbito','faleceu','vítima fatal',
    'acidente','colisão','capotamento','atropelamento',
    'baleado','tiros','assassinato','homicídio','latrocínio','esfaqueado',
    'incêndio','explosão','desabamento','desmoronamento','deslizamento',
    'afogado','desaparecido','resgate','socorro imediato',
    'emergência','catástrofe','tragédia','bloqueio total','interdição',
    'sequestro','reféns','tiroteio','confronto armado',
    'risco de vida','vítima','ferido grave',
  ],
  alerta: [
    'alerta','risco','atenção','aviso','perigo iminente',
    'dengue','leptospirose','surto','epidemia','contaminação','vírus',
    'chuvas fortes','temporal','alagamento','enchente','inundação',
    'falta de água','sem abastecimento','falta de luz','apagão','blecaute',
    'greve','paralisação','paralisa','interrupção do serviço',
    'recall','adulterado','impróprio para consumo',
    'erosão','cratera','risco de queda','estrutura comprometida',
    'alerta meteorológico','previsão de chuva','nível do rio',
  ],
  politica: [
    'prefeito','vice-prefeito','vereador','câmara municipal','prefeitura',
    'secretário','secretaria municipal','governo do estado',
    'licitação','contrato público','lei municipal','projeto de lei','decreto',
    'eleição','candidato','partido','coligação','campanha eleitoral',
    'governador','deputado','senador','congresso','assembleia',
    'orçamento','emenda','convênio','repasse federal','verba pública',
    'ministério público','mp','tcm','tcu','tribunal de contas',
    'improbidade','corrupção','desvio','fraude','irregularidade',
    'gestão municipal','administração pública','serviço público',
  ],
  positiva: [
    'inauguração','entrega de obras','abertura','lançamento',
    'premiação','prêmio','medalha','campeão','título','troféu',
    'conquista','vitória','aprovação','aprovado','selecionado',
    'investimento','novo emprego','vagas abertas','crescimento',
    'recorde','histórico','melhor resultado','destaque nacional',
    'parceria','acordo','benefício','melhoria','obra concluída',
    'concurso aprovado','formatura','certificação',
    'festival','celebração','homenagem','reconhecimento',
    'expansão','nova unidade','novo serviço',
  ],
};

const SINAIS_IMPACTO = [
  'toda a população','toda a cidade','bairros inteiros',
  'centenas de pessoas','milhares de','afeta moradores',
  'saúde pública','risco coletivo','acesso bloqueado',
  'escola fechada','hospital interditado','serviço suspenso',
];

/* ── Pré-classificador local ─────────────────────────────── */
function analisarPalavras(texto) {
  const norm = s => s.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const t = norm(texto);

  const scores      = { urgente: 0, alerta: 0, politica: 0, positiva: 0, comum: 0 };
  const encontradas = { urgente: [], alerta: [], politica: [], positiva: [] };

  for (const [cat, palavras] of Object.entries(PALAVRAS_CHAVE)) {
    for (const p of palavras) {
      if (t.includes(norm(p))) {
        scores[cat]++;
        if (!encontradas[cat].includes(p)) encontradas[cat].push(p);
      }
    }
  }

  const temAltoImpacto = SINAIS_IMPACTO.some(s => t.includes(norm(s)));
  if (temAltoImpacto) {
    if (scores.urgente > 0) scores.urgente += 2;
    if (scores.alerta  > 0) scores.alerta  += 2;
  }

  const ORDEM = ['urgente', 'alerta', 'politica', 'positiva', 'comum'];
  let categoria = 'comum';
  let melhor    = 0;

  for (const cat of ORDEM) {
    if (scores[cat] > melhor) {
      melhor    = scores[cat];
      categoria = cat;
    }
  }

  const total     = Object.values(scores).reduce((a, b) => a + b, 0);
  const ratio     = total > 0 ? melhor / total : 0;
  const confianca = ratio >= 0.60 ? 'alta' : ratio >= 0.35 ? 'media' : 'baixa';

  return { categoria, scores, confianca, encontradas: encontradas[categoria] || [], temAltoImpacto };
}

/* ── Prompt ──────────────────────────────────────────────── */
const SYSTEM_PROMPT = `Você é classificador automático de notícias do "Radar Ilhéus", portal focado em Ilhéus e sul da Bahia.

Categorias:
urgente  → Risco IMEDIATO à vida: acidente com vítima, crime em andamento, catástrofe
alerta   → Situação EM DESENVOLVIMENTO que pode piorar: epidemia, temporal, greve, falta de serviço
politica → Governo, câmara, eleições, licitações, contratos públicos, sem urgência de risco
positiva → Conquista, inauguração, premiação, crescimento, benefício à comunidade
comum    → Rotina, agenda, evento sem urgência ou impacto significativo

Prioridade em dúvida: urgente > alerta > politica > positiva > comum

Retorne APENAS JSON puro, sem markdown.
Formato: {"classificacao":"urgente","justificativa":"Uma frase direta explicando a escolha"}`;

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

/* ── Função principal — exportada ────────────────────────── */

async function classificarNoticia({ titulo = '', conteudo = '' }, client) {
  const texto = [titulo, conteudo].filter(Boolean).join('\n\n').trim();

  if (!texto || texto.length < 15) {
    const err = new Error('Envie título e/ou conteúdo da notícia (mínimo 15 caracteres).');
    err.status = 400;
    throw err;
  }

  const pre = analisarPalavras(texto);

  let dicas = '';
  if (pre.encontradas.length > 0) {
    dicas = `\n\nPalavras-chave detectadas (categoria pré-sugerida: ${pre.categoria}, confiança: ${pre.confianca}):\n→ ${pre.encontradas.slice(0, 8).join(', ')}`;
  }
  if (pre.temAltoImpacto) {
    dicas += '\n→ Sinal de ALTO IMPACTO: envolve muitas pessoas ou serviço essencial.';
  }

  const userMsg = titulo
    ? `Título: ${titulo}\n\nConteúdo:\n${conteudo}${dicas}`
    : `Conteúdo:\n${conteudo}${dicas}`;

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 256,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user',   content: userMsg }
    ]
  });

  const raw = response.choices[0]?.message?.content;
  if (!raw) throw new Error('Resposta vazia da IA.');

  const resultado = extrairJSON(raw);

  const classificacao = (resultado.classificacao || '').toLowerCase().trim();
  if (!CATEGORIAS.includes(classificacao)) {
    throw new Error(`Categoria inválida retornada pela IA: "${classificacao}"`);
  }

  const confianca = classificacao === pre.categoria
    ? (pre.confianca === 'alta' ? 'alta' : 'media')
    : 'media';

  return {
    classificacao,
    justificativa:  (resultado.justificativa || '').trim(),
    confianca,
    palavras_chave: pre.encontradas,
  };
}

module.exports = { classificarNoticia, analisarPalavras };
