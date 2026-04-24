/* ============================================================
   RADAR ILHÉUS — Admin JavaScript
   ============================================================ */

'use strict';

const CATEGORIES  = ['Política','Economia','Esportes','Cultura','Saúde','Educação','Turismo','Cidades','Empregos','Tecnologia'];
const CLASS_LABELS = { urgente:'Urgente', alerta:'Alerta', politica:'Política', positiva:'Positiva', comum:'Comum' };

/* ============================================================
   API — substitui localStorage
   ============================================================ */
const API_BASE = '';   // mesmo origin: http://localhost:3131
let _cache = [];

const Store = {
  async init() {
    try {
      const res = await fetch(`${API_BASE}/articles`);
      _cache = await res.json();
    } catch { _cache = []; }
  },
  getAll()    { return _cache; },
  getById(id) { return _cache.find(a => a.id === id) || null; },
  async save(article) {
    const idx = _cache.findIndex(a => a.id === article.id);
    const url    = idx >= 0 ? `${API_BASE}/articles/${article.id}` : `${API_BASE}/articles`;
    const method = idx >= 0 ? 'PUT' : 'POST';
    const res  = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(article)
    });
    if (!res.ok) throw new Error('Erro ao salvar notícia.');
    const saved = await res.json();
    if (idx >= 0) _cache[idx] = saved;
    else _cache.unshift(saved);
    return saved;
  },
  async delete(id) {
    await fetch(`${API_BASE}/articles/${id}`, { method: 'DELETE' });
    _cache = _cache.filter(a => a.id !== id);
  },
  stats() {
    return {
      total:     _cache.length,
      published: _cache.filter(a => a.status === 'published').length,
      draft:     _cache.filter(a => a.status === 'draft').length,
      views:     _cache.reduce((sum, a) => sum + (a.views || 0), 0)
    };
  }
};

/* ============================================================
   TOASTS
   ============================================================ */
function toast(msg, type = 'success') {
  const icons = { success: 'fa-check-circle', error: 'fa-times-circle', info: 'fa-info-circle' };
  const container = document.querySelector('.toast-container') || (() => {
    const c = document.createElement('div');
    c.className = 'toast-container';
    document.body.appendChild(c);
    return c;
  })();
  const el = document.createElement('div');
  el.className = `toast toast--${type}`;
  el.innerHTML = `<i class="fas ${icons[type]}"></i><span>${msg}</span>`;
  container.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateX(110%)'; el.style.transition = '.3s'; setTimeout(() => el.remove(), 320); }, 3200);
}
window.showToast = function(msg, type) { toast(msg, type); };

/* ============================================================
   MODAL DE CONFIRMAÇÃO
   ============================================================ */
function confirmModal(title, msg, onConfirm) {
  let overlay = document.getElementById('modal-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal">
        <h3 id="modal-title"></h3>
        <p id="modal-msg"></p>
        <div class="modal-actions">
          <button class="btn btn-secondary btn-sm" id="modal-cancel">Cancelar</button>
          <button class="btn btn-primary btn-sm" id="modal-confirm">Confirmar</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.classList.remove('open'); });
    document.getElementById('modal-cancel').addEventListener('click', () => overlay.classList.remove('open'));
  }
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-msg').textContent = msg;
  overlay.classList.add('open');
  const confirmBtn = document.getElementById('modal-confirm');
  const newBtn = confirmBtn.cloneNode(true);
  confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);
  newBtn.addEventListener('click', () => { overlay.classList.remove('open'); onConfirm(); });
}

/* ============================================================
   FORMATAÇÃO DE DATA
   ============================================================ */
function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function timeAgo(iso) {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'agora mesmo';
  if (m < 60) return `há ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h}h`;
  const days = Math.floor(h / 24);
  return `há ${days} dia${days > 1 ? 's' : ''}`;
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function slugify(str) {
  return str.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
}

function countWords(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function readingTime(words) {
  const mins = Math.ceil(words / 200);
  return `${mins} min`;
}

/* ============================================================
   SIDEBAR MOBILE
   ============================================================ */
function initSidebarToggle() {
  const toggle = document.querySelector('.sidebar-toggle');
  const sidebar = document.querySelector('.sidebar');
  if (!toggle || !sidebar) return;
  toggle.addEventListener('click', () => sidebar.classList.toggle('open'));
  document.addEventListener('click', e => {
    if (!sidebar.contains(e.target) && !toggle.contains(e.target)) {
      sidebar.classList.remove('open');
    }
  });
}

/* ============================================================
   PÁGINA: LISTA DE NOTÍCIAS (index.html)
   ============================================================ */
function initDashboard() {
  const statsRow = document.getElementById('stats-row');
  const tableBody = document.getElementById('articles-tbody');
  if (!statsRow && !tableBody) return;

  // Filtros — declarados antes de renderStats/renderTable para evitar TDZ
  const searchInput = document.getElementById('filter-search');
  const categoryFilter = document.getElementById('filter-category');
  const statusFilter = document.getElementById('filter-status');

  renderStats();
  renderTable();

  [searchInput, categoryFilter, statusFilter].forEach(el => {
    if (el) el.addEventListener('input', renderTable);
  });

  function renderStats() {
    if (!statsRow) return;
    const s = Store.stats();
    statsRow.innerHTML = `
      <div class="stat-card stat-card--blue">
        <div class="stat-card__icon"><i class="fas fa-newspaper"></i></div>
        <div><div class="stat-card__value">${s.total}</div><div class="stat-card__label">Total de notícias</div></div>
      </div>
      <div class="stat-card stat-card--green">
        <div class="stat-card__icon"><i class="fas fa-check-circle"></i></div>
        <div><div class="stat-card__value">${s.published}</div><div class="stat-card__label">Publicadas</div></div>
      </div>
      <div class="stat-card stat-card--yellow">
        <div class="stat-card__icon"><i class="fas fa-edit"></i></div>
        <div><div class="stat-card__value">${s.draft}</div><div class="stat-card__label">Rascunhos</div></div>
      </div>
      <div class="stat-card stat-card--red">
        <div class="stat-card__icon"><i class="fas fa-eye"></i></div>
        <div><div class="stat-card__value">${s.views.toLocaleString('pt-BR')}</div><div class="stat-card__label">Visualizações</div></div>
      </div>`;
  }

  function getFiltered() {
    let articles = Store.getAll();
    const q = searchInput?.value.toLowerCase().trim() || '';
    const cat = categoryFilter?.value || '';
    const status = statusFilter?.value || '';
    if (q) articles = articles.filter(a => a.title?.toLowerCase().includes(q) || a.category?.toLowerCase().includes(q));
    if (cat) articles = articles.filter(a => a.category === cat);
    if (status) articles = articles.filter(a => a.status === status);
    return articles;
  }

  function renderTable() {
    if (!tableBody) return;
    const articles = getFiltered();
    if (!articles.length) {
      tableBody.innerHTML = `
        <tr><td colspan="7">
          <div class="empty-state">
            <i class="fas fa-newspaper"></i>
            <h3>Nenhuma notícia encontrada</h3>
            <p>Crie sua primeira notícia clicando em "Nova Notícia"</p>
          </div>
        </td></tr>`;
      return;
    }
    tableBody.innerHTML = articles.map(a => `
      <tr>
        <td class="td-img">
          ${a.image
            ? `<img src="${a.image}" alt="" onerror="this.parentNode.innerHTML='<div class=\\'no-img\\'><i class=\\'fas fa-image\\'></i></div>'">`
            : `<div class="no-img"><i class="fas fa-image"></i></div>`}
        </td>
        <td class="td-title">
          <strong title="${a.title}">${a.title || 'Sem título'}</strong>
          <small>${a.subtitle ? a.subtitle.slice(0, 60) + '...' : '—'}</small>
          ${a.classification ? `<span class="badge badge-class badge-class--${a.classification}">${CLASS_LABELS[a.classification] || a.classification}</span>` : ''}
        </td>
        <td><span class="badge badge-category">${a.category || '—'}</span></td>
        <td><span class="badge badge-${a.status === 'published' ? 'published' : 'draft'}">${a.status === 'published' ? 'Publicada' : 'Rascunho'}</span></td>
        <td style="font-size:.78rem;color:var(--muted)">${timeAgo(a.updatedAt || a.createdAt)}</td>
        <td style="font-size:.78rem;color:var(--muted)">${(a.views || 0).toLocaleString('pt-BR')}</td>
        <td class="td-actions">
          <a href="editor.html?id=${a.id}" class="btn btn-secondary btn-sm" title="Editar">
            <i class="fas fa-pen"></i> Editar
          </a>
          ${a.status === 'draft'
            ? `<button class="btn btn-success btn-sm" onclick="publishArticle('${a.id}')" title="Publicar">
                <i class="fas fa-globe"></i>
               </button>`
            : `<button class="btn btn-secondary btn-sm" onclick="unpublishArticle('${a.id}')" title="Despublicar" style="color:var(--muted)">
                <i class="fas fa-eye-slash"></i>
               </button>`}
          <button class="btn btn-danger btn-sm" onclick="deleteArticle('${a.id}')" title="Excluir">
            <i class="fas fa-trash"></i>
          </button>
        </td>
      </tr>`).join('');
  }

  window.publishArticle = async function(id) {
    const a = Store.getById(id);
    if (!a) return;
    a.status = 'published';
    a.publishedAt = new Date().toISOString();
    a.updatedAt = new Date().toISOString();
    try { await Store.save(a); } catch { toast('Erro ao publicar.', 'error'); return; }
    renderStats(); renderTable();
    toast(`"${a.title}" publicada com sucesso!`, 'success');
  };

  window.unpublishArticle = async function(id) {
    const a = Store.getById(id);
    if (!a) return;
    a.status = 'draft';
    a.updatedAt = new Date().toISOString();
    try { await Store.save(a); } catch { toast('Erro ao despublicar.', 'error'); return; }
    renderStats(); renderTable();
    toast(`"${a.title}" movida para rascunhos.`, 'info');
  };

  window.deleteArticle = function(id) {
    const a = Store.getById(id);
    if (!a) return;
    confirmModal('Excluir notícia', `Tem certeza que deseja excluir "${a.title}"? Esta ação não pode ser desfeita.`, async () => {
      try { await Store.delete(id); } catch { toast('Erro ao excluir.', 'error'); return; }
      renderStats(); renderTable();
      toast('Notícia excluída.', 'error');
    });
  };
}

/* ============================================================
   PÁGINA: EDITOR (editor.html)
   ============================================================ */
function initEditor() {
  const form = document.getElementById('editor-form');
  if (!form) return;

  const params = new URLSearchParams(location.search);
  const editId = params.get('id');
  let currentArticle = editId ? Store.getById(editId) : null;
  let autoSaveTimer = null;
  let isPublished = currentArticle?.status === 'published';

  // Elementos
  const titleInput    = document.getElementById('field-title');
  const subtitleInput = document.getElementById('field-subtitle');
  const categoryInput = document.getElementById('field-category');
  const authorInput   = document.getElementById('field-author');
  const editorContent = document.getElementById('editor-content');
  const imgPreview    = document.getElementById('img-preview');
  const imgClear      = document.getElementById('img-clear');
  const imgUpload     = document.getElementById('img-upload-input');
  const imgUrlInput   = document.getElementById('img-url-input');
  const imgUrlApply   = document.getElementById('img-url-apply');
  const statusDisplay = document.getElementById('status-display');
  const wordCount     = document.getElementById('word-count');
  const charCount     = document.getElementById('char-count');
  const readTimeEl    = document.getElementById('read-time');
  const autosaveEl    = document.getElementById('autosave-status');
  const metaCreated   = document.getElementById('meta-created');
  const metaUpdated   = document.getElementById('meta-updated');
  const pageTitle     = document.getElementById('page-title');

  let imageData = currentArticle?.image || '';

  // Preencher categoria options
  const catSelect = categoryInput;
  catSelect.innerHTML = '<option value="">Selecione...</option>' +
    CATEGORIES.map(c => `<option value="${c}" ${currentArticle?.category === c ? 'selected' : ''}>${c}</option>`).join('');

  // Carregar artigo se editando
  if (currentArticle) {
    if (pageTitle) pageTitle.textContent = 'Editar Notícia';
    document.title = 'Editar Notícia — Radar Ilhéus Admin';
    titleInput.value    = currentArticle.title || '';
    subtitleInput.value = currentArticle.subtitle || '';
    authorInput.value   = currentArticle.author || '';
    editorContent.innerHTML = currentArticle.content || '';
    setImage(currentArticle.image || '');
    updateStatus();
    if (metaCreated) metaCreated.textContent = formatDate(currentArticle.createdAt);
    if (metaUpdated) metaUpdated.textContent = formatDate(currentArticle.updatedAt);
    // Restaurar classificação salva
    if (currentArticle.classification) {
      const fc = document.getElementById('field-classification');
      const fj = document.getElementById('field-classification-justification');
      if (fc) fc.value = currentArticle.classification;
      if (fj) fj.value = currentArticle.classificationJustification || '';
      // classificador.js lê esses campos na inicialização
    }
  } else {
    if (pageTitle) pageTitle.textContent = 'Nova Notícia';
    document.title = 'Nova Notícia — Radar Ilhéus Admin';
    if (metaCreated) metaCreated.textContent = '—';
    if (metaUpdated) metaUpdated.textContent = '—';
  }

  // Atualizar contadores
  function updateCounts() {
    const text = editorContent.innerText || '';
    const words = countWords(text);
    const chars = text.length;
    if (wordCount) wordCount.textContent = `${words} palavras`;
    if (charCount) charCount.textContent = `${chars} caracteres`;
    if (readTimeEl) readTimeEl.textContent = readingTime(words) + ' de leitura';
  }

  function updateStatus() {
    isPublished = currentArticle?.status === 'published';
    if (statusDisplay) {
      statusDisplay.className = `status-display ${isPublished ? 'published' : ''}`;
      statusDisplay.innerHTML = isPublished
        ? `<i class="fas fa-globe" style="color:#16a34a"></i> Publicada`
        : `<i class="fas fa-edit" style="color:var(--muted)"></i> Rascunho`;
    }
  }

  // Imagem
  function setImage(src) {
    imageData = src;
    if (src) {
      imgPreview.src = src;
      imgPreview.classList.add('show');
      imgClear.classList.add('show');
      document.querySelector('.img-upload-area').classList.add('has-image');
    } else {
      imgPreview.src = '';
      imgPreview.classList.remove('show');
      imgClear.classList.remove('show');
      document.querySelector('.img-upload-area').classList.remove('has-image');
    }
  }

  document.querySelector('.img-upload-area').addEventListener('click', e => {
    if (e.target === imgClear || imgClear.contains(e.target)) return;
    if (!imageData) imgUpload.click();
  });

  imgClear.addEventListener('click', e => { e.stopPropagation(); setImage(''); });

  imgUpload.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast('Imagem muito grande. Use no máximo 2MB ou cole uma URL.', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = ev => setImage(ev.target.result);
    reader.readAsDataURL(file);
  });

  imgUrlApply.addEventListener('click', () => {
    const url = imgUrlInput.value.trim();
    if (!url) return;
    setImage(url);
    imgUrlInput.value = '';
    toast('Imagem aplicada.', 'success');
  });
  imgUrlInput.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); imgUrlApply.click(); } });

  // Rich text toolbar
  const toolbarBtns = document.querySelectorAll('.toolbar-btn[data-cmd]');
  toolbarBtns.forEach(btn => {
    btn.addEventListener('mousedown', e => {
      e.preventDefault();
      const cmd = btn.dataset.cmd;
      const val = btn.dataset.val || null;
      if (cmd === 'createLink') {
        const url = prompt('URL do link:');
        if (url) document.execCommand(cmd, false, url);
      } else {
        document.execCommand(cmd, false, val);
      }
      editorContent.focus();
      updateCounts();
    });
  });

  // Atualizar estado dos botões toolbar ao selecionar
  editorContent.addEventListener('keyup', updateCounts);
  editorContent.addEventListener('mouseup', () => {
    toolbarBtns.forEach(btn => {
      try {
        btn.classList.toggle('active', document.queryCommandState(btn.dataset.cmd));
      } catch {}
    });
  });
  editorContent.addEventListener('input', () => {
    updateCounts();
    scheduleAutosave();
  });

  // Tabs: Editor / Prévia
  const tabs = document.querySelectorAll('.editor-tab');
  const editorPanel = document.getElementById('editor-panel');
  const previewPanel = document.getElementById('preview-panel');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const mode = tab.dataset.tab;
      if (mode === 'preview') {
        renderPreview();
        editorPanel.style.display = 'none';
        previewPanel.style.display = 'block';
      } else {
        editorPanel.style.display = 'block';
        previewPanel.style.display = 'none';
      }
    });
  });

  function renderPreview() {
    if (!previewPanel) return;
    const title    = titleInput.value.trim() || 'Sem título';
    const subtitle = subtitleInput.value.trim();
    const content  = editorContent.innerHTML;
    const cat      = categoryInput.value;
    previewPanel.innerHTML = `
      <div style="max-width:680px;margin:0 auto;padding:16px 0">
        ${cat ? `<span style="display:inline-block;background:var(--red);color:#fff;font-size:.65rem;font-weight:800;letter-spacing:.1em;text-transform:uppercase;padding:3px 10px;border-radius:3px;margin-bottom:14px">${cat}</span>` : ''}
        <h1 style="font-family:'Montserrat',sans-serif;font-size:1.5rem;font-weight:900;color:var(--blue);line-height:1.2;margin-bottom:10px">${title}</h1>
        ${subtitle ? `<p style="font-size:1rem;color:#666;border-left:3px solid var(--yellow);padding-left:14px;margin-bottom:16px">${subtitle}</p>` : ''}
        ${imageData ? `<img src="${imageData}" alt="" style="width:100%;max-height:360px;object-fit:cover;border-radius:8px;margin-bottom:16px">` : ''}
        <div style="font-size:1rem;line-height:1.8;color:#333">${content || '<p style="color:#aaa">Conteúdo aparecerá aqui...</p>'}</div>
      </div>`;
  }

  // Auto-save
  function scheduleAutosave() {
    clearTimeout(autoSaveTimer);
    if (autosaveEl) { autosaveEl.textContent = 'Salvando...'; autosaveEl.className = 'autosave-indicator saving'; }
    autoSaveTimer = setTimeout(() => {
      if (currentArticle) {
        doSave('draft', true);
      } else {
        if (autosaveEl) { autosaveEl.textContent = ''; }
      }
    }, 2500);
  }

  // Coletar dados do formulário
  function collectData(status) {
    return {
      id: currentArticle?.id || generateId(),
      title:     titleInput.value.trim(),
      subtitle:  subtitleInput.value.trim(),
      content:   editorContent.innerHTML,
      category:  categoryInput.value,
      author:    authorInput.value.trim() || 'Redação Radar Ilhéus',
      image:     imageData,
      status:    status,
      views:     currentArticle?.views || 0,
      createdAt: currentArticle?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      publishedAt: status === 'published' ? (currentArticle?.publishedAt || new Date().toISOString()) : (currentArticle?.publishedAt || null),
      time:      'agora mesmo',
      date:      new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }),
      excerpt:   (editorContent.innerText || '').slice(0, 180).trim() + '...',
      readTime:  readingTime(countWords(editorContent.innerText || '')),
      tags:      [],
      classification:             document.getElementById('field-classification')?.value             || currentArticle?.classification             || '',
      classificationJustification: document.getElementById('field-classification-justification')?.value || currentArticle?.classificationJustification || ''
    };
  }

  function validate() {
    const t = titleInput.value.trim();
    if (!t) { toast('O título é obrigatório.', 'error'); titleInput.focus(); return false; }
    if (!categoryInput.value) { toast('Selecione uma categoria.', 'error'); categoryInput.focus(); return false; }
    if (!editorContent.innerText.trim()) { toast('O conteúdo não pode estar vazio.', 'error'); editorContent.focus(); return false; }
    return true;
  }

  async function doSave(status, silent = false) {
    const data = collectData(status);
    let saved;
    try {
      saved = await Store.save(data);
    } catch {
      toast('Erro ao salvar. Verifique se o servidor está rodando.', 'error');
      return null;
    }
    currentArticle = saved;
    isPublished = status === 'published';
    updateStatus();
    if (metaUpdated) metaUpdated.textContent = formatDate(saved.updatedAt);
    if (metaCreated && !params.get('id')) metaCreated.textContent = formatDate(saved.createdAt);
    if (!params.get('id')) {
      history.replaceState(null, '', `editor.html?id=${saved.id}`);
    }
    if (autosaveEl) { autosaveEl.textContent = 'Salvo'; autosaveEl.className = 'autosave-indicator saved'; setTimeout(() => { autosaveEl.textContent = ''; }, 2000); }
    if (!silent) {
      if (status === 'published') toast('Notícia publicada com sucesso!', 'success');
      else toast('Rascunho salvo.', 'info');
    }
    return saved;
  }

  // Botões de ação
  document.getElementById('btn-save-draft')?.addEventListener('click', async () => {
    if (!titleInput.value.trim()) { toast('Adicione um título antes de salvar.', 'error'); titleInput.focus(); return; }
    await doSave('draft');
  });

  document.getElementById('btn-publish')?.addEventListener('click', async () => {
    if (!validate()) return;
    if (isPublished) {
      await doSave('published');
    } else {
      confirmModal('Publicar notícia', `Deseja publicar "${titleInput.value.trim()}"? Ela ficará visível no portal imediatamente.`, async () => {
        await doSave('published');
      });
    }
  });

  document.getElementById('btn-unpublish')?.addEventListener('click', () => {
    if (!currentArticle) return;
    confirmModal('Despublicar', 'Mover notícia de volta para rascunho?', async () => {
      await doSave('draft');
      toast('Notícia movida para rascunhos.', 'info');
    });
  });

  document.getElementById('btn-preview-portal')?.addEventListener('click', () => {
    if (!currentArticle?.id) { toast('Salve a notícia primeiro.', 'info'); return; }
    window.open(`../noticia.html?id=${currentArticle.id}`, '_blank');
  });

  // Atalhos de teclado
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      if (!titleInput.value.trim()) return;
      doSave(isPublished ? 'published' : 'draft');
    }
  });

  updateCounts();
  titleInput.addEventListener('input', scheduleAutosave);
  subtitleInput.addEventListener('input', scheduleAutosave);
  categoryInput.addEventListener('change', scheduleAutosave);
}

/* ============================================================
   INICIALIZAÇÃO
   ============================================================ */
document.addEventListener('DOMContentLoaded', async () => {
  initSidebarToggle();
  await Store.init();
  initDashboard();
  initEditor();
});
