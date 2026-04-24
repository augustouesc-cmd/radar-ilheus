/* ============================================================
   gerador.js — Módulo Gerador IA do Radar Ilhéus
   ============================================================ */

(function () {
  'use strict';

  /* ── Elementos ── */
  const elInput       = document.getElementById('gen-input');
  const elChar        = document.getElementById('gen-char');
  const elBtnGerar    = document.getElementById('btn-gerar');
  const elBtnGerarTxt = document.getElementById('btn-gerar-text');
  const elBtnNovamente = document.getElementById('btn-gerar-novamente');
  const elBtnEditor   = document.getElementById('btn-abrir-editor');
  const elBtnTest     = document.getElementById('btn-test-server');
  const elServerUrl   = document.getElementById('gen-server-url');
  const elServerStatus = document.getElementById('gen-server-status');

  const elEmpty   = document.getElementById('gen-empty');
  const elLoading = document.getElementById('gen-loading');
  const elResult  = document.getElementById('gen-result');
  const elLoadMsg = document.getElementById('gen-loading-msg');

  const elTitulo   = document.getElementById('resultado-titulo');
  const elSubtitulo = document.getElementById('resultado-subtitulo');
  const elResumo   = document.getElementById('resultado-resumo');
  const elVersao   = document.getElementById('resultado-versao');

  /* ── Estado ── */
  let ultimoResultado = null;
  const STORAGE_KEY_SERVER = 'radar_gen_server_url';

  /* ── Carregar URL salva ── */
  const savedUrl = localStorage.getItem(STORAGE_KEY_SERVER);
  if (savedUrl && elServerUrl) elServerUrl.value = savedUrl;

  /* ── Contador de caracteres ── */
  if (elInput) {
    elInput.addEventListener('input', () => {
      const len = elInput.value.length;
      elChar.textContent = len.toLocaleString('pt-BR');
      elBtnGerar.disabled = len < 20;
    });
    elBtnGerar.disabled = true;
  }

  /* ── Testar servidor ── */
  if (elBtnTest) {
    elBtnTest.addEventListener('click', testarServidor);
  }

  async function testarServidor() {
    const url = (elServerUrl?.value || '').trim().replace(/\/$/, '');
    if (!url) return;

    setServerStatus('check', '<i class="fas fa-circle-notch fa-spin"></i> Testando...');
    try {
      const resp = await fetch(url + '/status', { signal: AbortSignal.timeout(5000) });
      const data = await resp.json();
      if (data.ok) {
        setServerStatus('ok', '<i class="fas fa-check-circle"></i> Servidor online na porta ' + (data.porta || '?'));
        localStorage.setItem(STORAGE_KEY_SERVER, url);
      } else {
        setServerStatus('erro', '<i class="fas fa-times-circle"></i> Resposta inesperada');
      }
    } catch (e) {
      setServerStatus('erro', '<i class="fas fa-times-circle"></i> Servidor offline — verifique se está rodando');
    }
  }

  function setServerStatus(tipo, html) {
    elServerStatus.className = 'gen-server-status ' + tipo;
    elServerStatus.innerHTML = html;
  }

  /* ── Gerar ── */
  if (elBtnGerar) {
    elBtnGerar.addEventListener('click', gerar);
  }
  if (elBtnNovamente) {
    elBtnNovamente.addEventListener('click', gerar);
  }

  const mensagensLoading = [
    'Analisando o texto original',
    'Identificando os pontos principais',
    'Criando título viral',
    'Redigindo versão reescrita',
    'Refinando com IA...',
  ];

  async function gerar() {
    const noticia = elInput?.value?.trim();
    if (!noticia || noticia.length < 20) {
      showToast('Cole um texto com pelo menos 20 caracteres.', 'warning');
      return;
    }

    const serverUrl = (elServerUrl?.value || 'http://localhost:3131').trim().replace(/\/$/, '');
    localStorage.setItem(STORAGE_KEY_SERVER, serverUrl);

    // UI: loading
    mostrar('loading');
    elBtnGerar.disabled = true;
    elBtnGerarTxt.textContent = 'Gerando...';
    setServerStatus('', '');

    // Animar mensagens de loading
    let msgIdx = 0;
    const msgInterval = setInterval(() => {
      if (elLoadMsg) {
        elLoadMsg.textContent = mensagensLoading[msgIdx % mensagensLoading.length];
        msgIdx++;
      }
    }, 1800);

    try {
      const resp = await fetch(serverUrl + '/gerar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto: noticia }),
        signal: AbortSignal.timeout(90000), // 90s timeout
      });

      const data = await resp.json();

      if (!resp.ok || data.erro) {
        throw new Error(data.erro || 'Erro desconhecido do servidor');
      }

      ultimoResultado = data;
      renderizarResultado(data);
      mostrar('result');
      showToast('Notícia gerada com sucesso!', 'success');

    } catch (err) {
      mostrar('empty');
      let msg = err.message;
      if (err.name === 'TimeoutError' || err.name === 'AbortError') {
        msg = 'Tempo de espera esgotado. O servidor pode estar sobrecarregado.';
      } else if (msg.includes('fetch') || msg.includes('NetworkError') || msg.includes('Failed to fetch')) {
        msg = 'Não foi possível conectar ao servidor. Verifique se ele está rodando.';
      }
      showToast(msg, 'error');
    } finally {
      clearInterval(msgInterval);
      elBtnGerar.disabled = elInput.value.length < 20;
      elBtnGerarTxt.textContent = 'Gerar com IA';
    }
  }

  function mostrar(estado) {
    elEmpty.style.display   = estado === 'empty'   ? 'flex' : 'none';
    elLoading.style.display = estado === 'loading' ? 'block' : 'none';
    elResult.style.display  = estado === 'result'  ? 'flex' : 'none';
  }

  function renderizarResultado(data) {
    elTitulo.textContent    = data.titulo    || '';
    elSubtitulo.textContent = data.subtitulo || '';
    elResumo.textContent    = data.resumo    || '';
    elVersao.textContent    = data.versao_reescrita || '';
  }

  /* ── Copiar ── */
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-copy]');
    if (!btn) return;

    const elId = btn.getAttribute('data-copy');
    const el = document.getElementById(elId);
    if (!el) return;

    navigator.clipboard.writeText(el.textContent).then(() => {
      btn.classList.add('copied');
      const orig = btn.innerHTML;
      btn.innerHTML = '<i class="fas fa-check"></i> Copiado';
      setTimeout(() => {
        btn.classList.remove('copied');
        btn.innerHTML = orig;
      }, 2000);
    }).catch(() => {
      // Fallback para navegadores sem permissão de clipboard
      const ta = document.createElement('textarea');
      ta.value = el.textContent;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      showToast('Copiado!', 'success');
    });
  });

  /* ── Usar no editor ── */
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-use]');
    if (!btn || !ultimoResultado) return;

    const campo = btn.getAttribute('data-use');
    const pending = {};

    if (campo === 'titulo') {
      pending.titulo = ultimoResultado.titulo;
    } else if (campo === 'subtitulo') {
      pending.subtitulo = ultimoResultado.subtitulo;
    } else if (campo === 'conteudo') {
      pending.conteudo = ultimoResultado.versao_reescrita;
    }

    localStorage.setItem('radar_gen_pending', JSON.stringify(pending));
    window.location.href = 'editor.html';
  });

  /* ── Abrir editor com tudo ── */
  if (elBtnEditor) {
    elBtnEditor.addEventListener('click', () => {
      if (!ultimoResultado) return;
      const pending = {
        titulo:    ultimoResultado.titulo,
        subtitulo: ultimoResultado.subtitulo,
        conteudo:  ultimoResultado.versao_reescrita,
      };
      localStorage.setItem('radar_gen_pending', JSON.stringify(pending));
      window.location.href = 'editor.html';
    });
  }

  /* ── Sugestão da IA no editor (NÃO injeta automaticamente) ── */
  function mostrarSugestaoIANoEditor() {
    const raw = localStorage.getItem('radar_gen_pending');
    if (!raw) return;

    let pending;
    try { pending = JSON.parse(raw); } catch { localStorage.removeItem('radar_gen_pending'); return; }
    if (!pending.titulo && !pending.subtitulo && !pending.conteudo) {
      localStorage.removeItem('radar_gen_pending');
      return;
    }

    // Mostra barra de aviso — usuário decide se aplica
    const bar = document.createElement('div');
    bar.id = 'ia-pending-bar';
    bar.style.cssText = [
      'background:#fffbeb',
      'border:1px solid #f59e0b',
      'border-radius:8px',
      'padding:12px 16px',
      'margin-bottom:16px',
      'display:flex',
      'align-items:center',
      'gap:12px',
      'flex-wrap:wrap',
      'font-size:.85rem'
    ].join(';');
    bar.innerHTML = `
      <i class="fas fa-robot" style="color:#f59e0b;font-size:1.1rem;flex-shrink:0"></i>
      <span style="flex:1"><strong>Sugestão da IA disponível.</strong> O conteúdo gerado NÃO foi aplicado. Clique em "Aplicar" para usar, ou descarte.</span>
      <button type="button" id="btn-ia-aplicar" class="btn btn-secondary btn-sm" style="border-color:#f59e0b;color:#92400e;white-space:nowrap">
        <i class="fas fa-check"></i> Aplicar sugestão
      </button>
      <button type="button" id="btn-ia-descartar" class="btn btn-secondary btn-sm" style="white-space:nowrap">
        <i class="fas fa-times"></i> Descartar
      </button>`;

    const form = document.getElementById('editor-form');
    if (form) form.insertBefore(bar, form.firstChild);

    document.getElementById('btn-ia-descartar').addEventListener('click', () => {
      localStorage.removeItem('radar_gen_pending');
      bar.remove();
    });

    document.getElementById('btn-ia-aplicar').addEventListener('click', () => {
      localStorage.removeItem('radar_gen_pending');

      // Aplica sem disparar eventos de input (evita auto-save acidental)
      if (pending.titulo) {
        const el = document.getElementById('field-title');
        if (el) el.value = pending.titulo;
      }
      if (pending.subtitulo) {
        const el = document.getElementById('field-subtitle');
        if (el) el.value = pending.subtitulo;
      }
      if (pending.conteudo) {
        const el = document.getElementById('editor-content');
        if (el) {
          const html = pending.conteudo
            .split(/\n\n+/)
            .map(p => `<p>${p.trim().replace(/\n/g, '<br>')}</p>`)
            .join('');
          el.innerHTML = html;
        }
      }

      bar.remove();
      showToast('Sugestão aplicada. Revise e salve manualmente quando quiser.', 'success');
    });
  }

  // Exibir barra de sugestão quando o editor carregar (sem injeção automática)
  if (document.getElementById('editor-content')) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', mostrarSugestaoIANoEditor);
    } else {
      setTimeout(mostrarSugestaoIANoEditor, 350);
    }
  }

})();
