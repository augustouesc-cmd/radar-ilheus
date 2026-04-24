'use strict';

const express = require('express');
const path    = require('path');
const fs      = require('fs');
const { randomUUID } = require('crypto');

const app  = express();
const PORT = process.env.PORT || 3000;

const NOTICIAS_PATH = path.join(__dirname, 'public', 'noticias.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── API DE NOTÍCIAS ───────────────────────────────────────────

// GET /api/noticias → retorna todas as notícias
app.get('/api/noticias', (_req, res) => {
  try {
    const data = fs.readFileSync(NOTICIAS_PATH, 'utf8');
    res.json(JSON.parse(data));
  } catch {
    res.json([]);
  }
});

// POST /api/noticias → adiciona nova notícia
app.post('/api/noticias', (req, res) => {
  const { titulo, categoria, imagem, conteudo, data } = req.body;
  if (!titulo || !conteudo) {
    return res.status(400).json({ error: 'titulo e conteudo são obrigatórios' });
  }

  const nova = {
    id:        randomUUID(),
    titulo,
    categoria: categoria  || 'Geral',
    imagem:    imagem     || '',
    data:      data       || new Date().toISOString().slice(0, 10),
    conteudo
  };

  try {
    const raw      = fs.readFileSync(NOTICIAS_PATH, 'utf8');
    const noticias = JSON.parse(raw);
    noticias.unshift(nova);                                       // mais recente primeiro
    fs.writeFileSync(NOTICIAS_PATH, JSON.stringify(noticias, null, 2), 'utf8');
    res.status(201).json(nova);
  } catch (e) {
    res.status(500).json({ error: 'Falha ao salvar notícia' });
  }
});

// ── ROTAS ─────────────────────────────────────────────────────

app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/status', (_req, res) => res.json({ status: 'ok' }));

app.listen(PORT, '0.0.0.0', () => {
  console.log('Servidor rodando na porta ' + PORT);
});
