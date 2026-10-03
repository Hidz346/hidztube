// params : ?query=naruto&page=1

const axios = require('axios');
const cheerio = require('cheerio');

module.exports = {
  category: 'Anime',
  params: ['query', 'page'],
  'desc-query': 'Kata kunci pencarian anime',
  'desc-page': 'Nomor halaman (opsional, default: 1)',
  desc: 'Mencari anime berdasarkan judul di Samehadaku',

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
        ? `https://samehadaku.li/page/${page}/?s=${encodeURIComponent(query)}`
        : `https://samehadaku.li/?s=${encodeURIComponent(query)}`;

      const response = await axios.get(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Referer': 'https://samehadaku.li/'
        },
        timeout: 15000
      });

      const $ = cheerio.load(response.data);
      const items = [];

      $('.listupd article, .animepost, .bsx').each((i, el) => {
        const link = $(el).find('a').first().attr('href') || '';
        const title = $(el).find('.title, h2, .tt h2').first().text().trim() || $(el).find('a').first().attr('title') || '';
        const thumb = $(el).find('img').attr('data-src') || $(el).find('img').attr('src') || '';
        const type = $(el).find('.typez').text().trim();
        const status = $(el).find('.status').text().trim();

        if (title && link) {
          items.push({
            title,
            thumbnail: thumb || null,
            type: type || null,
            status: status || null,
            url: link
          });
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
