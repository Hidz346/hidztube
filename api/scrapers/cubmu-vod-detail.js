// params : ?slug=1091-the-transmart

const axios = require('axios');
const cheerio = require('cheerio');

module.exports = {
  category: 'CubMu',
  params: ['slug'],
  'desc-slug': 'Slug film atau serial VOD di CubMu (contoh: 1091-the-transmart atau 742-tonbo)',
  desc: 'Mendapatkan informasi detail film / serial VOD dan daftar episode lengkap dari CubMu',

  async run(req, res) {
    let slug = String(req.query.slug || req.body.slug || '').trim();

    if (!slug) {
      return res.status(400).json({
        status: false,
        creator: '@hidz',
        message: 'Parameter slug diperlukan'
      });
    }

    if (slug.includes('/movie/')) {
      const match = slug.match(/\/movie\/(?:series\/)?([^/?#]+)/);
      if (match) slug = match[1];
    }

    try {
      // Try series first, fallback to movie
      let pageUrl = `https://www.cubmu.com/movie/series/${slug}`;
      let pageRes;
      try {
        pageRes = await axios.get(pageUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
          },
          timeout: 15000
        });
      } catch (err) {
        pageUrl = `https://www.cubmu.com/movie/${slug}`;
        pageRes = await axios.get(pageUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
          },
          timeout: 15000
        });
      }

      const $ = cheerio.load(pageRes.data);
      const nextDataRaw = $('#__NEXT_DATA__').html();

      if (!nextDataRaw) {
        return res.status(500).json({
          status: false,
          creator: '@hidz',
          message: 'Gagal mengekstrak data Next.js dari CubMu'
        });
      }

      const parsed = JSON.parse(nextDataRaw);
      const detail = parsed?.props?.pageProps?.detailMovie;

      if (!detail) {
        return res.status(404).json({
          status: false,
          creator: '@hidz',
          message: 'Detail VOD tidak ditemukan di CubMu'
        });
      }

      const rawLibraries = detail.product_library || detail.product_libraries || [];
      const episodes = rawLibraries.map((ep) => ({
        episodeNo: ep.episode_no || '1',
        title: ep.episode_name || ep.title || `Episode ${ep.episode_no}`,
        durationSeconds: ep.duration || 0,
        synopsis: ep.indonesia_synopsis || ep.second_language_synopsis || null,
        posterLandscape: ep.poster_horizontal || null,
        posterPortrait: ep.poster_vertical || null,
        watchSlug: ep.meta?.slug_watch_url || null,
        productId: ep.product_id,
        libraryProductId: ep.library_product_id
      }));

      // In case of single movie (no product_library), use product_library_detail
      if (episodes.length === 0 && detail.product_library_detail) {
        const single = detail.product_library_detail;
        episodes.push({
          episodeNo: single.episode_no || '1',
          title: single.episode_name || detail.product_name,
          durationSeconds: single.duration || 0,
          synopsis: single.indonesia_synopsis || single.second_language_synopsis || null,
          posterLandscape: single.poster_horizontal || null,
          posterPortrait: single.poster_vertical || null,
          watchSlug: single.meta?.slug_watch_url || null,
          productId: single.product_id,
          libraryProductId: single.library_product_id
        });
      }

      return res.json({
        status: true,
        creator: '@hidz',
        result: {
          productId: detail.product_id,
          title: detail.product_name,
          vodType: detail.vod_type,
          genre: detail.genre_name,
          studio: detail.studio_name,
          posterLandscape: detail.product_poster || null,
          posterPortrait: detail.product_poster_potrait || null,
          totalEpisodes: episodes.length,
          episodes
        }
      });
    } catch (err) {
      return res.status(500).json({
        status: false,
        creator: '@hidz',
        message: err.message
      });
    }
  }
};
