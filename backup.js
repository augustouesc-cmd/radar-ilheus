'use strict';

/**
 * backup.js — Backup automático dos dados do Radar Ilhéus
 *
 * Uso: node backup.js
 *
 * Política:
 *   - Diário incremental: mantém os últimos 7 dias
 *   - Semanal completo: mantém as últimas 4 semanas (toda domingo)
 *   - Backups NUNCA são apagados em deploy (ficam na pasta /backup)
 */

const fs   = require('fs');
const path = require('path');

const ROOT    = __dirname;
const BACKUP  = path.join(ROOT, 'backup');
const SOURCES = ['articles.json', 'categories.json'];

const DAILY_MAX  = 7;
const WEEKLY_MAX = 4;

function pad(n) { return String(n).padStart(2, '0'); }

function dateTag() {
  const d = new Date();
  return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}`;
}

function isWeekly() {
  return new Date().getDay() === 0; // domingo
}

function pruneOld(prefix, max) {
  const files = fs.readdirSync(BACKUP)
    .filter(f => f.startsWith(prefix) && f.endsWith('.json'))
    .sort();
  while (files.length > max) {
    const old = files.shift();
    fs.unlinkSync(path.join(BACKUP, old));
    console.log(`[backup] removido antigo: ${old}`);
  }
}

function run() {
  if (!fs.existsSync(BACKUP)) fs.mkdirSync(BACKUP, { recursive: true });

  const tag    = dateTag();
  const weekly = isWeekly();

  for (const src of SOURCES) {
    const srcPath = path.join(ROOT, src);
    if (!fs.existsSync(srcPath)) continue;

    const base = src.replace('.json', '');

    // backup diário
    const dailyName = `${base}_daily_${tag}.json`;
    fs.copyFileSync(srcPath, path.join(BACKUP, dailyName));
    console.log(`[backup] diário: ${dailyName}`);
    pruneOld(`${base}_daily_`, DAILY_MAX);

    // backup semanal (todo domingo)
    if (weekly) {
      const weeklyName = `${base}_weekly_${tag}.json`;
      fs.copyFileSync(srcPath, path.join(BACKUP, weeklyName));
      console.log(`[backup] semanal: ${weeklyName}`);
      pruneOld(`${base}_weekly_`, WEEKLY_MAX);
    }
  }

  console.log('[backup] concluído em', new Date().toISOString());
}

run();
