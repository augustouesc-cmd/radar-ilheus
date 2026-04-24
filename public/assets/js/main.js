/* ============================================================
   RADAR ILHÉUS — JavaScript Principal
   ============================================================ */

'use strict';

/* --- Dados de Notícias ------------------------------------ */
const API_BASE = '';   // mesmo origin (servidor Express em localhost:3131)
let ARTICLES   = [];   // preenchido via API no DOMContentLoaded

async function loadArticles() {
  try {
    const res = await fetch('/api/noticias');
    if (!res.ok) throw new Error('offline');
    const noticias = await res.json();
    if (noticias.length > 0) {
      return noticias.map((n, i) => ({
        id:           n.id,
        title:        n.titulo,
        excerpt:      n.conteudo,
        category:     n.categoria,
        categorySlug: (n.categoria || '').toLowerCase()
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
          .replace(/\s+/g, '-'),
        author:       n.autor     || 'Redação',
        time:         'recentemente',
        date:         n.data,
        readTime:     '3 min',
        views:        n.visualizacoes || 0,
        image:        n.imagem    || `https://picsum.photos/seed/${n.id}/800/450`,
        imageThumb:   n.imagem    || `https://picsum.photos/seed/${n.id}/400/250`,
        tags:         n.tags      || [],
        featured:     i === 0,
        breaking:     false
      }));
    }
  } catch { /* servidor offline — usa padrão */ }
  return DEFAULT_ARTICLES;
}

const DEFAULT_ARTICLES = [
  {
    id: 1,
    title: "Festival do Chocolate de Ilhéus bate recorde de visitantes na 28ª edição",
    excerpt: "Evento que celebra a produção cacaueira da região sul da Bahia registrou mais de 180 mil pessoas em cinco dias, superando o recorde anterior de 2023.",
    category: "Cultura",
    categorySlug: "cultura",
    author: "Maria das Graças",
    time: "há 12 minutos",
    date: "23 abr. 2026",
    views: 14820,
    readTime: "4 min",
    image: "https://picsum.photos/seed/choc1/800/450",
    imageThumb: "https://picsum.photos/seed/choc1/400/250",
    tags: ["Festival", "Chocolate", "Cacau", "Turismo"],
    featured: true,
    breaking: false
  },
  {
    id: 2,
    title: "Prefeitura anuncia R$ 42 milhões em obras de infraestrutura para 2026",
    excerpt: "Pacote contempla recuperação de vias, saneamento básico em três bairros e construção de nova UPA no bairro São Caetano.",
    category: "Política",
    categorySlug: "politica",
    author: "Carlos Eduardo",
    time: "há 35 minutos",
    date: "23 abr. 2026",
    views: 9340,
    readTime: "3 min",
    image: "https://picsum.photos/seed/obras2/800/450",
    imageThumb: "https://picsum.photos/seed/obras2/400/250",
    tags: ["Prefeitura", "Obras", "Infraestrutura", "Investimento"],
    featured: false,
    breaking: true
  },
  {
    id: 3,
    title: "Ilhéus Atlético Clube vence o Bahia de Feira e avança às semifinais",
    excerpt: "Gol nos acréscimos do segundo tempo garantiu a vitória por 2 a 1 diante de 8 mil torcedores no Estádio Mário Pessoa.",
    category: "Esportes",
    categorySlug: "esportes",
    author: "André Vilas Boas",
    time: "há 1 hora",
    date: "23 abr. 2026",
    views: 18650,
    readTime: "2 min",
    image: "https://picsum.photos/seed/futebol3/800/450",
    imageThumb: "https://picsum.photos/seed/futebol3/400/250",
    tags: ["Futebol", "Campeonato Baiano", "Ilhéus AC"],
    featured: false,
    breaking: false
  },
  {
    id: 4,
    title: "Nova UBS do bairro Iguape começa a funcionar na próxima segunda-feira",
    excerpt: "Unidade terá atendimento em 12 especialidades e capacidade para 250 consultas diárias, beneficiando mais de 20 mil moradores da região.",
    category: "Saúde",
    categorySlug: "saude",
    author: "Paula Fernandes",
    time: "há 2 horas",
    date: "23 abr. 2026",
    views: 7210,
    readTime: "3 min",
    image: "https://picsum.photos/seed/saude4/800/450",
    imageThumb: "https://picsum.photos/seed/saude4/400/250",
    tags: ["Saúde", "UBS", "Iguape", "Prefeitura"],
    featured: false,
    breaking: false
  },
  {
    id: 5,
    title: "Escola estadual de Ilhéus conquista 1º lugar em olimpíada nacional de matemática",
    excerpt: "Alunos do 3º ano do Colégio Estadual José Bastos representarão a Bahia na etapa internacional realizada em São Paulo em julho.",
    category: "Educação",
    categorySlug: "educacao",
    author: "Fernanda Lima",
    time: "há 3 horas",
    date: "23 abr. 2026",
    views: 11430,
    readTime: "3 min",
    image: "https://picsum.photos/seed/escola5/800/450",
    imageThumb: "https://picsum.photos/seed/escola5/400/250",
    tags: ["Educação", "Matemática", "Olimpíada", "Premiação"],
    featured: false,
    breaking: false
  },
  {
    id: 6,
    title: "Porto de Ilhéus registra crescimento de 22% no volume de exportações no 1º trimestre",
    excerpt: "Cacau, madeira certificada e pescados lideraram as exportações. Terminal portuário deve receber R$ 80 milhões em modernização até 2027.",
    category: "Economia",
    categorySlug: "economia",
    author: "Roberto Alves",
    time: "há 4 horas",
    date: "23 abr. 2026",
    views: 8890,
    readTime: "4 min",
    image: "https://picsum.photos/seed/porto6/800/450",
    imageThumb: "https://picsum.photos/seed/porto6/400/250",
    tags: ["Porto", "Exportação", "Economia", "Investimento"],
    featured: false,
    breaking: false
  },
  {
    id: 7,
    title: "Pontal do Ilhéus entra na lista dos 10 destinos mais procurados da Bahia no verão",
    excerpt: "Pesquisa do Ministério do Turismo aponta crescimento de 34% na procura pela região em plataformas de hospedagem nos últimos seis meses.",
    category: "Turismo",
    categorySlug: "turismo",
    author: "Ana Beatriz Costa",
    time: "há 5 horas",
    date: "23 abr. 2026",
    views: 13200,
    readTime: "3 min",
    image: "https://picsum.photos/seed/praia7/800/450",
    imageThumb: "https://picsum.photos/seed/praia7/400/250",
    tags: ["Turismo", "Praia", "Pontal", "Verão"],
    featured: false,
    breaking: false
  },
  {
    id: 8,
    title: "Concurso público da Câmara Municipal de Ilhéus tem inscrições abertas até 30 de abril",
    excerpt: "São 48 vagas para cargos de nível médio e superior com salários entre R$ 2.800 e R$ 6.500. Provas estão previstas para 15 de junho.",
    category: "Empregos",
    categorySlug: "empregos",
    author: "Lucas Magalhães",
    time: "há 6 horas",
    date: "23 abr. 2026",
    views: 22100,
    readTime: "2 min",
    image: "https://picsum.photos/seed/concurso8/800/450",
    imageThumb: "https://picsum.photos/seed/concurso8/400/250",
    tags: ["Concurso", "Empregos", "Câmara", "Vagas"],
    featured: false,
    breaking: false
  },
  {
    id: 9,
    title: "Chuvas intensas causam alagamentos em bairros da zona norte de Ilhéus",
    excerpt: "Defesa Civil atendeu 14 ocorrências na madrugada desta quinta-feira. Rua Itabuna foi interditada após deslizamento de terra.",
    category: "Cidades",
    categorySlug: "cidades",
    author: "João Vitor Santos",
    time: "há 7 horas",
    date: "23 abr. 2026",
    views: 19870,
    readTime: "3 min",
    image: "https://picsum.photos/seed/chuva9/800/450",
    imageThumb: "https://picsum.photos/seed/chuva9/400/250",
    tags: ["Chuvas", "Alagamento", "Defesa Civil", "Zona Norte"],
    featured: false,
    breaking: false
  },
  {
    id: 10,
    title: "Obra do Theatro Municipal entra em fase final após dois anos de restauração",
    excerpt: "Patrimônio histórico de Ilhéus terá reabertura comemorativa em setembro com espetáculo da Orquestra Sinfônica da Bahia.",
    category: "Cultura",
    categorySlug: "cultura",
    author: "Beatriz Nunes",
    time: "há 9 horas",
    date: "23 abr. 2026",
    views: 6540,
    readTime: "4 min",
    image: "https://picsum.photos/seed/theatro10/800/450",
    imageThumb: "https://picsum.photos/seed/theatro10/400/250",
    tags: ["Teatro", "Cultura", "Patrimônio", "Restauração"],
    featured: false,
    breaking: false
  }
];

const BREAKING_NEWS = [
  "URGENTE: Chuvas fortes previstas para a região de Ilhéus nas próximas 48 horas — Defesa Civil emite alerta",
  "Festival do Chocolate bate recorde histórico de visitantes com 180 mil pessoas em 5 dias",
  "Ilhéus AC avança às semifinais do Campeonato Baiano após vitória nos acréscimos",
  "Inscrições para concurso da Câmara Municipal encerram em 30 de abril — 48 vagas disponíveis",
  "Porto de Ilhéus registra crescimento de 22% nas exportações no primeiro trimestre de 2026"
];

const CATEGORIES = [
  { name: "Início", slug: "index.html", icon: "fa-home" },
  { name: "Política", slug: "categoria.html?c=politica", icon: "fa-landmark" },
  { name: "Economia", slug: "categoria.html?c=economia", icon: "fa-chart-line" },
  { name: "Esportes", slug: "categoria.html?c=esportes", icon: "fa-futbol" },
  { name: "Cultura", slug: "categoria.html?c=cultura", icon: "fa-theater-masks" },
  { name: "Saúde", slug: "categoria.html?c=saude", icon: "fa-heartbeat" },
  { name: "Educação", slug: "categoria.html?c=educacao", icon: "fa-graduation-cap" },
  { name: "Turismo", slug: "categoria.html?c=turismo", icon: "fa-umbrella-beach" },
  { name: "Cidades", slug: "categoria.html?c=cidades", icon: "fa-city" },
  { name: "Empregos", slug: "categoria.html?c=empregos", icon: "fa-briefcase" }
];

/* ============================================================
   HELPERS
   ============================================================ */
function $(sel, ctx = document) { return ctx.querySelector(sel); }
function $$(sel, ctx = document) { return Array.from(ctx.querySelectorAll(sel)); }

function formatViews(n) {
  if (n >= 1000) return (n / 1000).toFixed(1).replace('.', ',') + 'k';
  return n.toString();
}

function currentDateTime() {
  const now = new Date();
  const days = ['domingo','segunda-feira','terça-feira','quarta-feira','quinta-feira','sexta-feira','sábado'];
  const months = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
  const day = days[now.getDay()];
  const d = String(now.getDate()).padStart(2, '0');
  const m = months[now.getMonth()];
  const y = now.getFullYear();
  const h = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  return `${day}, ${d} de ${m}. de ${y} — ${h}:${min}`;
}

/* ============================================================
   NAVEGAÇÃO
   ============================================================ */
function buildNav() {
  const lists = $$('.nav-list');
  const overlayList = $('.nav-mobile-list');
  const items = CATEGORIES.map((c, i) => {
    const isActive = c.slug === 'index.html' && (location.pathname.endsWith('/') || location.pathname.endsWith('index.html'));
    return `<li><a href="${c.slug}" class="${isActive ? 'active' : ''}">${c.name}</a></li>`;
  }).join('');
  lists.forEach(l => l.innerHTML = items);
  if (overlayList) overlayList.innerHTML = CATEGORIES.map(c =>
    `<a href="${c.slug}">${c.name}</a>`
  ).join('');
}

/* ============================================================
   BREAKING NEWS
   ============================================================ */
function buildBreakingNews() {
  const track = $('.breaking-bar__items');
  if (!track) return;
  const doubled = [...BREAKING_NEWS, ...BREAKING_NEWS];
  track.innerHTML = doubled.map(n => `<a href="#">${n}</a>`).join('');
}

/* ============================================================
   HERO
   ============================================================ */
function buildHero() {
  const heroMain = $('.hero-main');
  const heroSide = $('.hero-side');
  if (!heroMain || !heroSide) return;

  const main = ARTICLES[0];
  heroMain.innerHTML = `
    <a href="noticia.html?id=${main.id}">
      <img src="${main.image}" alt="${main.title}" loading="eager">
      <div class="hero-main__overlay">
        <span class="hero-main__category">${main.category}</span>
        <h2 class="hero-main__title">${main.title}</h2>
        <p class="hero-main__excerpt">${main.excerpt}</p>
        <div class="hero-main__meta">
          <i class="fas fa-user-circle"></i> ${main.author}
          &nbsp;·&nbsp;
          <i class="fas fa-clock"></i> ${main.time}
          &nbsp;·&nbsp;
          <i class="fas fa-book-open"></i> ${main.readTime} de leitura
        </div>
      </div>
    </a>`;

  const sideArticles = ARTICLES.slice(1, 3);
  heroSide.innerHTML = sideArticles.map(a => `
    <article class="card">
      <div class="card__img" style="height:160px">
        <img src="${a.imageThumb}" alt="${a.title}" loading="lazy">
      </div>
      <div class="card__body">
        <a href="categoria.html?c=${a.categorySlug}" class="card__category ${a.breaking ? 'card__category--red' : ''}">${a.category}</a>
        <h3 class="card__title"><a href="noticia.html?id=${a.id}">${a.title}</a></h3>
        <div class="card__meta">
          <i class="fas fa-clock"></i> ${a.time}
          <i class="fas fa-eye"></i> ${formatViews(a.views)}
        </div>
      </div>
    </article>`).join('');
}

/* ============================================================
   ÚLTIMAS NOTÍCIAS
   ============================================================ */
function buildLatestNews() {
  const grid = $('.latest-grid');
  if (!grid) return;
  const articles = ARTICLES.slice(3, 7);
  grid.innerHTML = articles.map(a => `
    <article class="card">
      <div class="card__img" style="height:170px">
        <img src="${a.imageThumb}" alt="${a.title}" loading="lazy">
      </div>
      <div class="card__body">
        <a href="categoria.html?c=${a.categorySlug}" class="card__category">${a.category}</a>
        <h3 class="card__title"><a href="noticia.html?id=${a.id}">${a.title}</a></h3>
        <p class="card__excerpt">${a.excerpt}</p>
        <div class="card__meta">
          <span class="author">${a.author}</span>
          <span>·</span>
          <i class="fas fa-clock"></i> ${a.time}
        </div>
      </div>
    </article>`).join('');
}

/* ============================================================
   NOTÍCIAS LOCAIS
   ============================================================ */
function buildLocalNews() {
  const grid = $('.local-grid');
  if (!grid) return;
  const articles = ARTICLES.slice(7, 11);
  grid.innerHTML = articles.map(a => `
    <article class="card">
      <div class="card__img" style="height:190px">
        <img src="${a.imageThumb}" alt="${a.title}" loading="lazy">
      </div>
      <div class="card__body">
        <a href="categoria.html?c=${a.categorySlug}" class="card__category">${a.category}</a>
        <h3 class="card__title"><a href="noticia.html?id=${a.id}">${a.title}</a></h3>
        <p class="card__excerpt">${a.excerpt}</p>
        <div class="card__meta">
          <i class="fas fa-map-marker-alt"></i> Ilhéus
          <span>·</span>
          <i class="fas fa-clock"></i> ${a.time}
          <i class="fas fa-eye"></i> ${formatViews(a.views)}
        </div>
      </div>
    </article>`).join('');
}

/* ============================================================
   MAIS LIDAS
   ============================================================ */
function buildMostRead() {
  const list = $('.most-read-list');
  if (!list) return;
  const sorted = [...ARTICLES].sort((a, b) => b.views - a.views).slice(0, 7);
  list.innerHTML = sorted.map((a, i) => `
    <li class="most-read-item">
      <span class="most-read-item__num">${String(i + 1).padStart(2, '0')}</span>
      <div class="most-read-item__content">
        <a href="noticia.html?id=${a.id}" class="most-read-item__title">${a.title}</a>
        <div class="most-read-item__meta">
          <span class="most-read-item__views"><i class="fas fa-eye"></i> ${formatViews(a.views)}</span>
          · ${a.time}
        </div>
      </div>
    </li>`).join('');
}

/* ============================================================
   PÁGINA DE NOTÍCIA
   ============================================================ */
function buildArticlePage() {
  const container = $('.article-layout');
  if (!container) return;

  const params = new URLSearchParams(location.search);
  const id = params.get('id') || '';
  const article = ARTICLES.find(a => String(a.id) === String(id)) || ARTICLES[0];

  document.title = `${article.title} — Radar Ilhéus`;

  const mainCol = $('.article-main');
  if (mainCol) {
    mainCol.innerHTML = `
      <nav class="breadcrumb">
        <a href="index.html">Início</a>
        <i class="fas fa-chevron-right"></i>
        <a href="categoria.html?c=${article.categorySlug}">${article.category}</a>
        <i class="fas fa-chevron-right"></i>
        <span>${article.title.substring(0, 40)}...</span>
      </nav>

      <header class="article-header">
        <span class="article-category-badge">${article.category}</span>
        <h1 class="article-title">${article.title}</h1>
        <p class="article-subtitle">${article.excerpt}</p>
        <div class="article-meta">
          <div class="article-meta__author">
            <i class="fas fa-user-circle"></i>
            <span>Por <strong>${article.author}</strong></span>
          </div>
          <span><i class="fas fa-calendar-alt"></i> ${article.date}</span>
          <span><i class="fas fa-clock"></i> Atualizado ${article.time}</span>
          <span><i class="fas fa-book-open"></i> ${article.readTime} de leitura</span>
          <span><i class="fas fa-eye"></i> ${formatViews(article.views)} visualizações</span>
          <div class="article-share">
            <span>Compartilhar:</span>
            <a class="share-btn share-btn--wa" href="#" title="WhatsApp"><i class="fab fa-whatsapp"></i></a>
            <a class="share-btn share-btn--fb" href="#" title="Facebook"><i class="fab fa-facebook-f"></i></a>
            <a class="share-btn share-btn--tw" href="#" title="Twitter/X"><i class="fab fa-twitter"></i></a>
            <button class="share-btn share-btn--link" title="Copiar link" onclick="copyLink()"><i class="fas fa-link"></i></button>
          </div>
        </div>
      </header>

      <div class="article-hero-img">
        <img src="${article.image}" alt="${article.title}">
      </div>
      <p class="article-img-caption"><i class="fas fa-camera"></i> Foto: ${article.author} / Radar Ilhéus</p>

      <div class="article-body">
        <p>${article.excerpt} A informação foi confirmada nesta ${new Date().toLocaleDateString('pt-BR', {weekday: 'long'})} pela assessoria de comunicação responsável pelo evento.</p>

        <p>De acordo com fontes oficiais, o impacto direto na região já começa a ser sentido pela população ilheense. "É um momento histórico para a cidade. Trabalhamos muito para que isso fosse possível", afirmou o responsável pelo projeto durante coletiva de imprensa realizada no centro da cidade.</p>

        <h2>O que muda para a população</h2>

        <p>A novidade traz impactos positivos para os moradores de Ilhéus e municípios vizinhos. Especialistas consultados pelo Radar Ilhéus destacam a importância da iniciativa para o desenvolvimento regional e a melhoria da qualidade de vida.</p>

        <blockquote>"Essa é uma das melhores notícias que Ilhéus recebeu nos últimos anos. O impacto vai ser sentido em toda a cadeia produtiva local." — Especialista Regional</blockquote>

        <p>As próximas etapas já estão planejadas e serão executadas ao longo dos próximos meses. A expectativa é que os resultados completos sejam visíveis ainda no segundo semestre de 2026.</p>

        <h2>Próximos passos</h2>

        <p>Reuniões de acompanhamento estão agendadas para as próximas semanas. O Radar Ilhéus acompanhará de perto todos os desdobramentos e trará informações atualizadas conforme o projeto avança.</p>

        <p>Para mais informações, a população pode acessar os canais oficiais ou entrar em contato diretamente com os responsáveis através dos telefones disponibilizados pela assessoria de comunicação.</p>
      </div>

      <div class="article-tags">
        ${article.tags.map(t => `<a href="#" class="article-tag"># ${t}</a>`).join('')}
      </div>

      <section class="related-news">
        <h2 class="section-title">Veja também</h2>
        <div class="related-grid" id="related-grid"></div>
      </section>`;
  }

  // Related articles
  setTimeout(() => {
    const relGrid = $('#related-grid');
    if (relGrid) {
      const related = ARTICLES.filter(a => a.id !== article.id).slice(0, 3);
      relGrid.innerHTML = related.map(a => `
        <article class="card">
          <div class="card__img" style="height:150px">
            <img src="${a.imageThumb}" alt="${a.title}" loading="lazy">
          </div>
          <div class="card__body">
            <a href="categoria.html?c=${a.categorySlug}" class="card__category">${a.category}</a>
            <h3 class="card__title"><a href="noticia.html?id=${a.id}">${a.title}</a></h3>
            <div class="card__meta"><i class="fas fa-clock"></i> ${a.time}</div>
          </div>
        </article>`).join('');
    }
  }, 10);
}

window.copyLink = function() {
  navigator.clipboard.writeText(location.href).then(() => {
    alert('Link copiado!');
  });
};

/* ============================================================
   PÁGINA DE CATEGORIA
   ============================================================ */
function buildCategoryPage() {
  const grid = $('.category-main-grid');
  if (!grid) return;

  const params = new URLSearchParams(location.search);
  const slug = params.get('c') || 'politica';
  const cat = CATEGORIES.find(c => c.slug.includes(slug));
  const name = cat ? cat.name : slug.charAt(0).toUpperCase() + slug.slice(1);

  const heroTitle = $('.category-hero h1');
  const heroParagraph = $('.category-hero p');
  if (heroTitle) heroTitle.innerHTML = `<span class="category-hero__accent">${name}</span>`;
  if (heroParagraph) heroParagraph.textContent = `Todas as notícias sobre ${name} em Ilhéus e região`;

  document.title = `${name} — Radar Ilhéus`;

  const filtered = ARTICLES.filter(a => a.categorySlug === slug);
  const display = filtered.length >= 2 ? filtered : ARTICLES.slice(0, 6);

  grid.innerHTML = display.map(a => `
    <article class="card">
      <div class="card__img">
        <img src="${a.imageThumb}" alt="${a.title}" loading="lazy">
      </div>
      <div class="card__body">
        <a href="categoria.html?c=${a.categorySlug}" class="card__category">${a.category}</a>
        <h3 class="card__title"><a href="noticia.html?id=${a.id}">${a.title}</a></h3>
        <p class="card__excerpt">${a.excerpt}</p>
        <div class="card__meta">
          <span class="author">${a.author}</span> ·
          <i class="fas fa-clock"></i> ${a.time} ·
          <i class="fas fa-eye"></i> ${formatViews(a.views)}
        </div>
      </div>
    </article>`).join('');
}

/* ============================================================
   MOBILE MENU
   ============================================================ */
function initMobileMenu() {
  const btn = $('.btn-menu');
  const overlay = $('.nav-mobile-overlay');
  const close = $('.nav-mobile-close');
  if (!btn || !overlay) return;

  btn.addEventListener('click', () => {
    overlay.classList.add('open');
    btn.classList.add('active');
    document.body.style.overflow = 'hidden';
  });

  const closeMenu = () => {
    overlay.classList.remove('open');
    btn.classList.remove('active');
    document.body.style.overflow = '';
  };

  if (close) close.addEventListener('click', closeMenu);
  overlay.addEventListener('click', e => {
    if (e.target === overlay) closeMenu();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeMenu();
  });
}

/* ============================================================
   SCROLL TO TOP
   ============================================================ */
function initScrollTop() {
  const btn = $('.scroll-top');
  if (!btn) return;

  window.addEventListener('scroll', () => {
    btn.classList.toggle('visible', window.scrollY > 400);
  }, { passive: true });

  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

/* ============================================================
   CLOCK
   ============================================================ */
function initClock() {
  const el = $('.topbar-datetime');
  if (!el) return;
  const update = () => { el.textContent = currentDateTime(); };
  update();
  setInterval(update, 30000);
}

/* ============================================================
   BUSCA
   ============================================================ */
function initSearch() {
  const form = $('.header-search');
  if (!form) return;
  form.addEventListener('submit', e => {
    e.preventDefault();
    const q = form.querySelector('input').value.trim();
    if (q) alert(`Buscando por: "${q}"\n\n(Integração com backend em produção)`);
  });
}

/* ============================================================
   INICIALIZAÇÃO
   ============================================================ */
document.addEventListener('DOMContentLoaded', async () => {
  buildNav();
  buildBreakingNews();
  initMobileMenu();
  initScrollTop();
  initClock();
  initSearch();

  // Carrega artigos da API (com fallback para padrão)
  ARTICLES = await loadArticles();

  // Home
  buildHero();
  buildLatestNews();
  buildLocalNews();
  buildMostRead();

  // Notícia
  buildArticlePage();

  // Categoria
  buildCategoryPage();
});
