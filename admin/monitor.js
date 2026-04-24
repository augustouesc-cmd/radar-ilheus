/* ============================================================
   monitor.js — Sistema de monitoramento de tendências IA
   ============================================================ */

(function () {
  'use strict';

  /* ── Configurações de classificação ── */
  const CLASSE_CFG = {
    urgente:  { label: 'Urgente',  cor: '#E10600', bg: '#fef2f2', icone: 'fa-bolt' },
    alerta:   { label: 'Alerta',   cor: '#c2410c', bg: '#fff7ed', icone: 'fa-triangle-exclamation' },
    politica: { label: 'Política', cor: '#0A1F44', bg: '#eff6ff', icone: 'fa-landmark' },
    positiva: { label: 'Positiva', cor: '#15803d', bg: '#f0fdf4', icone: 'fa-circle-check' },
    comum:    { label: 'Comum',    cor: '#4b5563', bg: '#f9fafb', icone: 'fa-circle' }
  };

  /* ── Estado ── */
  let refreshTimer   = null;
  let countdownTimer = null;
  let countdownSecs  = 0;
  let isRunning      = false;
  let notifHistory   = JSON.parse(localStorage.getItem('radar_monitor_history') || '[]');

  /* ── Elementos do DOM ── */
  const el = {
    btnVerificar:     document.getElementById('btn-verificar'),
    interval:         document.getElementById('monitor-interval'),
    liveBadge:        document.getElementById('monitor-live-badge'),
    liveLabel:        document.getElementById('monitor-live-label'),
    msbMsg:           document.getElementById('msb-msg'),
    msbMeta:          document.getElementById('msb-meta'),
    msbSinais:        document.getElementById('msb-sinais'),
    msbTime:          document.getElementById('msb-time'),
    msbNextWrap:      document.getElementById('msb-next-wrap'),
    msbNext:          document.getElementById('msb-next'),
    tendenciasEl:     document.getElementById('tendencias-container'),
    tendenciasSub:    document.getElementById('tendencias-sub'),
    tendenciasEmpty:  document.getElementById('tendencias-empty'),
    sugestoesEl:      document.getElementById('sugestoes-container'),
    sugestoesSub:     document.getElementById('sugestoes-sub'),
    sugestoesEmpty:   document.getElementById('sugestoes-empty'),
    alertasEl:        document.getElementById('alertas-container'),
    alertasBadge:     document.getElementById('alertas-badge'),
    alertasEmpty:     document.getElementById('alertas-empty'),
    notifHistory:     document.getElementById('notif-history'),
    notifEmpty:       document.getElementById('notif-empty'),
    loading:          document.getElementById('monitor-loading'),
    loadingSubMsg:    document.getElementById('loading-sub-msg'),
    sidebarPulse:     document.getElementById('monitor-sidebar-pulse'),
    sidebarLabel:     document.getElementById('monitor-sidebar-label'),
    modalSend:        document.getElementById('modal-send-alert'),
    modalAlertIcon:   document.getElementById('modal-alert-icon'),
    modalAlertTitle:  document.getElementById('modal-alert-title'),
    modalAlertDesc:   document.getElementById('modal-alert-desc'),
    modalAlertClose:  document.getElementById('modal-alert-close'),
    btnLimpar:        document.getElementById('btn-limpar-historico'),
  };

  /* ── Init ── */
  function init() {
    solicitarPermissaoNotificacao();
    renderHistorico();
    carregarPreferencias();
    setupListeners();
  }

  function setupListeners() {
    el.btnVerificar?.addEventListener('click', () => verificarTendencias());
    el.interval?.addEventListener('change', () => {
      const secs = parseInt(el.interval.value || '0');
      localStorage.setItem('radar_monitor_interval', secs);
      reiniciarAutoRefresh(secs);
    });
    el.modalAlertClose?.addEventListener('click', fecharModalEnvio);
    el.btnLimpar?.addEventListener('click', () => {
      notifHistory = [];
      localStorage.removeItem('radar_monitor_history');
      renderHistorico();
      toast('Histórico limpo.', 'info');
    });
  }

  function carregarPreferencias() {
    const saved = localStorage.getItem('radar_monitor_interval');
    if (saved && el.interval) {
      el.interval.value = saved;
      const secs = parseInt(saved);
      if (secs > 0) reiniciarAutoRefresh(secs);
    }
  }

  /* ── Permissão de notificação ── */
  function solicitarPermissaoNotificacao() {
    if ('Notification' in window && Notification.permission === 'default') {
      setTimeout(() => {
        Notification.requestPermission().then(perm => {
          if (perm === 'granted') {
            toast('Notificações de alerta ativadas!', 'success');
          }
        });
      }, 2000);
    }
  }

  /* ── Auto-refresh ── */
  function reiniciarAutoRefresh(segundos) {
    clearInterval(refreshTimer);
    clearInterval(countdownTimer);
    el.msbNextWrap.style.display = 'none';

    if (segundos <= 0) {
      setLiveState('idle');
      return;
    }

    setLiveState('active');
    agendarProximaVerificacao(segundos);
  }

  function agendarProximaVerificacao(segundos) {
    countdownSecs = segundos;
    atualizarContador();
    el.msbNextWrap.style.display = 'flex';
    countdownTimer = setInterval(() => {
      countdownSecs--;
      if (countdownSecs <= 0) {
        clearInterval(countdownTimer);
        verificarTendencias().then(() => {
          const interval = parseInt(el.interval?.value || '0');
          if (interval > 0) agendarProximaVerificacao(interval);
        });
      } else {
        atualizarContador();
      }
    }, 1000);
    refreshTimer = null;
  }

  function atualizarContador() {
    if (!el.msbNext) return;
    const m = Math.floor(countdownSecs / 60);
    const s = countdownSecs % 60;
    el.msbNext.textContent = m > 0 ? `${m}m ${s}s` : `${s}s`;
  }

  /* ── Estados visuais ── */
  function setLiveState(state) {
    const badge = el.liveBadge;
    const label = el.liveLabel;
    const dot   = el.sidebarPulse;
    const slbl  = el.sidebarLabel;

    badge?.classList.remove('is-live', 'is-active');
    if (state === 'running') {
      badge?.classList.add('is-live');
      if (label) label.textContent = 'Monitorando';
      if (dot)   dot.style.color = '#E10600';
      if (slbl)  slbl.textContent = 'Monitorando...';
    } else if (state === 'active') {
      badge?.classList.add('is-active');
      if (label) label.textContent = 'Auto-atualização';
      if (dot)   dot.style.color = '#16a34a';
      if (slbl)  slbl.textContent = 'Monitor ativo';
    } else {
      if (label) label.textContent = 'Aguardando';
      if (dot)   dot.style.color = '#6b7280';
      if (slbl)  slbl.textContent = 'Monitor offline';
    }
  }

  /* ── VERIFICAÇÃO PRINCIPAL ── */
  async function verificarTendencias() {
    if (isRunning) return;
    isRunning = true;

    setLiveState('running');
    mostrarLoading(true);

    // Pegar artigos publicados para contexto
    const artigos = obterArtigosPublicados();
    const serverUrl = obterServerUrl();

    // Animação dos steps
    animarLoadingSteps();

    try {
      const resp = await fetch(serverUrl + '/tendencias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artigos }),
        signal: AbortSignal.timeout(120000)
      });

      const data = await resp.json();
      if (!resp.ok || data.erro) throw new Error(data.erro || 'Erro desconhecido');

      mostrarLoading(false);
      renderResultados(data);

      // Disparar alertas automáticos para urgentes/alertas
      const alertasAuto = (data.alertas || []).filter(a => a.tipo === 'urgente' || a.tipo === 'alerta');
      for (const alerta of alertasAuto) {
        dispararAlertaAutomatico(alerta);
      }

      const interval = parseInt(el.interval?.value || '0');
      setLiveState(interval > 0 ? 'active' : 'idle');

      toast(`${(data.tendencias || []).length} tendências detectadas`, 'success');

    } catch (err) {
      mostrarLoading(false);
      setLiveState('idle');

      let msg = err.message;
      if (err.name === 'TimeoutError' || err.name === 'AbortError') msg = 'Tempo esgotado. Servidor pode estar lento.';
      else if (msg.includes('fetch') || msg.includes('Failed')) msg = 'Servidor offline. Inicie: cd servidor && npm start';

      if (el.msbMsg) {
        el.msbMsg.innerHTML = `<i class="fas fa-exclamation-triangle" style="color:var(--red)"></i> ${msg}`;
      }
      toast(msg, 'error');
    } finally {
      isRunning = false;
    }
  }

  /* ── Loader ── */
  function mostrarLoading(show) {
    if (!el.loading) return;
    el.loading.style.display = show ? 'flex' : 'none';
    if (show) {
      // Reset steps
      ['step-1', 'step-2', 'step-3'].forEach(id => {
        const s = document.getElementById(id);
        if (s) { s.className = 'loading-step loading-step--wait'; s.querySelector('i').className = 'fas fa-circle'; }
      });
      const s1 = document.getElementById('step-1');
      if (s1) { s1.className = 'loading-step'; s1.querySelector('i').className = 'fas fa-circle-notch fa-spin'; }
    }
  }

  function animarLoadingSteps() {
    const steps = [
      { id: 'step-1', delay: 0,    msg: 'Coletando sinais em tempo real' },
      { id: 'step-2', delay: 3000, msg: 'Analisando com IA...' },
      { id: 'step-3', delay: 7000, msg: 'Gerando sugestões de notícias' },
    ];
    steps.forEach(({ id, delay, msg }) => {
      setTimeout(() => {
        if (!el.loading || el.loading.style.display === 'none') return;
        const prev = steps.find(s => s.delay < delay);
        if (prev) {
          const prevEl = document.getElementById(prev.id);
          if (prevEl) { prevEl.className = 'loading-step loading-step--done'; prevEl.querySelector('i').className = 'fas fa-check'; }
        }
        const step = document.getElementById(id);
        if (step) { step.className = 'loading-step'; step.querySelector('i').className = 'fas fa-circle-notch fa-spin'; }
        if (el.loadingSubMsg) el.loadingSubMsg.textContent = msg;
      }, delay);
    });
  }

  /* ── Renderização ── */
  function renderResultados(data) {
    const agora = new Date();
    const horaFmt = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    // Status bar
    if (el.msbMsg)    el.msbMsg.textContent = `Última análise às ${horaFmt} — ${data.sinais_analisados || '?'} sinais processados`;
    if (el.msbSinais) el.msbSinais.textContent = data.sinais_analisados || '?';
    if (el.msbTime)   el.msbTime.textContent = horaFmt;
    if (el.msbMeta)   el.msbMeta.style.display = 'flex';

    renderTendencias(data.tendencias || []);
    renderAlertas(data.alertas || []);
    renderSugestoes(data.sugestoes || []);
  }

  function renderTendencias(tendencias) {
    if (!el.tendenciasEl) return;
    if (!tendencias.length) {
      if (el.tendenciasEmpty) el.tendenciasEmpty.style.display = 'flex';
      if (el.tendenciasSub)   el.tendenciasSub.textContent = 'nenhuma';
      return;
    }
    if (el.tendenciasEmpty) el.tendenciasEmpty.style.display = 'none';
    if (el.tendenciasSub)   el.tendenciasSub.textContent = `${tendencias.length} em alta`;

    // Remover cards antigos
    el.tendenciasEl.querySelectorAll('.tendencia-card').forEach(c => c.remove());

    tendencias.forEach((t, i) => {
      const cfg  = CLASSE_CFG[t.categoria] || CLASSE_CFG.comum;
      const pct  = Math.min(100, Math.max(0, (t.score / 10) * 100));
      const sinaisHtml = (t.sinais || []).slice(0, 2).map(s => `<div class="tc-sinal">${s}</div>`).join('');

      const card = document.createElement('div');
      card.className = `tendencia-card tc--${t.categoria}`;
      card.style.animationDelay = `${i * 80}ms`;
      card.innerHTML = `
        <div class="tc-header">
          <div class="tc-tema">${t.tema}</div>
          <div class="tc-score-badge">${t.score?.toFixed(1) || '—'}</div>
        </div>
        <div class="tc-score-bar-wrap">
          <div class="tc-score-bar-track">
            <div class="tc-score-bar-fill" data-pct="${pct}" style="width:0"></div>
          </div>
        </div>
        <div class="tc-meta">
          <span class="badge badge-class badge-class--${t.categoria}">${cfg.label}</span>
        </div>
        <div class="tc-motivo">${t.motivo || ''}</div>
        ${sinaisHtml ? `<div class="tc-sinais">${sinaisHtml}</div>` : ''}`;

      el.tendenciasEl.appendChild(card);

      // Animar barra
      requestAnimationFrame(() => {
        setTimeout(() => {
          const bar = card.querySelector('.tc-score-bar-fill');
          if (bar) bar.style.width = pct + '%';
        }, 100 + i * 80);
      });
    });
  }

  function renderAlertas(alertas) {
    if (!el.alertasEl) return;

    // Remover alertas antigos
    el.alertasEl.querySelectorAll('.alerta-card').forEach(c => c.remove());

    if (!alertas.length) {
      if (el.alertasEmpty) el.alertasEmpty.style.display = 'flex';
      if (el.alertasBadge) el.alertasBadge.style.display = 'none';
      return;
    }

    if (el.alertasEmpty) el.alertasEmpty.style.display = 'none';
    if (el.alertasBadge) {
      el.alertasBadge.textContent = alertas.length;
      el.alertasBadge.style.display = 'inline-block';
    }

    const horaFmt = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    alertas.forEach((a, i) => {
      const card = document.createElement('div');
      card.className = 'alerta-card';
      card.style.animationDelay = `${i * 60}ms`;
      card.dataset.alertaIdx = i;
      card.innerHTML = `
        <div class="ac-header">
          <div class="ac-title">${a.titulo}</div>
          <span class="ac-tipo ac-tipo--${a.tipo}"><i class="fas ${getTipoIcone(a.tipo)}"></i> ${a.tipo}</span>
        </div>
        <div class="ac-desc">${a.descricao}</div>
        <div class="ac-acao"><i class="fas fa-arrow-right"></i> ${a.acao}</div>
        <div class="ac-footer">
          <span class="ac-time">${horaFmt}</span>
          <button type="button" class="btn-notif" data-alerta-idx="${i}">
            <i class="fas fa-bell"></i> Notificar
          </button>
        </div>`;

      el.alertasEl.appendChild(card);
    });

    // Event delegation para botões Notificar
    el.alertasEl.addEventListener('click', function handler(e) {
      const btn = e.target.closest('.btn-notif');
      if (!btn || btn.classList.contains('sent')) return;
      const idx = parseInt(btn.dataset.alertaIdx);
      if (isNaN(idx) || !alertas[idx]) return;
      btn.classList.add('sent');
      btn.innerHTML = '<i class="fas fa-check"></i> Enviado';
      simularEnvioAlerta(alertas[idx]);
    }, { once: false });
  }

  function renderSugestoes(sugestoes) {
    if (!el.sugestoesEl) return;
    if (el.sugestoesEmpty) el.sugestoesEmpty.style.display = 'none';

    el.sugestoesEl.querySelectorAll('.sugestao-card').forEach(c => c.remove());

    if (!sugestoes.length) {
      if (el.sugestoesEmpty) el.sugestoesEmpty.style.display = 'flex';
      if (el.sugestoesSub)   el.sugestoesSub.textContent = 'nenhuma';
      return;
    }

    if (el.sugestoesSub) el.sugestoesSub.textContent = `${sugestoes.length} sugestões`;

    sugestoes.forEach((s, i) => {
      const card = document.createElement('div');
      card.className = 'sugestao-card';
      card.style.animationDelay = `${i * 100}ms`;
      card.innerHTML = `
        <div class="sc-header">
          <span class="badge badge-category">${s.categoria || 'Geral'}</span>
        </div>
        <div class="sc-titulo">${s.titulo_sugerido}</div>
        <div class="sc-body">
          <div class="sc-justif">${s.justificativa || ''}</div>
          ${s.angulo ? `<div class="sc-angulo"><i class="fas fa-compass"></i> ${s.angulo}</div>` : ''}
        </div>
        <div class="sc-footer">
          <span style="font-size:.72rem;color:var(--muted)"><i class="fas fa-lightbulb"></i> Sugestão da IA</span>
          <button type="button" class="btn btn-primary btn-sm" data-titulo="${encodeURIComponent(s.titulo_sugerido)}" data-cat="${encodeURIComponent(s.categoria || '')}">
            <i class="fas fa-plus"></i> Criar Notícia
          </button>
        </div>`;

      el.sugestoesEl.appendChild(card);
    });

    // Abrir editor ao clicar em "Criar Notícia"
    el.sugestoesEl.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-titulo]');
      if (!btn) return;
      const titulo = decodeURIComponent(btn.dataset.titulo || '');
      const cat    = decodeURIComponent(btn.dataset.cat || '');
      abrirEditorComSugestao(titulo, cat);
    });
  }

  /* ── Alertas automáticos (urgente/alerta) ── */
  function dispararAlertaAutomatico(alerta) {
    // Browser Notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(`⚡ Radar Ilhéus — ${alerta.titulo}`, {
        body: alerta.descricao,
        tag: 'radar-auto-' + Date.now(),
        requireInteraction: alerta.tipo === 'urgente'
      });
    }
    // Registrar no histórico automaticamente
    adicionarHistorico(alerta, ['auto']);
  }

  /* ── Simulação de envio de alerta ── */
  function simularEnvioAlerta(alerta) {
    // Abrir modal
    abrirModalEnvio(alerta);

    // Browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(`🔔 Radar Ilhéus — ${alerta.titulo}`, {
        body: alerta.descricao,
        tag: 'radar-manual-' + Date.now()
      });
    } else if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(p => {
        if (p === 'granted') {
          new Notification(`🔔 Radar Ilhéus — ${alerta.titulo}`, { body: alerta.descricao });
        }
      });
    }

    // Registrar no histórico
    adicionarHistorico(alerta, ['browser', 'whatsapp', 'email', 'push']);
    toast(`Alerta enviado: ${alerta.titulo}`, 'success');
  }

  function abrirModalEnvio(alerta) {
    if (!el.modalSend) return;

    // Configurar modal
    const icon = el.modalAlertIcon;
    if (icon) {
      icon.className = `modal-alert-icon ${alerta.tipo}`;
      icon.innerHTML = `<i class="fas ${getTipoIcone(alerta.tipo)}"></i>`;
    }
    if (el.modalAlertTitle) el.modalAlertTitle.textContent = alerta.titulo;
    if (el.modalAlertDesc)  el.modalAlertDesc.textContent  = alerta.descricao;

    // Reset canais
    const canais = [
      { id: 'ch-browser',  label: 'Notificação do navegador' },
      { id: 'ch-whatsapp', label: 'WhatsApp da redação' },
      { id: 'ch-email',    label: 'E-mail da equipe' },
      { id: 'ch-push',     label: 'Push mobile' },
    ];
    canais.forEach(c => {
      const el2 = document.getElementById(c.id);
      if (el2) {
        el2.className = 'send-channel';
        el2.querySelector('.send-status').textContent = '—';
      }
    });

    el.modalSend.classList.add('open');

    // Animar envio canal por canal
    canais.forEach(({ id }, i) => {
      const chEl = document.getElementById(id);
      setTimeout(() => {
        if (chEl) {
          chEl.className = 'send-channel sending';
          chEl.querySelector('.send-status').textContent = 'Enviando...';
        }
      }, i * 600);
      setTimeout(() => {
        if (chEl) {
          chEl.className = 'send-channel done';
          chEl.querySelector('.send-status').textContent = '✓ Enviado';
        }
      }, i * 600 + 500);
    });
  }

  function fecharModalEnvio() {
    el.modalSend?.classList.remove('open');
  }

  /* ── Histórico de notificações ── */
  function adicionarHistorico(alerta, canais = []) {
    const item = {
      tipo:      alerta.tipo,
      titulo:    alerta.titulo,
      descricao: alerta.descricao,
      canais,
      timestamp: new Date().toISOString()
    };
    notifHistory.unshift(item);
    // Manter máximo 50 itens
    if (notifHistory.length > 50) notifHistory.splice(50);
    localStorage.setItem('radar_monitor_history', JSON.stringify(notifHistory));
    renderHistorico();
  }

  function renderHistorico() {
    if (!el.notifHistory) return;

    el.notifHistory.querySelectorAll('.notif-item').forEach(i => i.remove());

    if (!notifHistory.length) {
      if (el.notifEmpty) el.notifEmpty.style.display = 'flex';
      return;
    }
    if (el.notifEmpty) el.notifEmpty.style.display = 'none';

    notifHistory.slice(0, 20).forEach(item => {
      const horaFmt = new Date(item.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      const dataFmt = new Date(item.timestamp).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      const canaisHtml = item.canais.map(c => {
        const label = { browser: 'Navegador', whatsapp: 'WhatsApp', email: 'E-mail', push: 'Push', auto: 'Auto' };
        return `<span class="notif-ch-tag ok">${label[c] || c}</span>`;
      }).join('');

      const div = document.createElement('div');
      div.className = 'notif-item';
      div.innerHTML = `
        <div class="notif-dot notif-dot--${item.tipo}"></div>
        <div class="notif-content">
          <div class="notif-title">${item.titulo}</div>
          <div class="notif-meta">${dataFmt} às ${horaFmt}</div>
          ${canaisHtml ? `<div class="notif-channels">${canaisHtml}</div>` : ''}
        </div>`;

      el.notifHistory.appendChild(div);
    });
  }

  /* ── Abrir editor com sugestão ── */
  function abrirEditorComSugestao(titulo, categoria) {
    const pending = { titulo, categoria };
    localStorage.setItem('radar_monitor_pending', JSON.stringify(pending));
    window.location.href = 'editor.html';
  }

  /* ── Helpers ── */
  async function obterArtigosPublicados() {
    try {
      const res = await fetch('/articles');
      const all = await res.json();
      return all.filter(a => a.status === 'published').slice(0, 10).map(a => ({
        title: a.title, category: a.category
      }));
    } catch { return []; }
  }

  function obterServerUrl() {
    return (localStorage.getItem('radar_gen_server_url') || 'http://localhost:3131').replace(/\/$/, '');
  }

  function getTipoIcone(tipo) {
    return { urgente: 'fa-bolt', alerta: 'fa-triangle-exclamation', tendencia: 'fa-chart-line' }[tipo] || 'fa-bell';
  }

  /* ── Injeção no editor ── */
  function injetarPendingDoMonitor() {
    const raw = localStorage.getItem('radar_monitor_pending');
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      localStorage.removeItem('radar_monitor_pending');
      if (data.titulo) {
        const el2 = document.getElementById('field-title');
        if (el2) { el2.value = data.titulo; el2.dispatchEvent(new Event('input')); }
      }
      if (data.categoria) {
        const sel = document.getElementById('field-category');
        if (sel) {
          const opt = Array.from(sel.options).find(o => o.value === data.categoria || o.text === data.categoria);
          if (opt) { sel.value = opt.value; sel.dispatchEvent(new Event('change')); }
        }
      }
      if (typeof toast === 'function') toast('Sugestão do monitor carregada!', 'success');
    } catch { /* ignora */ }
  }

  if (document.getElementById('editor-content')) {
    document.addEventListener('DOMContentLoaded', injetarPendingDoMonitor);
    if (document.readyState !== 'loading') setTimeout(injetarPendingDoMonitor, 400);
  }

  init();

})();
