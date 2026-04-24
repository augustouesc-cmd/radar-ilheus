'use strict';

/* ============================================================
   gerador.js — Geração de notícia via OpenAI
   Radar Ilhéus | gpt-4o-mini

   Uso:
     const { gerarNoticia } = require('./gerador');
     const resultado = await gerarNoticia(textoOriginal, client);
     // { titulo, subtitulo, resumo, versao_reescrita }
   ============================================================ */

const SYSTEM_PROMPT = `Você é redator sênior do "Radar Ilhéus", portal de notícias de Ilhéus e sul da Bahia.

Sua tarefa: receber uma notícia bruta e produzir 4 campos em JSON.

━━━ REGRAS POR CAMPO ━━━

titulo
  • Máximo 70 caracteres
  • Curto, forte, direto — estilo manchete viral
  • Deve despertar curiosidade ou urgência
  • PROIBIDO copiar frases do texto original
  • Contextualize em Ilhéus/Bahia se relevante

subtitulo
  • Máximo 140 caracteres
  • Complementa o título sem repeti-lo
  • Apresenta o fato central com um detalhe relevante

resumo
  • Exatamente 3 linhas separadas por \\n
  • Cada linha: uma frase curta e simples
  • Responda: o quê aconteceu, quem está envolvido, qual o impacto
  • Linguagem acessível — qualquer pessoa deve entender

versao_reescrita
  • Reescrita COMPLETA com suas próprias palavras
  • ZERO frases copiadas do original — reescreva tudo
  • Parágrafos curtos: 2 a 4 frases cada
  • Inclua contexto local (Ilhéus / sul da Bahia) quando pertinente
  • Tom informativo e envolvente, sem sensacionalismo
  • Termine com uma frase que aponte o próximo desdobramento

━━━ SAÍDA ━━━
Retorne APENAS JSON puro. Sem markdown, sem blocos de código, sem texto fora do JSON.
Formato exato:
{"titulo":"...","subtitulo":"...","resumo":"...","versao_reescrita":"..."}`;

/* ── Helpers ─────────────────────────────────────────────────── */

function extrairJSON(raw) {
  const limpo = raw.trim()
    .replace(/^```json?\s*/i, '')
    .replace(/```\s*$/, '')
    .trim();
  try {
    return JSON.parse(limpo);
  } catch {
    const match = limpo.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error('A IA não retornou JSON válido.');
  }
}

function validarCampos(obj) {
  const obrigatorios = ['titulo', 'subtitulo', 'resumo', 'versao_reescrita'];
  for (const campo of obrigatorios) {
    if (!obj[campo] || typeof obj[campo] !== 'string' || !obj[campo].trim()) {
      throw new Error(`Campo ausente ou vazio na resposta da IA: "${campo}"`);
    }
  }
}

/* ── Função principal ────────────────────────────────────────── */

async function gerarNoticia(texto, client) {
  if (!texto || texto.trim().length < 20) {
    const err = new Error('Envie o texto da notícia (mínimo 20 caracteres).');
    err.status = 400;
    throw err;
  }

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 2048,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user',   content: `Notícia original:\n\n${texto.trim()}` }
    ]
  });

  const raw = response.choices[0]?.message?.content;
  if (!raw) throw new Error('Resposta vazia da IA.');

  const resultado = extrairJSON(raw);
  validarCampos(resultado);

  return {
    titulo:           resultado.titulo.trim(),
    subtitulo:        resultado.subtitulo.trim(),
    resumo:           resultado.resumo.trim(),
    versao_reescrita: resultado.versao_reescrita.trim()
  };
}

module.exports = { gerarNoticia };
