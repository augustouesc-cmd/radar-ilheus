'use strict';

const express    = require('express');
const path       = require('path');
const fs         = require('fs');
const { randomUUID } = require('crypto');

const app  = express();
const PORT = process.env.PORT || 3000;

const ARTICLES_PATH = path.join(__dirname, 'articles.json');

app.use(express.json({ limit: '5mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ── helpers ───────────────────────────────────────────────────
function readArticles() {
  try { return JSON.parse(fs.readFileSync(ARTICLES_PATH, 'utf8')); }
  catch { return []; }
}
function writeArticles(articles) {
  fs.writeFileSync(ARTICLES_PATH, JSON.stringify(articles, null, 2), 'utf8');
}
function buildArticle(body, existing) {
  const now = new Date().toISOString();
  return {
    id:                          existing?.id || body.id || randomUUID(),
    title:                       body.title   || existing?.title || '',
    subtitle:                    body.subtitle ?? existing?.subtitle ?? '',
    content:                     body.content  ?? existing?.content  ?? '',
    category:                    body.category || existing?.category || 'Geral',
    author:                      body.author   || existing?.author   || 'Redação Radar Ilhéus',
    image:                       body.image    ?? existing?.image    ?? '',
    status:                      body.status   || existing?.status   || 'draft',
    views:                       body.views    ?? existing?.views    ?? 0,
    createdAt:                   existing?.createdAt || now,
    updatedAt:                   now,
    publishedAt:                 body.status === 'published'
                                   ? (existing?.publishedAt || now)
                                   : (existing?.publishedAt || null),
    time:     body.time     || existing?.time     || 'agora mesmo',
    date:     body.date     || existing?.date     || new Date().toLocaleDateString('pt-BR', { day:'2-digit', month:'short', year:'numeric' }),
    excerpt:  body.excerpt  || existing?.excerpt  || '',
    readTime: body.readTime || existing?.readTime || '3 min',
    tags:     body.tags     || existing?.tags     || [],
    classification:              body.classification              ?? existing?.classification              ?? '',
    classificationJustification: body.classificationJustification ?? existing?.classificationJustification ?? ''
  };
}

// ── /articles CRUD (admin) ────────────────────────────────────

app.get('/articles', (_req, res) => {
  res.json(readArticles());
});

app.get('/articles/:id', (req, res) => {
  const article = readArticles().find(a => a.id === req.params.id);
  if (!article) return res.status(404).json({ error: 'not found' });
  res.json(article);
});

app.post('/articles', (req, res) => {
  if (!req.body.title) return res.status(400).json({ error: 'title é obrigatório' });
  console.log('[POST /articles] ANTES content:', String(req.body.content || '').slice(0, 120));
  const article  = buildArticle(req.body, null);
  console.log('[POST /articles] SALVANDO content:', String(article.content || '').slice(0, 120));
  const articles = readArticles();
  articles.unshift(article);
  writeArticles(articles);
  res.status(201).json(article);
});

app.put('/articles/:id', (req, res) => {
  const articles = readArticles();
  const idx = articles.findIndex(a => a.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: 'not found' });
  console.log('[PUT /articles/:id] ANTES content:', String(req.body.content || '').slice(0, 120));
  const updated = buildArticle(req.body, articles[idx]);
  console.log('[PUT /articles/:id] SALVANDO content:', String(updated.content || '').slice(0, 120));
  articles[idx] = updated;
  writeArticles(articles);
  res.json(updated);
});

app.delete('/articles/:id', (req, res) => {
  const articles = readArticles();
  const idx = articles.findIndex(a => a.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: 'not found' });
  articles.splice(idx, 1);
  writeArticles(articles);
  res.json({ ok: true });
});

// ── /api/noticias (público) ───────────────────────────────────

app.get('/api/noticias', (_req, res) => {
  const published = readArticles().filter(a => !a.status || a.status === 'published');
  res.json(published);
});

// POST /api/noticias — compatibilidade com admin.html legado
app.post('/api/noticias', (req, res) => {
  const { titulo, titulo: title, categoria, imagem, conteudo, data, subtitulo, status, autor } = req.body;
  const t = title || titulo;
  const c = conteudo;
  if (!t || !c) return res.status(400).json({ error: 'titulo e conteudo são obrigatórios' });

  const article = buildArticle({
    title:    t,
    subtitle: subtitulo || '',
    content:  `<p>${c}</p>`,
    category: categoria || 'Geral',
    author:   autor     || 'Redação Radar Ilhéus',
    image:    imagem    || '',
    status:   status    || 'published',
    date:     data      || new Date().toISOString().slice(0, 10),
    excerpt:  c.slice(0, 200)
  }, null);

  const articles = readArticles();
  articles.unshift(article);
  writeArticles(articles);
  res.status(201).json(article);
});

// ── rotas ─────────────────────────────────────────────────────

app.get('/', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/status', (_req, res) => res.json({ status: 'ok' }));

app.listen(PORT, '0.0.0.0', () => {
  console.log('Servidor rodando na porta ' + PORT);
});
