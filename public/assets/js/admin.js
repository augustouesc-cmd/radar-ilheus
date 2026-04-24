'use strict';

const form   = document.getElementById('form-noticia');
const btn    = document.getElementById('btn-publicar');
const status = document.getElementById('status-msg');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const titulo   = document.getElementById('titulo').value.trim();
  const categoria = document.getElementById('categoria').value;
  const conteudo = document.getElementById('conteudo').value.trim();

  if (!titulo || !categoria || !conteudo) {
    showStatus('Preencha todos os campos.', false);
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Publicando...';

  try {
    const res = await fetch('/api/noticias', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ titulo, categoria, conteudo })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Erro ${res.status}`);
    }

    form.reset();
    showStatus('Publicado com sucesso! A notícia já aparece no site.', true);
  } catch (err) {
    showStatus(`Erro ao publicar: ${err.message}`, false);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-paper-plane"></i> Publicar';
  }
});

function showStatus(msg, ok) {
  status.textContent = msg;
  status.className   = ok ? 'ok' : 'err';
  status.style.display = 'block';
  setTimeout(() => { status.style.display = 'none'; }, 6000);
}
