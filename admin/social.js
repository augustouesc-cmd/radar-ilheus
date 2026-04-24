/* ============================================================
   social.js — Gerador de Conteúdo para Instagram
   ============================================================ */

(function () {
  'use strict';

  /* ── Elementos ── */
  const elInput      = document.getElementById('soc-input');
  const elChar       = document.getElementById('soc-char');
  const elBtn        = document.getElementById('btn-gerar-social');
  const elBtnTxt     = document.getElementById('btn-soc-text');
  const elBtnTest    = document.getElementById('btn-soc-test');
  const elServerUrl  = document.getElementById('soc-server-url');
  const elSrvStatus  = document.getElementById('soc-server-status');
  const elCards      = document.getElementById('soc-cards');
  const elLoading    = document.getElementById('soc-loading');
  const elLoadSub    = document.getElementById('soc-loading-sub');
  const elBtnTudo    = document.getElementById('btn-copiar-tudo');

  /* Resultado */
  const elTitulo   = document.getElementById('soc-res-titulo');
  const elLegenda  = document.getElementById('soc-res-legenda');
  const elChamada  = document.getElementById('soc-res-chamada');
  const elHashtags = document.getElementById('soc-res-hashtags');
  const elStories  = document.getElementById('soc-res-stories');

  /* Preview */
  const elOverlayTitulo  = document.getElementById('ig-overlay-titulo');
  const elTitleOverlay   = document.getElementById('ig-title-overlay');
  const elIgPlaceholder  = document.getElementById('ig-placeholder');
  const elCaptionText    = document.getElementById('ig-caption-text');
  const elTagsPreview    = document.getElementById('ig-tags-preview');
  const elStoriesText    = document.getElementById('ig-stories-text');

  /* ── Estado ── */
  let ultimoResultado = null;
  const STORAGE_KEY_URL = 'radar_gen_server_url';

  /* ── Carregar URL salva ── */
  const savedUrl = localStorage.getItem(STORAGE_KEY_URL);
  if (savedUrl && elServerUrl) elServerUrl.value = savedUrl;

  /* ── Contador ── */
  elInput?.addEventListener('input', () => {
    const len = elInput.value.length;
    if (elChar) elChar.textContent = len.toLocaleString('pt-BR');
    if (elBtn)  elBtn.disabled = len < 20;
  });

  /* ── Tabs Feed / Stories ── */
  document.querySelectorAll('.preview-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.preview-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const view = tab.dataset.view;
      document.getElementById('preview-feed').style.display    = view === 'feed'    ? 'flex' : 'none';
      document.getElementById('preview-stories').style.display = view === 'stories' ? 'flex' : 'none';
    });
  });

  /* ── Testar servidor ── */
  elBtnTest?.addEventListener('click', async () => {
    const url = (elServerUrl?.value || '').trim().replace(/\/$/, '');
    setServerStatus('check', '<i class="fas fa-circle-notch fa-spin"></i> Testando...');
    try {
      const resp = await fetch(url + '/status', { signal: AbortSignal.timeout(5000) });
      const data = await resp.json();
      if (data.ok) {
        setServerStatus('ok', '<i class="fas fa-check-circle"></i> Online');
        localStorage.setItem(STORAGE_KEY_URL, url);
      } else {
        setServerStatus('erro', '<i class="fas fa-times-circle"></i> Resposta inválida');
      }
    } catch {
      setServerStatus('erro', '<i class="fas fa-times-circle"></i> Servidor offline');
    }
  });

  function setServerStatus(tipo, html) {
    if (!elSrvStatus) return;
    elSrvStatus.className = 'soc-server-status ' + tipo;
    elSrvStatus.innerHTML = html;
  }

  /* ── Gerar ── */
  elBtn?.addEventListener('click', gerar);

  const loadingMsgs = [
    'Adaptando para o formato Instagram',
    'Criando título impactante...',
    'Escrevendo legenda com emojis...',
    'Selecionando hashtags relevantes...',
    'Preparando versão Stories...',
  ];

  async function gerar() {
    const noticia = elInput?.value?.trim();
    if (!noticia || noticia.length < 20) return;

    const serverUrl = (elServerUrl?.value || 'http://localhost:3131').trim().replace(/\/$/, '');
    localStorage.setItem(STORAGE_KEY_URL, serverUrl);

    setLoading(true);

    let msgIdx = 0;
    const msgTimer = setInterval(() => {
      if (elLoadSub) elLoadSub.textContent = loadingMsgs[msgIdx % loadingMsgs.length];
      msgIdx++;
    }, 1800);

    try {
      const resp = await fetch(serverUrl + '/social', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ noticia }),
        signal: AbortSignal.timeout(90000)
      });

      const data = await resp.json();
      if (!resp.ok || data.erro) throw new Error(data.erro || 'Erro desconhecido');

      ultimoResultado = data;
      renderResultado(data);
      atualizarPreview(data);

      if (elCards) elCards.style.display = 'block';
      toast('Conteúdo gerado com sucesso!', 'success');

    } catch (err) {
      let msg = err.message;
      if (err.name === 'TimeoutError' || err.name === 'AbortError') msg = 'Tempo esgotado. Servidor lento.';
      else if (msg.includes('fetch') || msg.includes('Failed')) msg = 'Servidor offline. Inicie: cd servidor && npm start';
      toast(msg, 'error');
    } finally {
      clearInterval(msgTimer);
      setLoading(false);
    }
  }

  /* ── Renderizar resultado nos cards ── */
  function renderResultado(data) {
    if (elTitulo)  elTitulo.textContent  = data.titulo  || '';
    if (elLegenda) elLegenda.textContent = data.legenda || '';
    if (elChamada) elChamada.textContent = data.chamada || '';
    if (elStories) elStories.textContent = data.stories || '';

    // Hashtags como tags visuais
    if (elHashtags) {
      elHashtags.innerHTML = '';
      const tags = Array.isArray(data.hashtags) ? data.hashtags : [];
      tags.forEach(tag => {
        const span = document.createElement('span');
        span.className = 'soc-tag';
        span.textContent = tag.startsWith('#') ? tag : '#' + tag;
        elHashtags.appendChild(span);
      });
    }
  }

  /* ── Atualizar preview do Instagram ── */
  function atualizarPreview(data) {
    // Feed: título na overlay da imagem
    if (elOverlayTitulo) elOverlayTitulo.textContent = data.titulo || '';
    if (elTitleOverlay)  elTitleOverlay.style.display = 'flex';
    if (elIgPlaceholder) elIgPlaceholder.style.display = 'none';

    // Feed: legenda + chamada
    if (elCaptionText) {
      elCaptionText.classList.remove('ig-caption-placeholder');
      const preview = (data.legenda || '').split('\n').slice(0, 3).join(' ') + (data.chamada ? '\n' + data.chamada : '');
      elCaptionText.textContent = preview.slice(0, 120) + (preview.length > 120 ? '... mais' : '');
    }

    // Feed: hashtags
    if (elTagsPreview) {
      const tags = Array.isArray(data.hashtags) ? data.hashtags.slice(0, 8).join(' ') : '';
      elTagsPreview.textContent = tags;
      elTagsPreview.style.display = tags ? 'block' : 'none';
    }

    // Stories: texto
    if (elStoriesText) {
      elStoriesText.classList.remove('ig-caption-placeholder');
      elStoriesText.textContent = data.stories || '';
    }
  }

  /* ── Copiar individual ── */
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.soc-copy-btn[data-target]');
    if (!btn) return;

    const el = document.getElementById(btn.dataset.target);
    if (!el) return;

    // Extrair texto puro (sem tags HTML)
    const texto = el.innerText || el.textContent || '';
    copiarTexto(texto, btn);
  });

  /* ── Copiar legenda completa ── */
  elBtnTudo?.addEventListener('click', () => {
    if (!ultimoResultado) return;
    const tags = Array.isArray(ultimoResultado.hashtags)
      ? ultimoResultado.hashtags.join(' ')
      : '';
    const tudo = [
      ultimoResultado.legenda,
      '',
      ultimoResultado.chamada,
      '',
      '.',
      '.',
      '.',
      tags
    ].filter(l => l !== undefined).join('\n');

    copiarTexto(tudo, elBtnTudo);
  });

  function copiarTexto(texto, btn) {
    navigator.clipboard.writeText(texto).then(() => {
      btn.classList.add('copied');
      const orig = btn.innerHTML;
      btn.innerHTML = '<i class="fas fa-check"></i> Copiado!';
      setTimeout(() => {
        btn.classList.remove('copied');
        btn.innerHTML = orig;
      }, 2000);
    }).catch(() => {
      const ta = document.createElement('textarea');
      ta.value = texto;
      ta.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      toast('Copiado!', 'success');
    });
  }

  /* ── Loading ── */
  function setLoading(show) {
    if (elLoading) elLoading.style.display = show ? 'flex' : 'none';
    if (elBtn)     elBtn.disabled = show;
    if (elBtnTxt)  elBtnTxt.textContent = show ? 'Gerando...' : 'Gerar para Instagram';
  }

})();
