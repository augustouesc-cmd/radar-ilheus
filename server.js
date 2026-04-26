'use strict';

require('dotenv').config();

const express    = require('express');
const path       = require('path');
const fs         = require('fs');
const { randomUUID } = require('crypto');
const { query, hasDB, initDB } = require('./db');

const app  = express();
const PORT = process.env.PORT || 3000;

const ARTICLES_PATH   = path.join(__dirname, 'articles.json');
const CATEGORIES_PATH = path.join(__dirname, 'categories.json');

app.use(express.json({ limit: '5mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ── helpers JSON (fallback local) ─────────────────────────────

function readArticles() {
  try { return JSON.parse(fs.readFileSync(ARTICLES_PATH, 'utf8')); }
  catch { return []; }
}
function writeArticles(articles) {
  fs.writeFileSync(ARTICLES_PATH, JSON.stringify(articles, null, 2), 'utf8');
}

const DEFAULT_CATEGORIES = [
  { id: 'politica', name: 'Política', slug: 'politica', icon: 'fa-landmark',      active: true },
  { id: 'economia', name: 'Economia', slug: 'economia', icon: 'fa-chart-line',     active: true },
  { id: 'esportes', name: 'Esportes', slug: 'esportes', icon: 'fa-futbol',         active: true },
  { id: 'cultura',  name: 'Cultura',  slug: 'cultura',  icon: 'fa-theater-masks',  active: true },
  { id: 'saude',    name: 'Saúde',    slug: 'saude',    icon: 'fa-heartbeat',      active: true },
  { id: 'educacao', name: 'Educação', slug: 'educacao', icon: 'fa-graduation-cap', active: true },
  { id: 'turismo',  name: 'Turismo',  slug: 'turismo',  icon: 'fa-umbrella-beach', active: true },
  { id: 'cidades',  name: 'Cidades',  slug: 'cidades',  icon: 'fa-city',           active: true },
  { id: 'empregos', name: 'Empregos', slug: 'empregos', icon: 'fa-briefcase',      active: true }
];

function readCategories() {
  try { return JSON.parse(fs.readFileSync(CATEGORIES_PATH, 'utf8')); }
  catch { return DEFAULT_CATEGORIES; }
}
function writeCategories(cats) {
  fs.writeFileSync(CATEGORIES_PATH, JSON.stringify(cats, null, 2), 'utf8');
}

// ── mapeamento banco → objeto JS ──────────────────────────────

function rowToArticle(r) {
  return {
    id:                          r.id,
    title:                       r.title,
    subtitle:                    r.subtitle,
    content:                     r.content,
    category:                    r.category,
    author:                      r.author,
    image:                       r.image,
    status:                      r.status,
    views:                       r.views,
    createdAt:                   r.created_at,
    updatedAt:                   r.updated_at,
    publishedAt:                 r.published_at,
    time:                        r.time,
    date:                        r.date,
    excerpt:                     r.excerpt,
    readTime:                    r.read_time,
    tags:                        r.tags || [],
    classification:              r.classification,
    classificationJustification: r.classification_justification
  };
}

function rowToCategory(r) {
  return { id: r.id, name: r.name, slug: r.slug, icon: r.icon, active: r.active };
}

// ── buildArticle (igual ao original) ─────────────────────────

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

// ══════════════════════════════════════════════════════════════
// ROTAS — /articles CRUD (admin)
// ══════════════════════════════════════════════════════════════

app.get('/articles', async (_req, res) => {
  if (hasDB()) {
    const r = await query('SELECT * FROM noticias ORDER BY created_at DESC');
    return res.json(r.rows.map(rowToArticle));
  }
  res.json(readArticles());
});

app.get('/articles/:id', async (req, res) => {
  if (hasDB()) {
    const r = await query('SELECT * FROM noticias WHERE id=$1', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'not found' });
    return res.json(rowToArticle(r.rows[0]));
  }
  const article = readArticles().find(a => a.id === req.params.id);
  if (!article) return res.status(404).json({ error: 'not found' });
  res.json(article);
});

app.post('/articles', async (req, res) => {
  if (!req.body.title) return res.status(400).json({ error: 'title é obrigatório' });
  const a = buildArticle(req.body, null);

  if (hasDB()) {
    await query(`
      INSERT INTO noticias
        (id,title,subtitle,content,category,author,image,status,views,
         created_at,updated_at,published_at,time,date,excerpt,read_time,tags,
         classification,classification_justification)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
    `, [
      a.id, a.title, a.subtitle, a.content, a.category, a.author, a.image,
      a.status, a.views, a.createdAt, a.updatedAt, a.publishedAt,
      a.time, a.date, a.excerpt, a.readTime,
      JSON.stringify(a.tags), a.classification, a.classificationJustification
    ]);
    return res.status(201).json(a);
  }

  const articles = readArticles();
  articles.unshift(a);
  writeArticles(articles);
  res.status(201).json(a);
});

app.put('/articles/:id', async (req, res) => {
  if (hasDB()) {
    const r = await query('SELECT * FROM noticias WHERE id=$1', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'not found' });
    const existing = rowToArticle(r.rows[0]);
    const a = buildArticle(req.body, existing);
    await query(`
      UPDATE noticias SET
        title=$2, subtitle=$3, content=$4, category=$5, author=$6, image=$7,
        status=$8, views=$9, updated_at=$10, published_at=$11,
        time=$12, date=$13, excerpt=$14, read_time=$15, tags=$16,
        classification=$17, classification_justification=$18
      WHERE id=$1
    `, [
      a.id, a.title, a.subtitle, a.content, a.category, a.author, a.image,
      a.status, a.views, a.updatedAt, a.publishedAt,
      a.time, a.date, a.excerpt, a.readTime,
      JSON.stringify(a.tags), a.classification, a.classificationJustification
    ]);
    return res.json(a);
  }

  const articles = readArticles();
  const idx = articles.findIndex(a => a.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: 'not found' });
  const updated = buildArticle(req.body, articles[idx]);
  articles[idx] = updated;
  writeArticles(articles);
  res.json(updated);
});

app.delete('/articles/:id', async (req, res) => {
  if (hasDB()) {
    const r = await query('DELETE FROM noticias WHERE id=$1', [req.params.id]);
    if (!r.rowCount) return res.status(404).json({ error: 'not found' });
    return res.json({ ok: true });
  }

  const articles = readArticles();
  const idx = articles.findIndex(a => a.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: 'not found' });
  articles.splice(idx, 1);
  writeArticles(articles);
  res.json({ ok: true });
});

// ══════════════════════════════════════════════════════════════
// ROTAS — /api/noticias (público)
// ══════════════════════════════════════════════════════════════

app.get('/api/noticias', async (_req, res) => {
  if (hasDB()) {
    const r = await query(
      "SELECT * FROM noticias WHERE status='published' ORDER BY created_at DESC"
    );
    return res.json(r.rows.map(rowToArticle));
  }
  const published = readArticles().filter(a => !a.status || a.status === 'published');
  res.json(published);
});

// POST /api/noticias — compatibilidade com admin.html legado
app.post('/api/noticias', async (req, res) => {
  const { titulo, titulo: title, categoria, imagem, conteudo, data, subtitulo, status, autor } = req.body;
  const t = title || titulo;
  const c = conteudo;
  if (!t || !c) return res.status(400).json({ error: 'titulo e conteudo são obrigatórios' });

  const a = buildArticle({
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

  if (hasDB()) {
    await query(`
      INSERT INTO noticias
        (id,title,subtitle,content,category,author,image,status,views,
         created_at,updated_at,published_at,time,date,excerpt,read_time,tags,
         classification,classification_justification)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
    `, [
      a.id, a.title, a.subtitle, a.content, a.category, a.author, a.image,
      a.status, a.views, a.createdAt, a.updatedAt, a.publishedAt,
      a.time, a.date, a.excerpt, a.readTime,
      JSON.stringify(a.tags), a.classification, a.classificationJustification
    ]);
    return res.status(201).json(a);
  }

  const articles = readArticles();
  articles.unshift(a);
  writeArticles(articles);
  res.status(201).json(a);
});

// ══════════════════════════════════════════════════════════════
// ROTAS — /categories CRUD (admin) + /api/categories (público)
// ══════════════════════════════════════════════════════════════

app.get('/api/categories', async (_req, res) => {
  if (hasDB()) {
    const r = await query('SELECT * FROM categorias WHERE active=TRUE ORDER BY name');
    return res.json(r.rows.map(rowToCategory));
  }
  res.json(readCategories().filter(c => c.active));
});

app.get('/categories', async (_req, res) => {
  if (hasDB()) {
    const r = await query('SELECT * FROM categorias ORDER BY name');
    return res.json(r.rows.map(rowToCategory));
  }
  res.json(readCategories());
});

app.post('/categories', async (req, res) => {
  const { name, icon } = req.body;
  if (!name) return res.status(400).json({ error: 'name é obrigatório' });
  const slug = name.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-');

  if (hasDB()) {
    try {
      const r = await query(
        'INSERT INTO categorias (id,name,slug,icon,active) VALUES ($1,$2,$3,$4,$5) RETURNING *',
        [slug, name, slug, icon || 'fa-tag', true]
      );
      return res.status(201).json(rowToCategory(r.rows[0]));
    } catch (e) {
      if (e.code === '23505') return res.status(409).json({ error: 'já existe' });
      throw e;
    }
  }

  const cats = readCategories();
  if (cats.find(c => c.slug === slug)) return res.status(409).json({ error: 'já existe' });
  const cat = { id: slug, name, slug, icon: icon || 'fa-tag', active: true };
  cats.push(cat);
  writeCategories(cats);
  res.status(201).json(cat);
});

app.put('/categories/:id', async (req, res) => {
  if (hasDB()) {
    const r = await query(
      'UPDATE categorias SET name=$2, icon=$3, active=$4 WHERE id=$1 RETURNING *',
      [req.params.id, req.body.name, req.body.icon, req.body.active]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'not found' });
    return res.json(rowToCategory(r.rows[0]));
  }

  const cats = readCategories();
  const idx = cats.findIndex(c => c.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: 'not found' });
  cats[idx] = { ...cats[idx], ...req.body, id: cats[idx].id, slug: cats[idx].slug };
  writeCategories(cats);
  res.json(cats[idx]);
});

app.delete('/categories/:id', async (req, res) => {
  if (req.params.id === 'geral') return res.status(403).json({ error: 'categoria padrão não pode ser removida' });

  if (hasDB()) {
    // Garante que "geral" existe
    await query(
      "INSERT INTO categorias (id,name,slug,icon,active) VALUES ('geral','Geral','geral','fa-tag',TRUE) ON CONFLICT DO NOTHING"
    );
    // Reatribui artigos
    const r2 = await query(
      "UPDATE noticias SET category='geral' WHERE LOWER(category)=$1",
      [req.params.id]
    );
    const r = await query('DELETE FROM categorias WHERE id=$1', [req.params.id]);
    if (!r.rowCount) return res.status(404).json({ error: 'not found' });
    return res.json({ ok: true, reassigned: r2.rowCount });
  }

  const cats = readCategories();
  const idx = cats.findIndex(c => c.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: 'not found' });

  if (!cats.find(c => c.id === 'geral')) {
    cats.push({ id: 'geral', name: 'Geral', slug: 'geral', icon: 'fa-tag', active: true });
  }

  const slug = cats[idx].slug;
  const articles = readArticles();
  const affected = articles.filter(a => {
    const s = (a.category || '').toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-');
    return s === slug;
  });
  if (affected.length > 0) {
    affected.forEach(a => { a.category = 'geral'; });
    writeArticles(articles);
  }

  cats.splice(idx, 1);
  writeCategories(cats);
  res.json({ ok: true, reassigned: affected.length });
});

app.patch('/categories/:id/active', async (req, res) => {
  if (hasDB()) {
    const r = await query(
      'UPDATE categorias SET active = NOT active WHERE id=$1 RETURNING *',
      [req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'not found' });
    return res.json(rowToCategory(r.rows[0]));
  }

  const cats = readCategories();
  const cat = cats.find(c => c.id === req.params.id);
  if (!cat) return res.status(404).json({ error: 'not found' });
  cat.active = !cat.active;
  writeCategories(cats);
  res.json(cat);
});

// ── /weather (cache 15 min) ───────────────────────────────────

const weatherCache = { data: null, ts: 0 };
const WEATHER_TTL  = 15 * 60 * 1000;

app.get('/weather', async (_req, res) => {
  const now = Date.now();
  if (weatherCache.data && now - weatherCache.ts < WEATHER_TTL) {
    return res.json(weatherCache.data);
  }
  const key = process.env.OPENWEATHER_KEY;
  if (!key) return res.status(503).json({ error: 'OPENWEATHER_KEY not set' });
  try {
    const r    = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=Ilheus,BR&units=metric&lang=pt&appid=${key}`);
    const json = await r.json();
    if (!r.ok) throw new Error(json.message || 'upstream error');
    weatherCache.data = {
      city:        'Ilhéus',
      temp:        Math.round(json.main.temp),
      description: json.weather[0].description
    };
    weatherCache.ts = now;
    res.json(weatherCache.data);
  } catch (err) {
    console.error('[/weather]', err.message);
    res.status(502).json({ error: err.message });
  }
});

// ── rotas estáticas ───────────────────────────────────────────

app.get('/', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/status', (_req, res) => res.json({ status: 'ok', db: hasDB() }));

// ── inicialização ─────────────────────────────────────────────

initDB().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor rodando na porta ${PORT} | banco: ${hasDB() ? 'PostgreSQL' : 'arquivo local'}`);
  });
}).catch(err => {
  console.error('[init] Erro ao conectar banco:', err.message);
  // Sobe mesmo sem banco (modo arquivo)
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor rodando na porta ${PORT} | banco: INDISPONÍVEL — usando arquivo local`);
  });
});
