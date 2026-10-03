// params : ?page=1

const axios = require('axios');
const cheerio = require('cheerio');

module.exports = {
  category: 'Drakor',
  params: ['page'],
  'desc-page': 'Nomor halaman (opsional, default: 1)',
  desc: 'Mendapatkan daftar drama korea / drama asia terbaru dari Drakor.id',

  async run(req, res) {
    const page = parseInt(req.query.page || req.body.page || '1', 10) || 1;
    const targetUrl = `https://drakorid.co/list/${page}`;

    try {
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

      $('.movie-list-card, .col-6.col-md-3.col-lg-2').each((i, el) => {
        const linkEl = $(el).find('a[href*="/nonton/"]').first();
        const rawLink = linkEl.attr('href') || '';
        const imgEl = $(el).find('img.movie-list-card__img, img').first();
        const thumb = imgEl.attr('src') || imgEl.attr('data-src') || '';
        const title = imgEl.attr('alt') || $(el).find('.movie-list-card__title').attr('data-original-title') || $(el).find('.movie-list-card__title').text().trim() || '';

        if (rawLink && title) {
          const match = rawLink.match(/\/nonton\/([^/]+)/);
          const slug = match ? match[1] : '';

          if (!items.some((it) => it.url === rawLink)) {
            items.push({
              title,
              slug,
              thumbnail: thumb || null,
              url: rawLink
            });
          }
        }
      });

      return res.json({
        status: true,
        creator: '@hidz',
        result: {
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
