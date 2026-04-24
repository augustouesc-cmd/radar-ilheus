'use strict';

/* ============================================================
   monitor.js — Daemon de monitoramento de notícias
   Radar Ilhéus

   Uso direto:
     node monitor.js
     MONITOR_INTERVAL_MIN=10 node monitor.js

   Uso como módulo:
     const { MonitorRadar } = require('./monitor');
     const m = new MonitorRadar({ intervaloMin: 5 });
     m.on('alerta', (alerta) => { ... });
     m.iniciar();
   ============================================================ */

require('dotenv').config();

const { EventEmitter } = require('events');
const fs               = require('fs');
const path             = require('path');
const Anthropic        = require('@anthropic-ai/sdk');
const { analisarTendencias } = require('./tendencias');

/* ── Cores ANSI (sem dependências extras) ────────────────── */
const C = {
  reset:   '\x1b[0m',
  bold:    '\x1b[1m',
  dim:     '\x1b[2m',
  red:     '\x1b[31m',
  yellow:  '\x1b[33m',
  blue:    '\x1b[34m',
  green:   '\x1b[32m',
  cyan:    '\x1b[36m',
  magenta: '\x1b[35m',
  gray:    '\x1b[90m',
};

const COR = {
  urgente:  C.red,
  alerta:   C.yellow,
  politica: C.blue,
  positiva: C.green,
  comum:    C.gray,
};

const ICONE_TIPO = {
  urgente:   '🔴',
  alerta:    '🟡',
  tendencia: '📈',
};

/* ── Arquivos de dados ────────────────────────────────────── */
const ARTICLES_FILE = path.join(__dirname, 'articles.json');
const ALERTAS_FILE  = path.join(__dirname, 'alertas.json');

/* ── Leitura de artigos publicados ───────────────────────── */
function lerArtigos() {
  try {
    if (!fs.existsSync(ARTICLES_FILE)) return [];
    const todos = JSON.parse(fs.readFileSync(ARTICLES_FILE, 'utf-8'));
    return todos
      .filter(a => a.status === 'published')
      .slice(0, 10)
      .map(a => ({ title: a.title, category: a.category }));
  } catch { return []; }
}

/* ── Histórico de alertas (deduplicação) ─────────────────── */
function lerHistorico() {
  try {
    if (!fs.existsSync(ALERTAS_FILE)) return [];
    return JSON.parse(fs.readFileSync(ALERTAS_FILE, 'utf-8'));
  } catch { return []; }
}

function salvarNoHistorico(alerta) {
  const historico = lerHistorico();
  historico.unshift({ ...alerta, timestamp: new Date().toISOString() });
  if (historico.length > 200) historico.splice(200);
  try {
    fs.writeFileSync(ALERTAS_FILE, JSON.stringify(historico, null, 2), 'utf-8');
  } catch { /* não fatal */ }
}

/**
 * Verifica se o alerta é novo (não enviado nas últimas `janelaMs` milissegundas).
 * Evita notificações duplicadas em ciclos seguidos.
 */
function isNovo(alerta, janelaMs = 2 * 60 * 60 * 1000) {
  const historico = lerHistorico();
  const agora = Date.now();
  return !historico.some(a =>
    a.titulo === alerta.titulo &&
    (agora - new Date(a.timestamp).getTime()) < janelaMs
  );
}

/* ── Helpers de tempo ────────────────────────────────────── */
function agora() {
  return new Date().toLocaleTimeString('pt-BR', {
    timeZone: 'America/Bahia',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
}

function dataHoje() {
  return new Date().toLocaleDateString('pt-BR', {
    timeZone: 'America/Bahia',
    day: '2-digit', month: '2-digit', year: 'numeric'
  });
}

/* ── Barra de progresso ASCII ────────────────────────────── */
function barra(valor, max, tamanho = 12) {
  const pct    = Math.min(1, Math.max(0, valor / max));
  const cheios = Math.round(pct * tamanho);
  const vazios = tamanho - cheios;
  const cor    = pct >= 0.8 ? C.red : pct >= 0.5 ? C.yellow : C.green;
  return `${cor}${'█'.repeat(cheios)}${C.gray}${'░'.repeat(vazios)}${C.reset}`;
}

/* ════════════════════════════════════════════════════════════
   CLASS MonitorRadar
   ════════════════════════════════════════════════════════════ */

/**
 * Daemon de monitoramento de tendências jornalísticas.
 *
 * Eventos emitidos:
 *   'alerta'    → { tipo, titulo, descricao, acao, timestamp }  — alerta novo (deduplicado)
 *   'tendencia' → { tema, score, categoria, motivo }            — tendência acima do threshold
 *   'ciclo'     → { tendencias, alertas, sugestoes, ... }       — resultado completo do ciclo
 *   'erro'      → Error                                         — falha em um ciclo
 */
class MonitorRadar extends EventEmitter {
  /**
   * @param {object}  opts
   * @param {number}  opts.intervaloMin   Intervalo entre ciclos em minutos (padrão: 5)
   * @param {number}  opts.scoreThreshold Score mínimo para emitir evento 'tendencia' (padrão: 7)
   * @param {string}  opts.apiKey         Chave Anthropic (padrão: ANTHROPIC_API_KEY do .env)
   */
  constructor({ intervaloMin = 5, scoreThreshold = 7, apiKey } = {}) {
    super();
    this.intervaloMs    = intervaloMin * 60 * 1000;
    this.scoreThreshold = scoreThreshold;
    this.client         = new Anthropic.default({ apiKey: apiKey || process.env.ANTHROPIC_API_KEY });
    this._timer         = null;
    this._ciclo         = 0;
    this._rodando       = false;
  }

  /* ── Ciclo de vida ───────────────────────────────────── */

  iniciar() {
    if (this._timer) return this;  // já rodando

    console.log(this._banner());

    // Executa imediatamente e depois repete
    this._executarCiclo();
    this._timer = setInterval(() => this._executarCiclo(), this.intervaloMs);

    // Desligamento gracioso
    const parar = () => { console.log(''); this.parar(); process.exit(0); };
    process.once('SIGINT',  parar);
    process.once('SIGTERM', parar);

    return this;
  }

  parar() {
    clearInterval(this._timer);
    this._timer = null;
    console.log(`${C.gray}[${agora()}] Monitor encerrado.${C.reset}\n`);
    return this;
  }

  /* ── Ciclo principal ─────────────────────────────────── */

  async _executarCiclo() {
    if (this._rodando) return;
    this._rodando = true;
    this._ciclo++;

    const num = this._ciclo;
    console.log(`\n${C.cyan}${C.bold}━━━ Ciclo #${num} — ${agora()} ━━━━━━━━━━━━━━━━━━━━━━━━━━${C.reset}`);

    try {
      const artigos   = lerArtigos();
      const resultado = await analisarTendencias(artigos, this.client);

      this._logResultado(resultado);
      this._processarAlertas(resultado.alertas    || []);
      this._processarTendencias(resultado.tendencias || []);

      this.emit('ciclo', resultado);

      const proxMin = Math.round(this.intervaloMs / 60000);
      console.log(`\n${C.gray}  ⏱  Próximo ciclo em ${proxMin} min — pressione Ctrl+C para sair${C.reset}`);

    } catch (err) {
      console.error(`\n${C.red}${C.bold}  ✖ ERRO no ciclo #${num}:${C.reset}${C.red} ${err.message}${C.reset}`);
      this.emit('erro', err);
    } finally {
      this._rodando = false;
    }
  }

  /* ── Renderização do console ─────────────────────────── */

  _logResultado({ tendencias = [], alertas = [], sugestoes = [], sinais_analisados }) {
    console.log(`${C.gray}  ${sinais_analisados} sinais analisados pela IA${C.reset}`);

    // ── Tendências ─────────────────────────────────────
    console.log(`\n${C.bold}  📊 TENDÊNCIAS${C.reset}`);
    if (!tendencias.length) {
      console.log(`${C.gray}     Nenhuma tendência detectada neste ciclo${C.reset}`);
    } else {
      tendencias.forEach((t, i) => {
        const cor    = COR[t.categoria] || C.gray;
        const score  = typeof t.score === 'number' ? t.score : 0;
        console.log(`\n  ${C.bold}  ${i + 1}. ${t.tema}${C.reset}  ${cor}[${t.categoria}]${C.reset}`);
        console.log(`     ${barra(score, 10)} ${C.bold}${score.toFixed(1)}${C.reset}/10`);
        console.log(`     ${C.dim}${t.motivo}${C.reset}`);
        if (t.sinais?.length) {
          t.sinais.slice(0, 2).forEach(s =>
            console.log(`     ${C.gray}↳ ${s}${C.reset}`)
          );
        }
      });
    }

    // ── Alertas ────────────────────────────────────────
    if (alertas.length) {
      console.log(`\n${C.bold}  ⚡ ALERTAS (${alertas.length})${C.reset}`);
      alertas.forEach(a => {
        const icone = ICONE_TIPO[a.tipo] || '🔔';
        const cor   = a.tipo === 'urgente' ? C.red : C.yellow;
        console.log(`\n  ${icone}  ${cor}${C.bold}[${(a.tipo || '').toUpperCase()}]${C.reset} ${C.bold}${a.titulo}${C.reset}`);
        console.log(`     ${C.dim}${a.descricao}${C.reset}`);
        console.log(`     ${C.cyan}→ ${a.acao}${C.reset}`);
      });
    } else {
      console.log(`\n${C.gray}  ✓  Sem alertas neste ciclo${C.reset}`);
    }

    // ── Sugestões de pauta ─────────────────────────────
    if (sugestoes.length) {
      console.log(`\n${C.bold}  💡 PAUTAS SUGERIDAS${C.reset}`);
      sugestoes.forEach(s => {
        console.log(`     ${C.green}→${C.reset} "${s.titulo_sugerido}" ${C.gray}[${s.categoria || 'Geral'}]${C.reset}`);
        if (s.angulo) console.log(`       ${C.gray}↳ ${s.angulo}${C.reset}`);
      });
    }
  }

  /* ── Processamento de alertas (deduplicação + eventos) ── */

  _processarAlertas(alertas) {
    for (const alerta of alertas) {
      if (isNovo(alerta)) {
        salvarNoHistorico(alerta);
        const payload = { ...alerta, timestamp: new Date().toISOString() };
        this.emit('alerta', payload);

        if (alerta.tipo === 'urgente') {
          console.log(`\n  ${C.red}${C.bold}🚨 ALERTA URGENTE NOVO — notificações disparadas${C.reset}`);
        }
      } else {
        console.log(`${C.gray}     (alerta já enviado nas últimas 2h: "${alerta.titulo}")${C.reset}`);
      }
    }
  }

  /* ── Eventos de tendências com score alto ────────────── */

  _processarTendencias(tendencias) {
    for (const t of tendencias) {
      if ((t.score || 0) >= this.scoreThreshold) {
        this.emit('tendencia', t);
      }
    }
  }

  /* ── Banner de abertura ──────────────────────────────── */

  _banner() {
    const intervMin = Math.round(this.intervaloMs / 60000);
    return [
      '',
      `${C.blue}${C.bold}╔════════════════════════════════════════════════╗${C.reset}`,
      `${C.blue}${C.bold}║${C.reset}   📡  RADAR ILHÉUS — MONITOR DE NOTÍCIAS    ${C.blue}${C.bold}║${C.reset}`,
      `${C.blue}${C.bold}╚════════════════════════════════════════════════╝${C.reset}`,
      `${C.gray}   Iniciado em ${dataHoje()} às ${agora()}${C.reset}`,
      `${C.gray}   Intervalo: ${intervMin} min | Threshold alerta: score ≥ ${this.scoreThreshold}${C.reset}`,
      `${C.gray}   Histórico de alertas: ${ALERTAS_FILE}${C.reset}`,
      '',
    ].join('\n');
  }
}

/* ════════════════════════════════════════════════════════════
   INICIALIZAÇÃO DIRETA — node monitor.js
   ════════════════════════════════════════════════════════════ */

module.exports = { MonitorRadar };

if (require.main === module) {
  const intervaloMin    = parseInt(process.env.MONITOR_INTERVAL_MIN || '5', 10);
  const scoreThreshold  = parseFloat(process.env.MONITOR_SCORE_MIN  || '7');

  const monitor = new MonitorRadar({ intervaloMin, scoreThreshold });

  /* ══════════════════════════════════════════════════════════
     HOOKS DE NOTIFICAÇÃO — implemente conforme necessário
     ══════════════════════════════════════════════════════════ */

  monitor.on('alerta', async (alerta) => {
    // ── WhatsApp (Z-API, Evolution API, Twilio) ────────────
    // if (process.env.WHATSAPP_TOKEN) {
    //   await fetch(process.env.WHATSAPP_URL, {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json', 'Authorization': process.env.WHATSAPP_TOKEN },
    //     body: JSON.stringify({
    //       phone:   process.env.WHATSAPP_REDACAO,
    //       message: `⚡ *${alerta.titulo}*\n${alerta.descricao}\n→ ${alerta.acao}`
    //     })
    //   });
    // }

    // ── Telegram ──────────────────────────────────────────
    // if (process.env.TELEGRAM_TOKEN) {
    //   await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/sendMessage`, {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify({
    //       chat_id:    process.env.TELEGRAM_CHAT_ID,
    //       text:       `${alerta.tipo === 'urgente' ? '🚨' : '⚡'} *${alerta.titulo}*\n\n${alerta.descricao}\n\n→ ${alerta.acao}`,
    //       parse_mode: 'Markdown'
    //     })
    //   });
    // }

    // ── E-mail (Nodemailer / SendGrid / Resend) ────────────
    // if (process.env.EMAIL_REDACAO) {
    //   await transporter.sendMail({
    //     to:      process.env.EMAIL_REDACAO,
    //     subject: `[${alerta.tipo.toUpperCase()}] ${alerta.titulo}`,
    //     text:    `${alerta.descricao}\n\nAção: ${alerta.acao}\nHorário: ${alerta.timestamp}`
    //   });
    // }

    // ── Push (OneSignal / Firebase FCM) ───────────────────
    // if (process.env.ONESIGNAL_APP_ID) {
    //   await fetch('https://onesignal.com/api/v1/notifications', {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json', 'Authorization': `Basic ${process.env.ONESIGNAL_REST_KEY}` },
    //     body: JSON.stringify({
    //       app_id:            process.env.ONESIGNAL_APP_ID,
    //       included_segments: ['All'],
    //       headings:          { pt: alerta.titulo },
    //       contents:          { pt: alerta.descricao }
    //     })
    //   });
    // }

    // ── Webhook genérico (n8n, Make, Zapier) ──────────────
    // if (process.env.WEBHOOK_URL) {
    //   await fetch(process.env.WEBHOOK_URL, {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify(alerta)
    //   });
    // }
  });

  // Tendência com score alto
  monitor.on('tendencia', (t) => {
    // Aqui pode: publicar em dashboard, salvar em BD, enviar para Slack da redação, etc.
    // Exemplo: console.log(`[TENDÊNCIA ALTA] ${t.tema} — score ${t.score}`);
  });

  // Resultado completo de cada ciclo
  monitor.on('ciclo', (_resultado) => {
    // Aqui pode: salvar relatório em banco, atualizar dashboard WebSocket, exportar para planilha, etc.
  });

  // Erros de ciclo
  monitor.on('erro', (err) => {
    // Aqui pode: notificar administrador, registrar em Sentry/Datadog, etc.
    // Exemplo: await email.send({ para: admin, assunto: 'Erro no monitor', texto: err.message });
    console.error(`  ⚠  Erro registrado. Próximo ciclo continuará normalmente.`);
  });

  monitor.iniciar();
}
