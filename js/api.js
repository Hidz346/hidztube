/* ============================================================
   HIDZTUBE — API LAYER
   Wrapper fetch ke backend /api/* + normalisasi data per kategori.
   Semua fungsi di sini melempar Error(message) yang sudah ramah
   ditampilkan ke user kalau terjadi kegagalan.
============================================================ */
(function (global) {
  'use strict';

  const API_BASE = '/api';

  function buildQuery(params) {
    if (!params) return '';
    const usp = new URLSearchParams();
    Object.keys(params).forEach((k) => {
      const v = params[k];
      if (v !== undefined && v !== null && v !== '') usp.set(k, v);
    });
    const qs = usp.toString();
    return qs ? `?${qs}` : '';
  }

  async function apiGet(path, params) {
    const url = `${API_BASE}${path}${buildQuery(params)}`;
    let response;
    try {
      response = await fetch(url, { headers: { Accept: 'application/json' } });
    } catch (networkErr) {
      throw new Error('Tidak bisa terhubung ke server. Periksa koneksi internet kamu.');
    }

    let payload = null;
    try {
      payload = await response.json();
    } catch (parseErr) {
      throw new Error('Server mengirim respons yang tidak terbaca.');
    }

    if (!response.ok || payload?.status === false) {
      throw new Error(payload?.message || `Gagal memuat data (status ${response.status}).`);
    }

    return payload.result;
  }

  /* ── Raw endpoint calls ── */
  const raw = {
    anime: {
      latest: (page) => apiGet('/anime/latest', { page }),
      search: (query, page) => apiGet('/anime/search', { query, page }),
      detail: (url) => apiGet('/anime/detail', { url }),
      stream: (url) => apiGet('/anime/stream', { url })
    },
    drama: {
      latest: (page) => apiGet('/drama/latest', { page }),
      search: (query, page) => apiGet('/drama/search', { query, page }),
      detail: (slug) => apiGet('/drama/detail', { slug }),
      stream: (slug, episode, server) => apiGet('/drama/stream', { slug, episode, server })
    },
    donghua: {
      latest: (page) => apiGet('/donghua/latest', { page }),
      search: (query, page) => apiGet('/donghua/search', { query, page }),
      detail: (url) => apiGet('/donghua/detail', { url }),
      stream: (url) => apiGet('/donghua/stream', { url })
    },
    manga: {
      home: () => apiGet('/manga/home'),
      search: (query) => apiGet('/manga/search', { query }),
      detail: (id) => apiGet('/manga/detail', { id }),
      read: (chapterId) => apiGet('/manga/read', { chapterId }),
      imageUrl: (pageUrl, key, iv) => `${API_BASE}/manga/image${buildQuery({ url: pageUrl, key, iv })}`
    },
    livetv: {
      list: () => apiGet('/livetv/list'),
      stream: (channel) => apiGet('/livetv/stream', { channel })
    },
    vod: {
      list: (page) => apiGet('/vod/list', { page }),
      detail: (slug) => apiGet('/vod/detail', { slug }),
      stream: (slug) => apiGet('/vod/stream', { slug })
    },
    cubmu: {
      search: (query) => apiGet('/cubmu/search', { query })
    }
  };

  /* ── Normalizer: ubah berbagai bentuk response jadi kartu seragam ──
     { cat, key, title, thumb, sub, tag } */
  function normList(cat, items, mapFn) {
    return (items || []).map(mapFn).filter((it) => it && it.key && it.title);
  }

  const normalize = {
    anime(items) {
      return normList('anime', items, (it) => ({
        cat: 'anime',
        key: it.url,
        title: it.title,
        thumb: it.thumbnail,
        sub: it.status || it.type || '',
        tag: it.episode || null
      }));
    },
    donghua(items) {
      return normList('donghua', items, (it) => ({
        cat: 'donghua',
        key: it.url,
        title: it.title,
        thumb: it.thumbnail,
        sub: it.status || it.type || '',
        tag: it.episode || null
      }));
    },
    drama(items) {
      return normList('drama', items, (it) => ({
        cat: 'drama',
        key: it.slug || it.url,
        title: it.title,
        thumb: it.thumbnail,
        sub: 'Drama Asia',
        tag: null
      }));
    },
    vod(contents) {
      return normList('vod', contents, (it) => ({
        cat: 'vod',
        key: it.slug,
        title: it.title,
        thumb: it.posterPortrait || it.posterLandscape,
        sub: it.type || 'VOD',
        tag: null
      }));
    },
    channel(channels) {
      return normList('livetv', channels, (it) => ({
        cat: 'livetv',
        key: it.slug,
        title: it.name,
        thumb: it.image || it.ottImage,
        sub: it.number ? `CH ${it.number}` : 'Live TV',
        tag: null
      }));
    },
    manga(items) {
      return normList('manga', items, (it) => ({
        cat: 'manga',
        key: String(it.id),
        title: it.title || it.titleName,
        thumb: it.thumbnail,
        sub: it.lastUpdated || 'Komik',
        tag: null
      }));
    }
  };

  const CAT_LABEL = {
    anime: 'Anime',
    drama: 'Drama Asia',
    donghua: 'Donghua',
    vod: 'Film / Series',
    livetv: 'Live TV',
    manga: 'Komik'
  };

  global.HT = global.HT || {};
  global.HT.api = raw;
  global.HT.normalize = normalize;
  global.HT.CAT_LABEL = CAT_LABEL;
})(window);
