'use strict';

require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const fs      = require('fs');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '4mb' }));

/* ── Rotas de saúde — ANTES do static para garantir resposta ─────────────── */
app.get('/', (_req, res) => res.send('Servidor funcionando'));
app.get('/status', (_req, res) => res.json({ status: 'ok' }));

/* ── Arquivos estáticos do portal (index.html, admin/, assets/ etc.) ──────── */
app.use(express.static(path.join(__dirname)));

/* ── Módulos opcionais de IA ─────────────────────────────────────────────── */
const openaiKey = process.env.OPENAI_API_KEY;
if (!openaiKey || openaiKey === 'sua_chave_aqui') {
  console.warn('\n⚠  OPENAI_API_KEY não configurada. IA indisponível.\n');
}

let client             = null;
let gerarNoticia       = null;
let classificarNoticia = null;
let gerarSocial        = null;
let analisarTendencias = null;

try {
  if (openaiKey && openaiKey !== 'sua_chave_aqui') {
    const OpenAI = require('openai');
    client = new (OpenAI.default || OpenAI)({ apiKey: openaiKey });
  }
  gerarNoticia       = require('./servidor/gerador').gerarNoticia;
  classificarNoticia = require('./servidor/classificador').classificarNoticia;
  gerarSocial        = require('./servidor/social').gerarSocial;
  analisarTendencias = require('./servidor/tendencias').analisarTendencias;
} catch (err) {
  console.warn('⚠  Módulos de IA não carregados:', err.message);
}

/* ── Artigos — persistência em JSON ─────────────────────────────────────── */
const DATA_FILE = path.join(__dirname, 'servidor', 'articles.json');

function readArticles() {
  try {
    if (!fs.existsSync(DATA_FILE)) return [];
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  } catch { return []; }
}

function writeArticles(articles) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(articles, null, 2), 'utf-8');
}

app.get('/articles', (_req, res) => res.json(readArticles()));

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

app.put('/articles/:id', (req, res) => {
  const articles = readArticles();
  const idx = articles.findIndex(a => a.id === req.params.id);
  if (idx < 0) return res.status(404).json({ erro: 'Notícia não encontrada.' });
  articles[idx] = { ...articles[idx], ...req.body, id: req.params.id };
  writeArticles(articles);
  res.json(articles[idx]);
});

app.delete('/articles/:id', (req, res) => {
  const articles = readArticles();
  const idx = articles.findIndex(a => a.id === req.params.id);
  if (idx < 0) return res.status(404).json({ erro: 'Notícia não encontrada.' });
  articles.splice(idx, 1);
  writeArticles(articles);
  res.json({ ok: true });
});

/* ── Helper IA ───────────────────────────────────────────────────────────── */
function checkIA(res) {
  if (!client || !gerarNoticia) {
    res.status(503).json({ erro: 'IA indisponível: OPENAI_API_KEY não configurada.' });
    return false;
  }
  return true;
}

app.post('/gerar', async (req, res) => {
  if (!checkIA(res)) return;
  try {
    res.json(await gerarNoticia(req.body.texto, client));
  } catch (err) {
    res.status(err.status || 500).json({ erro: err.message });
  }
});

app.post('/classificar', async (req, res) => {
  if (!checkIA(res)) return;
  try {
    res.json(await classificarNoticia({ titulo: req.body.titulo, conteudo: req.body.conteudo }, client));
  } catch (err) {
    res.status(err.status || 500).json({ erro: err.message });
  }
});

app.post('/tendencias', async (req, res) => {
  if (!checkIA(res)) return;
  try {
    res.json(await analisarTendencias(req.body.artigos || [], client));
  } catch (err) {
    res.status(err.status || 500).json({ erro: err.message });
  }
});

app.post('/social', async (req, res) => {
  if (!checkIA(res)) return;
  try {
    res.json(await gerarSocial(req.body.noticia, client));
  } catch (err) {
    res.status(err.status || 500).json({ erro: err.message });
  }
});

/* ── Iniciar servidor ────────────────────────────────────────────────────── */
app.listen(PORT, '0.0.0.0', () => {
  console.log('Servidor rodando na porta ' + PORT);
  if (client) console.log('   OpenAI: configurada');
  else        console.log('   OpenAI: não configurada (IA desativada)');
});

process.on('uncaughtException', err => {
  console.error('ERRO NÃO TRATADO:', err.message, err.stack);
});

process.on('unhandledRejection', reason => {
  console.error('PROMISE REJEITADA:', reason);
});
