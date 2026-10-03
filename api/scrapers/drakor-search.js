// params : ?query=love&page=1

const axios = require('axios');
const cheerio = require('cheerio');

module.exports = {
  category: 'Drakor',
  params: ['query', 'page'],
  'desc-query': 'Kata kunci pencarian drama',
  'desc-page': 'Nomor halaman (opsional, default: 1)',
  desc: 'Mencari drama korea / asia berdasarkan judul di Drakor.id',

  async run(req, res) {
    const query = String(req.query.query || req.body.query || '').trim();
    const page = parseInt(req.query.page || req.body.page || '1', 10) || 1;

    if (!query) {
      return res.status(400).json({
        status: false,
        creator: '@hidz',
        message: 'Parameter query diperlukan'
      });
    }

    try {
      const targetUrl = page > 1
        ? `https://drakorid.co/cari.html?q=${encodeURIComponent(query)}&page=${page}`
        : `https://drakorid.co/cari.html?q=${encodeURIComponent(query)}`;

      const response = await axios.get(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Referer': 'https://drakorid.co/'
        },
        timeout: 15000
      });

      const $ = cheerio.load(response.data);
      const items = [];

      $('.movie-list-card, a[href*="/nonton/"]').each((i, el) => {
        const link = $(el).find('a[href*="/nonton/"]').attr('href') || $(el).attr('href') || '';
        const imgEl = $(el).find('img').first();
        const thumb = imgEl.attr('src') || imgEl.attr('data-src') || '';
        const title = imgEl.attr('alt') || $(el).find('.movie-list-card__title').attr('data-original-title') || $(el).find('.movie-list-card__title').text().trim() || '';

        if (link && link.includes('/nonton/') && title) {
          const match = link.match(/\/nonton\/([^/]+)/);
          const slug = match ? match[1] : '';

          if (!items.some((it) => it.url === link)) {
            items.push({
              title,
              slug,
              thumbnail: thumb || null,
              url: link
            });
          }
        }
      });

      return res.json({
        status: true,
        creator: '@hidz',
        result: {
          query,
          page,
          total: items.length,
          data: items
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
