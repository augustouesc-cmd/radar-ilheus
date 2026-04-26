'use strict';

/**
 * migrate.js — Importa articles.json e categories.json para o PostgreSQL
 *
 * Uso: DATABASE_URL=... node migrate.js
 *
 * - Não duplica registros (usa INSERT ... ON CONFLICT DO NOTHING)
 * - Não apaga dados existentes no banco
 */

require('dotenv').config();

const fs   = require('fs');
const path = require('path');
const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  console.error('Erro: DATABASE_URL não definida.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const ROOT = __dirname;

async function migrate() {
  const client = await pool.connect();
  try {
    // ── Criar tabelas se não existirem ──────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS noticias (
        id                       TEXT PRIMARY KEY,
        title                    TEXT NOT NULL,
        subtitle                 TEXT DEFAULT '',
        content                  TEXT DEFAULT '',
        category                 TEXT DEFAULT 'Geral',
        author                   TEXT DEFAULT 'Redação Radar Ilhéus',
        image                    TEXT DEFAULT '',
        status                   TEXT DEFAULT 'draft',
        views                    INTEGER DEFAULT 0,
        created_at               TIMESTAMPTZ DEFAULT NOW(),
        updated_at               TIMESTAMPTZ DEFAULT NOW(),
        published_at             TIMESTAMPTZ,
        time                     TEXT DEFAULT 'agora mesmo',
        date                     TEXT DEFAULT '',
        excerpt                  TEXT DEFAULT '',
        read_time                TEXT DEFAULT '3 min',
        tags                     JSONB DEFAULT '[]',
        classification           TEXT DEFAULT '',
        classification_justification TEXT DEFAULT ''
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS categorias (
        id     TEXT PRIMARY KEY,
        name   TEXT NOT NULL,
        slug   TEXT UNIQUE NOT NULL,
        icon   TEXT DEFAULT 'fa-tag',
        active BOOLEAN DEFAULT TRUE
      )
    `);

    // ── Migrar artigos ───────────────────────────────────────────
    const articlesPath = path.join(ROOT, 'articles.json');
    if (fs.existsSync(articlesPath)) {
      const articles = JSON.parse(fs.readFileSync(articlesPath, 'utf8'));
      let inserted = 0, skipped = 0;

      for (const a of articles) {
        const res = await client.query(`
          INSERT INTO noticias
            (id, title, subtitle, content, category, author, image, status,
             views, created_at, updated_at, published_at,
             time, date, excerpt, read_time, tags,
             classification, classification_justification)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
          ON CONFLICT (id) DO NOTHING
        `, [
          a.id,
          a.title        || '',
          a.subtitle     || '',
          a.content      || '',
          a.category     || 'Geral',
          a.author       || 'Redação Radar Ilhéus',
          a.image        || '',
          a.status       || 'draft',
          a.views        || 0,
          a.createdAt    || new Date().toISOString(),
          a.updatedAt    || new Date().toISOString(),
          a.publishedAt  || null,
          a.time         || 'agora mesmo',
          a.date         || '',
          a.excerpt      || '',
          a.readTime     || '3 min',
          JSON.stringify(a.tags || []),
          a.classification              || '',
          a.classificationJustification || ''
        ]);
        if (res.rowCount > 0) inserted++; else skipped++;
      }

      console.log(`[migrate] artigos: ${inserted} inseridos, ${skipped} já existiam.`);
    } else {
      console.warn('[migrate] articles.json não encontrado, pulando.');
    }

    // ── Migrar categorias ────────────────────────────────────────
    const categoriesPath = path.join(ROOT, 'categories.json');
    if (fs.existsSync(categoriesPath)) {
      const cats = JSON.parse(fs.readFileSync(categoriesPath, 'utf8'));
      let inserted = 0, skipped = 0;

      for (const c of cats) {
        const res = await client.query(`
          INSERT INTO categorias (id, name, slug, icon, active)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (id) DO NOTHING
        `, [c.id, c.name, c.slug, c.icon || 'fa-tag', c.active !== false]);
        if (res.rowCount > 0) inserted++; else skipped++;
      }

      console.log(`[migrate] categorias: ${inserted} inseridas, ${skipped} já existiam.`);
    } else {
      console.warn('[migrate] categories.json não encontrado, pulando.');
    }

    console.log('[migrate] concluído com sucesso.');
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(err => {
  console.error('[migrate] Erro:', err.message);
  process.exit(1);
});
