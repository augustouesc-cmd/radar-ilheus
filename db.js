'use strict';

const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  console.warn('[db] DATABASE_URL não definida — banco desabilitado, usando arquivos locais.');
}

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    })
  : null;

/**
 * Executa uma query no banco.
 * Lança erro se pool não estiver configurado.
 */
async function query(text, params) {
  if (!pool) throw new Error('DATABASE_URL não configurada');
  return pool.query(text, params);
}

/**
 * Retorna true se o banco está disponível.
 */
function hasDB() {
  return pool !== null;
}

/**
 * Cria as tabelas se não existirem.
 * Chame uma vez na inicialização do servidor.
 */
async function initDB() {
  if (!pool) return;

  await pool.query(`
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

  await pool.query(`
    CREATE TABLE IF NOT EXISTS categorias (
      id     TEXT PRIMARY KEY,
      name   TEXT NOT NULL,
      slug   TEXT UNIQUE NOT NULL,
      icon   TEXT DEFAULT 'fa-tag',
      active BOOLEAN DEFAULT TRUE
    )
  `);

  console.log('[db] tabelas verificadas/criadas.');
}

module.exports = { query, hasDB, initDB };
