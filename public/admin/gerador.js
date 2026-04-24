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

  /* ── Injeção no editor (roda se estiver no editor.html) ── */
  function injetarPendingNoEditor() {
    const raw = localStorage.getItem('radar_gen_pending');
    if (!raw) return;

    try {
      const pending = JSON.parse(raw);
      localStorage.removeItem('radar_gen_pending');

      if (pending.titulo) {
        const el = document.getElementById('field-title');
        if (el) { el.value = pending.titulo; el.dispatchEvent(new Event('input')); }
      }
      if (pending.subtitulo) {
        const el = document.getElementById('field-subtitle');
        if (el) { el.value = pending.subtitulo; el.dispatchEvent(new Event('input')); }
      }
      if (pending.conteudo) {
        const el = document.getElementById('editor-content');
        if (el) {
          // Converter quebras de linha em parágrafos HTML
          const html = pending.conteudo
            .split(/\n\n+/)
            .map(p => `<p>${p.trim().replace(/\n/g, '<br>')}</p>`)
            .join('');
          el.innerHTML = html;
          el.dispatchEvent(new Event('input'));
        }
      }

      showToast('Campos preenchidos com o conteúdo da IA!', 'success');
    } catch { /* ignora */ }
  }

  // Executar injeção se estiver no editor
  if (document.getElementById('editor-content')) {
    document.addEventListener('DOMContentLoaded', injetarPendingNoEditor);
    // Tentar também após um pequeno delay (caso o admin.js já tenha rodado DOMContentLoaded)
    if (document.readyState !== 'loading') {
      setTimeout(injetarPendingNoEditor, 300);
    }
  }

})();
