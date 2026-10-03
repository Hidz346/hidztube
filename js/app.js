/* ============================================================
   HIDZTUBE — APP
   Router hash-based + render per-view + adapter per kategori.
   Tidak pakai framework/bundler — murni vanilla JS.
============================================================ */
(function () {
  'use strict';

  const api = window.HT.api;
  const normalize = window.HT.normalize;
  const CAT_LABEL = window.HT.CAT_LABEL;

  const appEl = document.getElementById('app');
  const globalLoader = document.getElementById('global-loader');
  const pillStrip = document.getElementById('pill-strip');
  const searchForm = document.getElementById('search-form');
  const searchInput = document.getElementById('search-input');
  const themeToggle = document.getElementById('theme-toggle');
  const brandHome = document.getElementById('brand-home');

  let currentRoute = { view: 'home', payload: {} };
  let renderToken = 0;
  let currentHls = null;

  /* ── Helpers ───────────────────────────────────────────── */
  function escapeHtml(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }
  const escapeAttr = escapeHtml;

  function prettyKey(k) {
    return String(k || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  function formatDuration(seconds) {
    const s = Number(seconds) || 0;
    if (!s) return '';
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return `${h ? h + 'j ' : ''}${m || !h ? m + 'm' : ''}`.trim();
  }

  function detectPlayerType(url) {
    if (!url) return 'none';
    if (/\.m3u8(\?|$)/i.test(url)) return 'hls';
    if (/\.(mp4|webm|mkv)(\?|$)/i.test(url)) return 'mp4';
    return 'hls';
  }

  const PLACEHOLDER = 'data:image/svg+xml;utf8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 450">' +
    '<rect width="300" height="450" fill="#1a1a1a"/>' +
    '<text x="150" y="235" font-family="monospace" font-size="20" fill="#555" text-anchor="middle">HIDZTUBE</text>' +
    '</svg>'
  );

  let toastTimer = null;
  function toast(msg) {
    let el = document.getElementById('ht-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'ht-toast';
      el.style.cssText = 'position:fixed;left:50%;bottom:28px;transform:translateX(-50%);z-index:300;background:var(--y);color:#000;font-family:"Space Mono",monospace;font-size:0.72rem;padding:10px 18px;border:2px solid #000;box-shadow:4px 4px 0 var(--c);max-width:88vw;text-align:center;transition:opacity 0.2s;';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.style.opacity = '1';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.style.opacity = '0'; }, 2600);
  }

  function stateBoxHTML({ icon = 'fa-satellite-dish', title, desc, retry = false, retryLabel = 'Coba Lagi' }) {
    return `<div class="wrap"><div class="state-box fade-in">
      <i class="fas ${icon} state-icon"></i>
      <div class="state-title">${escapeHtml(title)}</div>
      ${desc ? `<div class="state-desc">${escapeHtml(desc)}</div>` : ''}
      ${retry ? `<button class="btn-reconnect" id="state-retry-btn" type="button"><i class="fas fa-redo"></i> ${escapeHtml(retryLabel)}</button>` : ''}
    </div></div>`;
  }
  function loadingHTML(label) {
    return `<div class="wrap"><div class="state-box"><i class="fas fa-circle-notch spin state-icon"></i><div class="state-title">${escapeHtml(label || 'Memuat...')}</div></div></div>`;
  }
  function wireRetry() {
    const b = document.getElementById('state-retry-btn');
    if (b) b.addEventListener('click', () => renderRoute());
  }
  function backLinkHTML(label) {
    return `<div class="back-link" id="back-link"><i class="fas fa-arrow-left"></i> ${escapeHtml(label || 'Kembali')}</div>`;
  }
  function wireBackLink() {
    const b = document.getElementById('back-link');
    if (b) b.addEventListener('click', () => { history.back(); });
  }

  /* ── Card / grid builders ──────────────────────────────── */
  function cardHTML(item) {
    const thumb = item.thumb || PLACEHOLDER;
    const tagHtml = item.tag ? `<div class="card-tag">${escapeHtml(item.tag)}</div>` : '';
    return `<div class="card fade-in" data-cat="${escapeAttr(item.cat)}" data-key="${escapeAttr(item.key)}">
      <div class="card-thumb">
        <img src="${escapeAttr(thumb)}" alt="${escapeAttr(item.title)}" loading="lazy" />
        ${tagHtml}
        <div class="card-play"><span><i class="fas fa-play"></i></span></div>
      </div>
      <div class="card-body">
        <div class="card-title">${escapeHtml(item.title)}</div>
        ${item.sub ? `<div class="card-sub">${escapeHtml(item.sub)}</div>` : ''}
        <span class="cat-badge" data-cat="${escapeAttr(item.cat)}">${escapeHtml(CAT_LABEL[item.cat] || item.cat)}</span>
      </div>
    </div>`;
  }
  function channelTileHTML(item) {
    const thumb = item.thumb || PLACEHOLDER;
    return `<div class="channel-tile" data-cat="livetv" data-key="${escapeAttr(item.key)}">
      <img src="${escapeAttr(thumb)}" alt="${escapeAttr(item.title)}" loading="lazy" />
      <span>${escapeHtml(item.title)}</span>
    </div>`;
  }
  function gridHTML(items, renderer) {
    renderer = renderer || cardHTML;
    if (!items.length) return '';
    return `<div class="grid">${items.map(renderer).join('')}</div>`;
  }
  function rowHTML(title, cat, items) {
    if (!items.length) return '';
    return `<section class="section">
      <h3 class="section-heading">${escapeHtml(title)} <span class="see-all" data-seeall="${escapeAttr(cat)}">Lihat Semua</span></h3>
      <div class="row-scroll">${items.map(cardHTML).join('')}</div>
    </section>`;
  }

  function bindGridClicks(root) {
    root.querySelectorAll('[data-cat][data-key]').forEach((el) => {
      el.addEventListener('click', () => {
        const cat = el.dataset.cat, key = el.dataset.key;
        if (!cat || !key) return;
        if (cat === 'livetv') go('watch', { cat: 'livetv', key });
        else go('detail', { cat, key });
      });
    });
    root.querySelectorAll('[data-seeall]').forEach((el) => {
      el.addEventListener('click', () => go('browse', { cat: el.dataset.seeall, page: 1 }));
    });
  }

  /* ── Theme ─────────────────────────────────────────────── */
  function initTheme() {
    const saved = localStorage.getItem('ht-theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
  }
  function toggleTheme() {
    const cur = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    const next = cur === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('ht-theme', next);
  }

  /* ── Player ────────────────────────────────────────────── */
  function destroyHls() {
    if (currentHls) { try { currentHls.destroy(); } catch (e) { /* noop */ } currentHls = null; }
  }
  function mountPlayer(container, p) {
    destroyHls();
    container.innerHTML = '';
    if (!p || p.type === 'none' || !p.src) {
      container.innerHTML = `<div class="player-fallback"><i class="fas fa-satellite-dish"></i><p>Server streaming untuk tayangan ini belum tersedia. Coba pilih server lain.</p></div>`;
      return;
    }
    if (p.type === 'dash') {
      container.innerHTML = `<div class="player-fallback"><i class="fas fa-triangle-exclamation"></i><p>Format stream ini (DASH) belum didukung langsung di browser.</p><a class="btn-secondary" href="${escapeAttr(p.src)}" target="_blank" rel="noopener">Buka Link Manifest</a></div>`;
      return;
    }
    if (p.type === 'iframe') {
      const iframe = document.createElement('iframe');
      iframe.src = p.src;
      iframe.setAttribute('allowfullscreen', '');
      iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
      iframe.referrerPolicy = 'no-referrer';
      container.appendChild(iframe);
      return;
    }
    if (p.type === 'hls' || p.type === 'mp4') {
      const video = document.createElement('video');
      video.controls = true;
      video.playsInline = true;
      video.setAttribute('playsinline', '');
      if (p.poster) video.poster = p.poster;
      container.appendChild(video);
      if (p.type === 'mp4') { video.src = p.src; return; }
      if (window.Hls && window.Hls.isSupported()) {
        const hls = new window.Hls();
        currentHls = hls;
        hls.on(window.Hls.Events.ERROR, (evt, data) => {
          if (data && data.fatal) {
            container.innerHTML = `<div class="player-fallback"><i class="fas fa-triangle-exclamation"></i><p>Gagal memutar stream. Coba server atau kualitas lain.</p></div>`;
          }
        });
        hls.loadSource(p.src);
        hls.attachMedia(video);
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = p.src;
      } else {
        container.innerHTML = `<div class="player-fallback"><i class="fas fa-triangle-exclamation"></i><p>Browser ini tidak mendukung pemutaran HLS.</p><a class="btn-secondary" href="${escapeAttr(p.src)}" target="_blank" rel="noopener">Buka Link Stream</a></div>`;
      }
      return;
    }
    container.innerHTML = `<div class="player-fallback"><i class="fas fa-circle-question"></i><p>Format streaming belum didukung.</p></div>`;
  }

  /* ── Adapters per kategori ─────────────────────────────── */
  const ADAPTERS = {
    anime: {
      label: 'Anime', homeTitle: 'Anime Terbaru',
      async list(page) { const r = await api.anime.latest(page); return normalize.anime(r.data); },
      async search(q, page) { const r = await api.anime.search(q, page); return normalize.anime(r.data); },
      async detail(key) {
        const r = await api.anime.detail(key);
        const meta = Object.entries(r.info || {}).map(([k, v]) => `${prettyKey(k)}: ${v}`);
        const items = (r.episodes || []).map((e) => ({
          label: e.title && e.title !== `Episode ${e.episode}` ? e.title : `Episode ${e.episode || ''}`.trim(),
          sub: e.date || '', key: e.url
        }));
        return { title: r.title, thumb: r.thumbnail, synopsis: r.synopsis, meta, genres: r.genres || [], items, itemsLabel: 'Episode' };
      },
      goEpisode(detailKey, item) { go('watch', { cat: 'anime', key: item.key }); },
      async watch(payload) {
        const r = await api.anime.stream(payload.key);
        const servers = (r.streams || []).map((s, i) => ({ label: s.server || `Server ${i + 1}`, type: 'iframe', src: s.iframe }));
        return {
          title: r.title, desc: '',
          player: servers[0] || { type: 'none' },
          servers,
          downloads: r.downloads || [],
          navPrev: r.navigation?.prev ? { cat: 'anime', key: r.navigation.prev } : null,
          navNext: r.navigation?.next ? { cat: 'anime', key: r.navigation.next } : null
        };
      }
    },
    donghua: {
      label: 'Donghua', homeTitle: 'Donghua Terbaru',
      async list(page) { const r = await api.donghua.latest(page); return normalize.donghua(r.data); },
      async search(q, page) { const r = await api.donghua.search(q, page); return normalize.donghua(r.data); },
      async detail(key) {
        const r = await api.donghua.detail(key);
        const meta = Object.entries(r.info || {}).map(([k, v]) => `${prettyKey(k)}: ${v}`);
        const items = (r.episodes || []).map((e) => ({
          label: e.title && e.title !== `Episode ${e.episode}` ? e.title : `Episode ${e.episode || ''}`.trim(),
          sub: e.date || '', key: e.url
        }));
        return { title: r.title, thumb: r.thumbnail, synopsis: r.synopsis, meta, genres: r.genres || [], items, itemsLabel: 'Episode' };
      },
      goEpisode(detailKey, item) { go('watch', { cat: 'donghua', key: item.key }); },
      async watch(payload) {
        const r = await api.donghua.stream(payload.key);
        const servers = (r.servers || []).map((s, i) => ({ label: s.name || `Server ${i + 1}`, type: 'iframe', src: s.iframe }));
        return {
          title: r.title, desc: '',
          player: servers[0] || { type: 'none' },
          servers,
          downloads: [],
          navPrev: r.navigation?.prev ? { cat: 'donghua', key: r.navigation.prev } : null,
          navNext: r.navigation?.next ? { cat: 'donghua', key: r.navigation.next } : null
        };
      }
    },
    drama: {
      label: 'Drama Asia', homeTitle: 'Drama Asia Terbaru',
      async list(page) { const r = await api.drama.latest(page); return normalize.drama(r.data); },
      async search(q, page) { const r = await api.drama.search(q, page); return normalize.drama(r.data); },
      async detail(key) {
        const r = await api.drama.detail(key);
        const meta = Object.entries(r.details || {}).map(([k, v]) => `${prettyKey(k)}: ${v}`);
        const items = (r.episodes || []).map((e) => ({
          label: e.label || `Episode ${e.episode}`,
          sub: e.isEnd ? 'Tamat' : '', key: String(e.episode), episode: e.episode
        }));
        return { title: r.title, thumb: r.thumbnail, synopsis: r.synopsis, meta, genres: [], items, itemsLabel: 'Episode', _slug: r.slug };
      },
      goEpisode(detailKey, item) { go('watch', { cat: 'drama', key: detailKey, episode: item.episode, server: 'lite' }); },
      async watch(payload) {
        const r = await api.drama.stream(payload.key, payload.episode, payload.server || 'lite');
        const hlsList = r.hlsStreams || [];
        const player = hlsList.length
          ? { type: detectPlayerType(hlsList[0].url), src: hlsList[0].url, poster: r.coverImage }
          : (r.playerIframe ? { type: 'iframe', src: r.playerIframe } : { type: 'none' });
        const serverChips = ['lite', 'fast', 'max'].map((s) => ({ label: s.toUpperCase(), type: 'route', value: s }));
        const downloads = (r.downloads || []).length
          ? [{ quality: 'Unduhan', links: r.downloads.map((d) => ({ source: d.title, url: d.url })) }]
          : [];
        return { title: r.title, desc: '', player, servers: serverChips, activeServer: r.server, downloads, navPrev: null, navNext: null };
      }
    },
    vod: {
      label: 'Film & Series', homeTitle: 'Film & Series Terbaru',
      async sectionsRaw(page) { const r = await api.vod.list(page); return r.sections || []; },
      async search(q) { const r = await api.cubmu.search(q); return normalize.vod(r.vods); },
      async detail(key) {
        const r = await api.vod.detail(key);
        const meta = [r.vodType, r.genre, r.studio].filter(Boolean);
        const items = (r.episodes || []).map((e) => ({
          label: `Eps ${e.episodeNo}${e.title ? ' - ' + e.title : ''}`,
          sub: formatDuration(e.durationSeconds), key: e.watchSlug || ''
        }));
        return { title: r.title, thumb: r.posterPortrait || r.posterLandscape, synopsis: null, meta, genres: [], items, itemsLabel: 'Episode' };
      },
      goEpisode(detailKey, item) {
        if (!item.key) { toast('Server untuk episode ini belum tersedia.'); return; }
        go('watch', { cat: 'vod', key: item.key });
      },
      async watch(payload) {
        const r = await api.vod.stream(payload.key);
        const hls = r.stream?.hls, dash = r.stream?.dash;
        let player = { type: 'none' };
        if (hls) player = { type: detectPlayerType(hls), src: hls, poster: r.posterLandscape };
        else if (dash) player = { type: 'dash', src: dash };
        return {
          title: r.episodeTitle || r.title, desc: r.synopsis || '',
          player, servers: [], downloads: [], navPrev: null, navNext: null
        };
      }
    },
    livetv: {
      label: 'Live TV', homeTitle: 'Live TV',
      async genresRaw() { const r = await api.livetv.list(); return r.genres || []; },
      async watch(payload) {
        const r = await api.livetv.stream(payload.key);
        const cdns = r.stream?.cdns || [];
        let player = { type: 'none' };
        const hlsHit = cdns.find((c) => c.hls);
        if (hlsHit) player = { type: 'hls', src: hlsHit.hls, poster: r.image };
        else if (r.stream?.dash) {
          const t = detectPlayerType(r.stream.dash);
          player = t === 'hls' ? { type: 'hls', src: r.stream.dash, poster: r.image } : { type: 'dash', src: r.stream.dash };
        } else {
          const dashHit = cdns.find((c) => c.dash);
          if (dashHit) player = { type: 'dash', src: dashHit.dash };
        }
        return {
          title: r.channelName, desc: r.description || '',
          player, servers: [], downloads: [], navPrev: null, navNext: null
        };
      }
    },
    manga: {
      label: 'Komik', homeTitle: 'Komik Terbaru',
      async home() { return api.manga.home(); },
      async search(q) { const r = await api.manga.search(q); return normalize.manga(r.data); },
      async detail(key) {
        const r = await api.manga.detail(key);
        const meta = [r.author ? `Author: ${r.author}` : null, `${r.totalChapters} Chapter`].filter(Boolean);
        const items = (r.chapters || []).map((c) => ({
          label: c.title, sub: c.isFree ? 'Gratis' : 'Premium', key: String(c.id), locked: !c.isFree
        }));
        return { title: r.title, thumb: r.thumbnail, synopsis: r.description, meta, genres: r.tags || [], items, itemsLabel: 'Chapter' };
      },
      goEpisode(detailKey, item) { go('read', { chapterId: item.key }); }
    }
  };

  /* ── Router ────────────────────────────────────────────── */
  function go(view, payload) {
    location.hash = `${view}:${encodeURIComponent(JSON.stringify(payload || {}))}`;
  }
  function parseHash() {
    const h = location.hash.replace(/^#/, '');
    if (!h) return { view: 'home', payload: {} };
    const idx = h.indexOf(':');
    if (idx === -1) return { view: 'home', payload: {} };
    const view = h.slice(0, idx);
    let payload = {};
    try { payload = JSON.parse(decodeURIComponent(h.slice(idx + 1))); } catch (e) { payload = {}; }
    return { view, payload };
  }
  function syncActivePill(cat) {
    pillStrip.querySelectorAll('.pill').forEach((p) => {
      p.classList.toggle('active', (p.dataset.cat || '') === (cat || ''));
    });
  }
  function hideGlobalLoader() {
    globalLoader.classList.add('hidden');
  }

  async function renderRoute() {
    const token = ++renderToken;
    const { view, payload } = parseHash();
    currentRoute = { view, payload };
    syncActivePill(payload.cat || (view === 'read' ? 'manga' : ''));
    window.scrollTo(0, 0);
    try {
      if (view === 'browse') await renderBrowse(payload, token);
      else if (view === 'detail') await renderDetail(payload, token);
      else if (view === 'watch') await renderWatch(payload, token);
      else if (view === 'read') await renderRead(payload, token);
      else if (view === 'search') await renderSearch(payload, token);
      else await renderHome(token);
    } catch (err) {
      if (token !== renderToken) return;
      appEl.innerHTML = stateBoxHTML({ icon: 'fa-bug', title: 'Terjadi kesalahan', desc: err?.message || 'Silakan coba lagi.', retry: true });
      wireRetry();
    } finally {
      if (token === renderToken) hideGlobalLoader();
    }
  }

  /* ── View: HOME ────────────────────────────────────────── */
  const HERO_TAGLINE = {
    anime: 'Episode anime subtitle Indonesia terbaru, update setiap hari.',
    donghua: 'Animasi 3D Tiongkok terbaru, subtitle Indonesia.',
    drama: 'Drama Asia terbaru lengkap dengan subtitle.',
    vod: 'Film dan series pilihan, siap ditonton kapan saja.',
    manga: 'Komik update terbaru, baca online kapan saja.'
  };

  async function renderHome(token) {
    appEl.innerHTML = loadingHTML('Menyiapkan beranda...');
    const [animeR, donghuaR, dramaR, vodR, livetvR, mangaR] = await Promise.allSettled([
      ADAPTERS.anime.list(1),
      ADAPTERS.donghua.list(1),
      ADAPTERS.drama.list(1),
      ADAPTERS.vod.sectionsRaw(1),
      ADAPTERS.livetv.genresRaw(),
      ADAPTERS.manga.home()
    ]);
    if (token !== renderToken) return;

    const rows = [];
    if (animeR.status === 'fulfilled' && animeR.value.length) rows.push({ cat: 'anime', title: 'Anime Terbaru', items: animeR.value.slice(0, 14) });
    if (donghuaR.status === 'fulfilled' && donghuaR.value.length) rows.push({ cat: 'donghua', title: 'Donghua Terbaru', items: donghuaR.value.slice(0, 14) });
    if (dramaR.status === 'fulfilled' && dramaR.value.length) rows.push({ cat: 'drama', title: 'Drama Asia Terbaru', items: dramaR.value.slice(0, 14) });
    if (vodR.status === 'fulfilled' && vodR.value.length) {
      const firstSection = vodR.value[0];
      if (firstSection?.contents?.length) rows.push({ cat: 'vod', title: firstSection.sectionName || 'Film & Series', items: normalize.vod(firstSection.contents).slice(0, 14) });
    }
    if (mangaR.status === 'fulfilled' && mangaR.value?.updatedTitles?.length) rows.push({ cat: 'manga', title: 'Komik Update Terbaru', items: normalize.manga(mangaR.value.updatedTitles).slice(0, 14) });

    let channelItems = [];
    if (livetvR.status === 'fulfilled' && livetvR.value.length) {
      const flat = livetvR.value.flatMap((g) => g.channels || []);
      channelItems = normalize.channel(flat).slice(0, 12);
    }

    let heroItem = null, heroCat = null;
    for (const r of rows) { if (r.items.length) { heroItem = r.items[0]; heroCat = r.cat; break; } }

    if (!heroItem && !rows.length && !channelItems.length) {
      appEl.innerHTML = stateBoxHTML({ title: 'Gagal memuat beranda', desc: 'Semua sumber konten gagal dimuat. Periksa koneksi lalu coba lagi.', retry: true });
      wireRetry();
      return;
    }

    let heroHTML = '';
    if (heroItem) {
      heroHTML = `<section class="hero">
        <div class="hero-bg">
          <img src="${escapeAttr(heroItem.thumb || PLACEHOLDER)}" alt="" onload="this.classList.add('loaded')" onerror="this.src='${PLACEHOLDER}'" />
          <div class="fade-l"></div><div class="fade-b"></div>
        </div>
        <div class="scanlines"></div>
        <div class="hud-corner tl"></div><div class="hud-corner tr"></div>
        <div class="hero-body fade-in">
          <div class="badge-new"><span class="dot"></span>BARU</div>
          <h2 class="hero-title">${escapeHtml(heroItem.title)}</h2>
          <div class="meta-row">
            <span class="meta-chip accent">${escapeHtml(CAT_LABEL[heroCat] || '')}</span>
            ${heroItem.sub ? `<span class="meta-chip">${escapeHtml(heroItem.sub)}</span>` : ''}
          </div>
          <p class="hero-desc">${escapeHtml(HERO_TAGLINE[heroCat] || '')}</p>
          <div class="cta-row">
            <button class="btn-primary" id="hero-cta"><i class="fas fa-play"></i> Lihat Detail</button>
          </div>
        </div>
      </section>`;
    }

    let channelHTML = '';
    if (channelItems.length) {
      channelHTML = `<section class="section">
        <h3 class="section-heading">Live TV <span class="see-all" data-seeall="livetv">Lihat Semua</span></h3>
        <div class="channel-grid">${channelItems.map(channelTileHTML).join('')}</div>
      </section>`;
    }

    const rowsHTML = rows.map((r) => rowHTML(r.title, r.cat, r.items)).join('');

    appEl.innerHTML = `${heroHTML}<div class="wrap">${channelHTML}${rowsHTML}</div>`;

    const heroCta = document.getElementById('hero-cta');
    if (heroCta && heroItem) {
      heroCta.addEventListener('click', () => {
        if (heroCat === 'livetv') go('watch', { cat: 'livetv', key: heroItem.key });
        else go('detail', { cat: heroCat, key: heroItem.key });
      });
    }
    bindGridClicks(appEl);
  }

  /* ── View: BROWSE ──────────────────────────────────────── */
  async function renderBrowse(payload, token) {
    const cat = payload.cat;
    const page = payload.page || 1;
    const query = payload.query || '';
    appEl.innerHTML = loadingHTML(`Memuat ${CAT_LABEL[cat] || ''}...`);

    if (cat === 'livetv') {
      const genres = await ADAPTERS.livetv.genresRaw();
      if (token !== renderToken) return;
      if (!genres.length) {
        appEl.innerHTML = `<div class="wrap">${backLinkHTML()}${stateBoxHTML({ title: 'Live TV tidak tersedia', desc: 'Gagal memuat daftar channel.', retry: true })}</div>`;
        wireBackLink(); wireRetry();
        return;
      }
      const body = genres.map((g) => {
        const items = normalize.channel(g.channels || []);
        if (!items.length) return '';
        return `<h3 class="channel-genre-title">${escapeHtml(g.genreName || 'Lainnya')}</h3><div class="channel-grid">${items.map(channelTileHTML).join('')}</div>`;
      }).join('');
      appEl.innerHTML = `<div class="wrap">${backLinkHTML()}<h2 class="section-heading">Live TV</h2>${body}</div>`;
      wireBackLink();
      bindGridClicks(appEl);
      return;
    }

    if (cat === 'manga' && !query) {
      const home = await ADAPTERS.manga.home();
      if (token !== renderToken) return;
      const sections = [
        { title: 'Update Terbaru', items: normalize.manga(home.updatedTitles || []) },
        { title: 'Manga Baru', items: normalize.manga(home.newTitles || []) },
        { title: 'Ranking', items: normalize.manga(home.rankings || []) }
      ].filter((s) => s.items.length);
      if (!sections.length) {
        appEl.innerHTML = `<div class="wrap">${backLinkHTML()}${stateBoxHTML({ title: 'Komik tidak tersedia', retry: true })}</div>`;
        wireBackLink(); wireRetry();
        return;
      }
      appEl.innerHTML = `<div class="wrap">${backLinkHTML()}<h2 class="section-heading">Komik</h2>${sections.map((s) => `<section class="section"><h3 class="section-heading">${escapeHtml(s.title)}</h3>${gridHTML(s.items)}</section>`).join('')}</div>`;
      wireBackLink();
      bindGridClicks(appEl);
      return;
    }

    if (cat === 'vod' && !query) {
      const sections = await ADAPTERS.vod.sectionsRaw(page);
      if (token !== renderToken) return;
      const filtered = sections.filter((s) => s.contents?.length);
      appEl.innerHTML = `<div class="wrap">${backLinkHTML()}<h2 class="section-heading">Film &amp; Series</h2>
        ${filtered.length ? filtered.map((s) => `<section class="section"><h3 class="section-heading">${escapeHtml(s.sectionName || 'VOD')}</h3>${gridHTML(normalize.vod(s.contents))}</section>`).join('') : stateBoxHTML({ title: 'Tidak ada data di halaman ini' })}
        <div class="pager">${page > 1 ? `<button class="btn-secondary" id="pg-prev"><i class="fas fa-chevron-left"></i> Sebelumnya</button>` : ''}<button class="btn-secondary" id="pg-next">Selanjutnya <i class="fas fa-chevron-right"></i></button></div>
      </div>`;
      wireBackLink();
      bindGridClicks(appEl);
      wirePager(cat, page, query);
      return;
    }

    /* Flat paginated categories: anime, donghua, drama, manga(search), vod(search) */
    let items = [];
    try {
      if (cat === 'manga') items = await ADAPTERS.manga.search(query);
      else if (cat === 'vod') items = await ADAPTERS.vod.search(query);
      else if (query) items = await ADAPTERS[cat].search(query, page);
      else items = await ADAPTERS[cat].list(page);
    } catch (err) {
      if (token !== renderToken) return;
      appEl.innerHTML = `<div class="wrap">${backLinkHTML()}${stateBoxHTML({ title: 'Gagal memuat', desc: err?.message, retry: true })}</div>`;
      wireBackLink(); wireRetry();
      return;
    }
    if (token !== renderToken) return;

    const heading = query ? `${CAT_LABEL[cat]} — Hasil "${query}"` : `${CAT_LABEL[cat]} Terbaru`;
    appEl.innerHTML = `<div class="wrap">${backLinkHTML()}<h2 class="section-heading">${escapeHtml(heading)}</h2>
      ${items.length ? gridHTML(items) : stateBoxHTML({ title: 'Tidak ada hasil', desc: 'Coba kata kunci atau halaman lain.' })}
      <div class="pager">
        ${page > 1 && !query ? `<button class="btn-secondary" id="pg-prev"><i class="fas fa-chevron-left"></i> Sebelumnya</button>` : ''}
        ${!query ? `<button class="btn-secondary" id="pg-next">Selanjutnya <i class="fas fa-chevron-right"></i></button>` : ''}
      </div>
    </div>`;
    wireBackLink();
    bindGridClicks(appEl);
    wirePager(cat, page, query);
  }
  function wirePager(cat, page, query) {
    const prev = document.getElementById('pg-prev');
    const next = document.getElementById('pg-next');
    if (prev) prev.addEventListener('click', () => go('browse', { cat, page: page - 1, query }));
    if (next) next.addEventListener('click', () => go('browse', { cat, page: page + 1, query }));
  }

  /* ── View: DETAIL ──────────────────────────────────────── */
  async function renderDetail(payload, token) {
    const { cat, key } = payload;
    appEl.innerHTML = loadingHTML('Memuat detail...');
    const adapter = ADAPTERS[cat];
    if (!adapter || !adapter.detail) { appEl.innerHTML = stateBoxHTML({ title: 'Kategori tidak dikenal' }); return; }

    let d;
    try {
      d = await adapter.detail(key);
      /* Listing "terbaru" di beberapa situs sumber kadang menaut langsung ke
         halaman episode (bukan halaman series). Kalau hasil detail kosong
         sama sekali, anggap key ini sebenarnya link episode & langsung
         arahkan ke player alih-alih menampilkan error. */
      if ((cat === 'anime' || cat === 'donghua') && (!d.items || d.items.length === 0) && !d.synopsis) {
        go('watch', { cat, key });
        return;
      }
    } catch (err) {
      if (cat === 'anime' || cat === 'donghua') {
        go('watch', { cat, key });
        return;
      }
      if (token !== renderToken) return;
      appEl.innerHTML = `<div class="wrap">${backLinkHTML()}${stateBoxHTML({ title: 'Gagal memuat detail', desc: err?.message, retry: true })}</div>`;
      wireBackLink(); wireRetry();
      return;
    }
    if (token !== renderToken) return;

    const metaHTML = (d.meta || []).map((m) => `<span class="meta-chip">${escapeHtml(m)}</span>`).join('');
    const genresHTML = (d.genres || []).length ? `<div class="detail-genres">${d.genres.map((g) => `<span class="genre-chip">${escapeHtml(g)}</span>`).join('')}</div>` : '';
    const itemsHTML = (d.items || []).length
      ? `<div class="ep-list">${d.items.map((it, i) => `<div class="ep-row" data-idx="${i}"><span class="ep-num">${it.locked ? '<i class="fas fa-lock"></i> ' : ''}${escapeHtml(it.label)}</span><span class="ep-date">${escapeHtml(it.sub || '')}</span><i class="fas fa-chevron-right"></i></div>`).join('')}</div>`
      : `<p class="state-desc" style="margin:0;">Belum ada ${escapeHtml((d.itemsLabel || 'episode').toLowerCase())} tersedia.</p>`;

    appEl.innerHTML = `<div class="wrap">
      ${backLinkHTML()}
      <div class="detail-head">
        <div class="detail-poster"><img src="${escapeAttr(d.thumb || PLACEHOLDER)}" alt="${escapeAttr(d.title)}" /></div>
        <div class="detail-info">
          <h1 class="detail-title">${escapeHtml(d.title)}</h1>
          <div class="detail-meta">${metaHTML}</div>
          ${d.synopsis ? `<p class="detail-synopsis">${escapeHtml(d.synopsis)}</p>` : ''}
          ${genresHTML}
        </div>
      </div>
      <section class="section">
        <h3 class="section-heading">Daftar ${escapeHtml(d.itemsLabel || 'Episode')}</h3>
        ${itemsHTML}
      </section>
    </div>`;
    wireBackLink();

    appEl.querySelectorAll('.ep-row').forEach((row) => {
      row.addEventListener('click', () => {
        const idx = Number(row.dataset.idx);
        const item = d.items[idx];
        if (!item) return;
        adapter.goEpisode(key, item);
      });
    });
  }

  /* ── View: WATCH ───────────────────────────────────────── */
  async function renderWatch(payload, token) {
    const { cat } = payload;
    appEl.innerHTML = loadingHTML('Menyiapkan player...');
    const adapter = ADAPTERS[cat];
    if (!adapter || !adapter.watch) { appEl.innerHTML = stateBoxHTML({ title: 'Kategori tidak dikenal' }); return; }

    let w;
    try { w = await adapter.watch(payload); }
    catch (err) {
      if (token !== renderToken) return;
      appEl.innerHTML = `<div class="wrap">${backLinkHTML()}${stateBoxHTML({ title: 'Gagal memuat stream', desc: err?.message, retry: true })}</div>`;
      wireBackLink(); wireRetry();
      return;
    }
    if (token !== renderToken) return;

    const serversHTML = (w.servers || []).length
      ? `<div class="server-row">${w.servers.map((s, i) => `<button class="server-chip${(w.activeServer && s.value === w.activeServer) || (!w.activeServer && i === 0) ? ' active' : ''}" data-idx="${i}" type="button">${escapeHtml(s.label)}</button>`).join('')}</div>`
      : '';

    const dlHTML = (w.downloads || []).length
      ? `<div class="dl-list">${w.downloads.map((g) => `<div class="dl-group"><div class="dl-quality">${escapeHtml(g.quality)}</div>${(g.links || []).map((l) => `<a href="${escapeAttr(l.url)}" target="_blank" rel="noopener">${escapeHtml(l.source)}</a>`).join('')}</div>`).join('')}</div>`
      : '';

    const navHTML = (w.navPrev || w.navNext)
      ? `<div class="nav-eps">${w.navPrev ? `<button class="btn-secondary" id="nav-prev"><i class="fas fa-chevron-left"></i> Episode Sebelumnya</button>` : ''}${w.navNext ? `<button class="btn-secondary" id="nav-next">Episode Berikutnya <i class="fas fa-chevron-right"></i></button>` : ''}</div>`
      : '';

    appEl.innerHTML = `<div class="wrap watch-wrap">
      ${backLinkHTML()}
      <div class="player-wrap" id="player-mount"></div>
      ${serversHTML}
      <h1 class="watch-title">${escapeHtml(w.title || '')}</h1>
      ${w.desc ? `<p class="watch-desc">${escapeHtml(w.desc)}</p>` : ''}
      ${navHTML}
      ${dlHTML}
    </div>`;
    wireBackLink();

    const mount = document.getElementById('player-mount');
    mountPlayer(mount, w.player);

    appEl.querySelectorAll('.server-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        const idx = Number(chip.dataset.idx);
        const s = w.servers[idx];
        if (!s) return;
        if (s.type === 'route') {
          go('watch', { ...payload, server: s.value });
          return;
        }
        appEl.querySelectorAll('.server-chip').forEach((c) => c.classList.remove('active'));
        chip.classList.add('active');
        mountPlayer(mount, { type: s.type, src: s.src });
      });
    });

    const prevBtn = document.getElementById('nav-prev');
    const nextBtn = document.getElementById('nav-next');
    if (prevBtn) prevBtn.addEventListener('click', () => go('watch', w.navPrev));
    if (nextBtn) nextBtn.addEventListener('click', () => go('watch', w.navNext));
  }

  /* ── View: READ (manga) ────────────────────────────────── */
  async function renderRead(payload, token) {
    appEl.innerHTML = loadingHTML('Memuat chapter...');
    let r;
    try { r = await api.manga.read(payload.chapterId); }
    catch (err) {
      if (token !== renderToken) return;
      appEl.innerHTML = `<div class="wrap">${backLinkHTML()}${stateBoxHTML({ title: 'Gagal memuat chapter', desc: err?.message, retry: true })}</div>`;
      wireBackLink(); wireRetry();
      return;
    }
    if (token !== renderToken) return;

    const pagesHTML = (r.pages || []).map((p, i) => {
      const src = api.manga.imageUrl(p.url, p.key, p.iv);
      return `<img src="${escapeAttr(src)}" alt="Halaman ${p.page}" loading="${i < 3 ? 'eager' : 'lazy'}" referrerpolicy="no-referrer" />`;
    }).join('');

    appEl.innerHTML = `<div class="wrap reader-wrap">
      ${backLinkHTML()}
      <div class="reader-bar"><span class="reader-title">${escapeHtml(r.title || '')}</span><span class="meta-chip">${(r.pages || []).length} Halaman</span></div>
      <div class="reader-pages">${pagesHTML || ''}</div>
      <div class="reader-nav">
        <div></div>
        ${r.nextChapter ? `<button class="btn-primary" id="next-chapter">Chapter Berikutnya <i class="fas fa-chevron-right"></i></button>` : ''}
      </div>
    </div>`;
    wireBackLink();

    const nextBtn = document.getElementById('next-chapter');
    if (nextBtn) nextBtn.addEventListener('click', () => go('read', { chapterId: r.nextChapter.id }));
  }

  /* ── View: SEARCH (lintas kategori) ───────────────────── */
  async function renderSearch(payload, token) {
    const q = payload.q || '';
    appEl.innerHTML = loadingHTML(`Mencari "${q}"...`);
    if (!q) { appEl.innerHTML = `<div class="wrap">${backLinkHTML()}${stateBoxHTML({ title: 'Kata kunci kosong' })}</div>`; wireBackLink(); return; }

    const [animeR, dramaR, donghuaR, mangaR, cubmuR] = await Promise.allSettled([
      ADAPTERS.anime.search(q, 1),
      ADAPTERS.drama.search(q, 1),
      ADAPTERS.donghua.search(q, 1),
      ADAPTERS.manga.search(q),
      api.cubmu.search(q)
    ]);
    if (token !== renderToken) return;

    const groups = [];
    if (animeR.status === 'fulfilled' && animeR.value.length) groups.push({ title: 'Anime', items: animeR.value });
    if (dramaR.status === 'fulfilled' && dramaR.value.length) groups.push({ title: 'Drama Asia', items: dramaR.value });
    if (donghuaR.status === 'fulfilled' && donghuaR.value.length) groups.push({ title: 'Donghua', items: donghuaR.value });
    if (mangaR.status === 'fulfilled' && mangaR.value.length) groups.push({ title: 'Komik', items: mangaR.value });
    if (cubmuR.status === 'fulfilled') {
      const cv = cubmuR.value;
      if (cv.vods?.length) groups.push({ title: 'Film & Series', items: normalize.vod(cv.vods) });
      if (cv.channels?.length) groups.push({ title: 'Live TV', items: normalize.channel(cv.channels) });
    }

    appEl.innerHTML = `<div class="wrap">
      ${backLinkHTML()}
      <h2 class="section-heading">Hasil Pencarian — "${escapeHtml(q)}"</h2>
      ${groups.length ? groups.map((g) => `<div class="search-group"><div class="search-group-title">${escapeHtml(g.title)}</div><div class="row-scroll">${g.items.map(cardHTML).join('')}</div></div>`).join('') : stateBoxHTML({ title: 'Tidak ditemukan', desc: `Tidak ada hasil untuk "${q}" di semua kategori.` })}
    </div>`;
    wireBackLink();
    bindGridClicks(appEl);
  }

  /* ── Event wiring ──────────────────────────────────────── */
  function getSearchTargetCat() {
    const r = currentRoute;
    if (r && ['browse', 'detail', 'watch'].includes(r.view) && r.payload.cat && ['anime', 'drama', 'donghua', 'manga', 'vod'].includes(r.payload.cat)) {
      return r.payload.cat;
    }
    return null;
  }

  searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = searchInput.value.trim();
    if (!q) return;
    const cat = getSearchTargetCat();
    if (cat) go('browse', { cat, query: q, page: 1 });
    else go('search', { q });
    searchInput.blur();
  });

  themeToggle.addEventListener('click', toggleTheme);
  brandHome.addEventListener('click', () => go('home', {}));
  brandHome.addEventListener('keypress', (e) => { if (e.key === 'Enter') go('home', {}); });

  pillStrip.addEventListener('click', (e) => {
    const btn = e.target.closest('.pill');
    if (!btn) return;
    const cat = btn.dataset.cat || '';
    if (!cat) go('home', {});
    else go('browse', { cat, page: 1 });
  });

  window.addEventListener('hashchange', renderRoute);

  window.addEventListener('error', () => { /* dicegah bocor ke UI; biarkan render berikutnya pulih */ });
  window.addEventListener('unhandledrejection', () => { /* idem */ });

  /* ── Init ──────────────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    renderRoute();
  });
})();
