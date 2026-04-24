'use strict';

/* ============================================================
   social.js — Geração de conteúdo para Instagram via OpenAI
   Radar Ilhéus (@radarilheus) | gpt-4o-mini

   Uso:
     const { gerarSocial } = require('./social');
     const r = await gerarSocial(textoNoticia, client);
     // r: { titulo, legenda, chamada, hashtags, stories }
   ============================================================ */

const SYSTEM_PROMPT = `Você é especialista em conteúdo viral para Instagram de portais de notícias brasileiros.
Perfil: @radarilheus — notícias de Ilhéus e sul da Bahia.
Público: moradores de Ilhéus e região, 18-45 anos, no smartphone.

Gere exatamente 5 campos em JSON. Siga cada regra à risca.

━━━ TÍTULO (campo: titulo) ━━━
• Máximo 35 caracteres — vai SOBREPOSTO na foto, lido em 1 segundo
• Use uma dessas técnicas:
  – MAIÚSCULAS para urgência ("RECORDE HISTÓRICO")
  – Número + fato curto ("R$ 42 MI PARA ILHÉUS")
  – Pergunta de 1 linha ("ISSO VAI MUDAR ILHÉUS?")
  – Palavra de ação + sujeito ("CHEGOU A NOVA UBS")
• PROIBIDO copiar título da notícia original

━━━ LEGENDA (campo: legenda) ━━━
Estrutura obrigatória em 4 blocos separados por \\n\\n:

[GANCHO] — 1 frase que para o scroll. Começa com emoji forte.
[FATO] — 2 frases simples. O quê aconteceu, quem está envolvido.
[DETALHE] — 1 frase com o número, prazo ou impacto mais relevante.
[CONEXÃO LOCAL] — 1 frase: "Pra quem mora em...", "Quem passa por...", "Se você é de Ilhéus..."

Total: máximo 280 caracteres. Sem hashtags aqui. Máximo 4 emojis no total.

━━━ CTA (campo: chamada) ━━━
• Máximo 75 caracteres + 1 emoji obrigatório
• NOTÍCIA POLÊMICA → pergunta ("O que você acha? 👇")
• NOTÍCIA ÚTIL → salvar ("Salva pra não esquecer 🔖")
• NOTÍCIA URGENTE → compartilhar ("Compartilha pra avisar todos ⚠️")
• NOTÍCIA POSITIVA → marcar pessoa ("Marca quem vai gostar disso 🙌")
• NOTÍCIA LOCAL → identificação ("É do bairro? Conta como tá aí 📍")

━━━ HASHTAGS (campo: hashtags) ━━━
Array com exatamente 12 tags:
  – 2 fixas: "#ilheus" e "#ilheusba"
  – 1 fixa: "#radarilheus"
  – 4 temáticas do assunto
  – 3 regionais: "#bahia", "#nordeste" ou "#brasil"
  – 2 de categoria: tipo #politicabahia, #saúdepública, etc.
Todas em minúsculas, com #, sem espaço.

━━━ STORIES (campo: stories) ━━━
• Máximo 90 caracteres
• Começa com emoji forte (⚡🚨✅🔴📍💥🏆)
• Uma frase que PARA O DEDO no scroll
• Diferente do título — ângulo diferente

━━━ SAÍDA ━━━
Retorne APENAS JSON puro. Sem markdown, sem blocos de código.
Formato exato:
{
  "titulo":   "TEXTO",
  "legenda":  "bloco 1\\n\\nbloco 2\\n\\nbloco 3\\n\\nbloco 4",
  "chamada":  "CTA com emoji 👇",
  "hashtags": ["#ilheus","#ilheusba","#radarilheus","...mais 9"],
  "stories":  "⚡ Frase curta impactante"
}`;

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

function validar(obj) {
  const campos = ['titulo', 'legenda', 'chamada', 'hashtags', 'stories'];
  for (const c of campos) {
    if (!obj[c]) throw new Error(`Campo ausente na resposta da IA: "${c}"`);
  }
  if (!Array.isArray(obj.hashtags) || obj.hashtags.length === 0) {
    throw new Error('Campo "hashtags" deve ser um array não vazio.');
  }
}

function normalizar(obj) {
  const hashtags = obj.hashtags.map(t =>
    typeof t === 'string' ? (t.startsWith('#') ? t : '#' + t) : t
  );
  return {
    titulo:   obj.titulo.trim(),
    legenda:  obj.legenda.trim(),
    chamada:  obj.chamada.trim(),
    hashtags,
    stories:  obj.stories.trim(),
  };
}

/* ── Função principal — exportada ────────────────────────── */

async function gerarSocial(noticia, client) {
  if (!noticia || noticia.trim().length < 20) {
    const err = new Error('Envie o texto da notícia (mínimo 20 caracteres).');
    err.status = 400;
    throw err;
  }

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 1024,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user',   content: `Notícia:\n\n${noticia.trim()}` }
    ]
  });

  const raw = response.choices[0]?.message?.content;
  if (!raw) throw new Error('Resposta vazia da IA.');

  const resultado = extrairJSON(raw);
  validar(resultado);

  return normalizar(resultado);
}

module.exports = { gerarSocial };
