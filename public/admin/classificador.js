/* ============================================================
   classificador.js — Classificação automática de notícias com IA
   ============================================================ */

(function () {
  'use strict';

  const CONFIG = {
    urgente:  { label: 'Urgente',  icone: 'fa-bolt',             cor: '#E10600' },
    alerta:   { label: 'Alerta',   icone: 'fa-triangle-exclamation', cor: '#f97316' },
    politica: { label: 'Política', icone: 'fa-landmark',         cor: '#0A1F44' },
    positiva: { label: 'Positiva', icone: 'fa-circle-check',     cor: '#16a34a' },
    comum:    { label: 'Comum',    icone: 'fa-circle',           cor: '#6b7280' }
  };

  /* ── Só inicializa se estiver no editor ── */
  const btnClassificar = document.getElementById('btn-classificar');
  if (!btnClassificar) return;

  const elResultado       = document.getElementById('class-result');
  const elJustificativa   = document.getElementById('class-justification');
  const fieldClass        = document.getElementById('field-classification');
  const fieldJustif       = document.getElementById('field-classification-justification');
  const elServerUrl       = document.getElementById('gen-server-url');

  /* ── Restaurar classificação existente ── */
  const valAtual = fieldClass?.value;
  if (valAtual && CONFIG[valAtual]) {
    renderBadge(valAtual, fieldJustif?.value || '');
  }

  /* ── Clicar em classificar ── */
  btnClassificar.addEventListener('click', async () => {
    const titulo   = document.getElementById('field-title')?.value?.trim() || '';
    const conteudo = document.getElementById('editor-content')?.innerText?.trim() || '';

    if (!titulo && !conteudo) {
      showToast('Preencha o título ou conteúdo antes de classificar.', 'error');
      return;
    }

    const serverUrl = getServerUrl();
    setLoadingState(true);

    try {
      const resp = await fetch(serverUrl + '/classificar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titulo, conteudo }),
        signal: AbortSignal.timeout(60000)
      });

      const data = await resp.json();

      if (!resp.ok || data.erro) throw new Error(data.erro || 'Erro desconhecido');

      renderBadge(data.classificacao, data.justificativa);
      if (fieldClass)  fieldClass.value  = data.classificacao;
      if (fieldJustif) fieldJustif.value = data.justificativa || '';

      showToast(`Classificado como: ${CONFIG[data.classificacao]?.label || data.classificacao}`, 'success');

    } catch (err) {
      let msg = err.message;
      if (err.name === 'TimeoutError' || err.name === 'AbortError') {
        msg = 'Tempo esgotado. Verifique o servidor.';
      } else if (msg.includes('fetch') || msg.includes('Failed')) {
        msg = 'Servidor offline. Inicie com: cd servidor && npm start';
      }
      showToast(msg, 'error');
    } finally {
      setLoadingState(false);
    }
  });

  /* ── Helpers ── */
  function getServerUrl() {
    // Reutiliza a URL do gerador se disponível
    const stored = localStorage.getItem('radar_gen_server_url');
    const fromField = elServerUrl?.value?.trim();
    return (fromField || stored || 'http://localhost:3131').replace(/\/$/, '');
  }

  function renderBadge(classe, justificativa) {
    const cfg = CONFIG[classe] || CONFIG.comum;
    if (elResultado) {
      elResultado.className = 'class-result-badge';
      elResultado.style.color      = cfg.cor;
      elResultado.style.background = cfg.cor + '14';
      elResultado.style.borderColor = cfg.cor + '40';
      elResultado.innerHTML = `<i class="fas ${cfg.icone}"></i> ${cfg.label}`;
    }
    if (elJustificativa) {
      elJustificativa.textContent = justificativa || '';
      elJustificativa.style.display = justificativa ? 'block' : 'none';
    }
  }

  function setLoadingState(loading) {
    btnClassificar.disabled = loading;
    btnClassificar.innerHTML = loading
      ? '<i class="fas fa-circle-notch fa-spin"></i> Classificando...'
      : '<i class="fas fa-robot"></i> Classificar com IA';
  }

  /* ── Expor para o admin.js injetar classificação ao carregar artigo ── */
  window.classificadorSetValue = function(classe, justif) {
    if (!classe) return;
    if (fieldClass)  fieldClass.value  = classe;
    if (fieldJustif) fieldJustif.value = justif || '';
    if (CONFIG[classe]) renderBadge(classe, justif || '');
  };

})();
