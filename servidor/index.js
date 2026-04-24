'use strict';

require('dotenv').config();

// ── Diagnóstico da API key ─────────────────────────────────────────────────
const openaiKey = process.env.OPENAI_API_KEY;
if (!openaiKey || openaiKey === 'sua_chave_aqui') {
  console.warn('\n⚠  AVISO: OPENAI_API_KEY não configurada. Funcionalidades de IA indisponíveis.\n');
}

// ── Módulos opcionais (IA) — não derrubam o servidor se ausentes ──────────
let client             = null;
let gerarNoticia       = null;
let classificarNoticia = null;
let gerarSocial        = null;
let analisarTendencias = null;

try {
  const OpenAI = require('openai').default;
  if (openaiKey && openaiKey !== 'sua_chave_aqui') {
    client = new OpenAI({ apiKey: openaiKey });
  }
  gerarNoticia       = require('./gerador').gerarNoticia;
  classificarNoticia = require('./classificador').classificarNoticia;
  gerarSocial        = require('./social').gerarSocial;
  analisarTendencias = require('./tendencias').analisarTendencias;
} catch (err) {
  console.warn('⚠  Módulos de IA não carregados:', err.message);
}

const express = require('express');
const cors    = require('cors');
const fs      = require('fs');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '4mb' }));

// Serve os arquivos estáticos do portal (index.html, admin/, assets/ etc.)
app.use(express.static(path.join(__dirname, '..')));

/* ──────────────────────────────────────────────────────────────────────────
   ARTIGOS — persistência em arquivo JSON
   ────────────────────────────────────────────────────────────────────────── */
const DATA_FILE = path.join(__dirname, 'articles.json');

function readArticles() {
  try {
    if (!fs.existsSync(DATA_FILE)) return [];
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  } catch { return []; }
}

function writeArticles(articles) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(articles, null, 2), 'utf-8');
}

// GET /articles — lista todos
app.get('/articles', (_req, res) => {
  res.json(readArticles());
});

// POST /articles — criar ou atualizar (upsert por id)
app.post('/articles', (req, res) => {
  const articles = readArticles();
  const article = {
    ...req.body,
    id: req.body.id || (Date.now().toString(36) + Math.random().toString(36).slice(2, 6))
  };
  const idx = articles.findIndex(a => a.id === article.id);
  if (idx >= 0) articles[idx] = article;
  else articles.unshift(article);
  writeArticles(articles);
  res.json(article);
});

// PUT /articles/:id — atualizar existente
app.put('/articles/:id', (req, res) => {
  const articles = readArticles();
  const idx = articles.findIndex(a => a.id === req.params.id);
  if (idx < 0) return res.status(404).json({ erro: 'Notícia não encontrada.' });
  articles[idx] = { ...articles[idx], ...req.body, id: req.params.id };
  writeArticles(articles);
  res.json(articles[idx]);
});

// DELETE /articles/:id — excluir
app.delete('/articles/:id', (req, res) => {
  const articles = readArticles();
  const idx = articles.findIndex(a => a.id === req.params.id);
  if (idx < 0) return res.status(404).json({ erro: 'Notícia não encontrada.' });
  articles.splice(idx, 1);
  writeArticles(articles);
  res.json({ ok: true });
});

/* ── Helper: verifica se IA está disponível ──────────────────────────────── */
function checkIA(res) {
  if (!client || !gerarNoticia) {
    res.status(503).json({ erro: 'IA indisponível: OPENAI_API_KEY não configurada ou módulos ausentes.' });
    return false;
  }
  return true;
}

/* ──────────────────────────────────────────────────────────────────────────
   POST /gerar
   ────────────────────────────────────────────────────────────────────────── */
app.post('/gerar', async (req, res) => {
  if (!checkIA(res)) return;
  const { texto } = req.body;
  try {
    const resultado = await gerarNoticia(texto, client);
    res.json(resultado);
  } catch (err) {
    console.error('[GERAR ERRO]', err.message);
    const status = err.status === 400 ? 400
                 : err.status === 401 ? 401
                 : err.status === 429 ? 429
                 : 500;
    res.status(status).json({ erro: err.message });
  }
});

/* ──────────────────────────────────────────────────────────────────────────
   POST /classificar
   ────────────────────────────────────────────────────────────────────────── */
app.post('/classificar', async (req, res) => {
  if (!checkIA(res)) return;
  const { titulo, conteudo } = req.body;
  try {
    const resultado = await classificarNoticia({ titulo, conteudo }, client);
    res.json(resultado);
  } catch (err) {
    console.error('[CLASSIFICAR ERRO]', err.message);
    const status = err.status === 400 ? 400
                 : err.status === 401 ? 401
                 : err.status === 429 ? 429
                 : 500;
    res.status(status).json({ erro: err.message });
  }
});

/* ──────────────────────────────────────────────────────────────────────────
   POST /tendencias
   ────────────────────────────────────────────────────────────────────────── */
app.post('/tendencias', async (req, res) => {
  if (!checkIA(res)) return;
  const { artigos = [] } = req.body;
  try {
    const resultado = await analisarTendencias(artigos, client);
    res.json(resultado);
  } catch (err) {
    console.error('[TENDENCIAS ERRO]', err.message);
    const status = err.status === 401 ? 401 : err.status === 429 ? 429 : 500;
    res.status(status).json({ erro: err.message });
  }
});

/* ──────────────────────────────────────────────────────────────────────────
   POST /social
   ────────────────────────────────────────────────────────────────────────── */
app.post('/social', async (req, res) => {
  if (!checkIA(res)) return;
  const { noticia } = req.body;
  try {
    const resultado = await gerarSocial(noticia, client);
    res.json(resultado);
  } catch (err) {
    console.error('[SOCIAL ERRO]', err.message);
    const status = err.status === 400 ? 400
                 : err.status === 401 ? 401
                 : err.status === 429 ? 429
                 : 500;
    res.status(status).json({ erro: err.message });
  }
});

/* Rota de saúde */
app.get('/status', (_req, res) => res.json({ ok: true, porta: PORT, ia: !!client }));

/* Fallback — serve index.html para qualquer rota não encontrada */
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✔  Servidor Radar Ilhéus rodando na porta ${PORT}`);
  if (client) console.log('   Chave API OpenAI: ✔ configurada');
  else        console.log('   Chave API OpenAI: ✖ não configurada (IA desativada)');
});

process.on('uncaughtException', err => {
  console.error('\n💥 ERRO NÃO TRATADO:', err.message);
  console.error(err.stack);
});

process.on('unhandledRejection', (reason) => {
  console.error('\n💥 PROMISE REJEITADA:', reason);
});
