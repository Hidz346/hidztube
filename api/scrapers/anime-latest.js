// params : ?page=1

const axios = require('axios');
const cheerio = require('cheerio');

module.exports = {
  category: 'Anime',
  params: ['page'],
  'desc-page': 'Nomor halaman (opsional, default: 1)',
  desc: 'Mendapatkan episode anime terbaru yang rilis dari Samehadaku',

  async run(req, res) {
    const page = parseInt(req.query.page || req.body.page || '1', 10) || 1;
    const targetUrl = page > 1 ? `https://samehadaku.li/page/${page}/` : 'https://samehadaku.li/';

    try {
      const response = await axios.get(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://samehadaku.li/'
        },
        timeout: 15000
      });

      const $ = cheerio.load(response.data);
      const items = [];

      $('.bixbox').first().find('article, .animpost').each((i, el) => {
        const link = $(el).find('a').first().attr('href') || '';
        const title = $(el).find('.tt h2, .entry-title, .title').text().trim() || $(el).find('a').attr('title') || '';
        const ep = $(el).find('.epx').text().trim();
        const type = $(el).find('.typez').text().trim();
        const status = $(el).find('.status').text().trim();
        const thumb = $(el).find('img').attr('data-src') || $(el).find('img').attr('src') || '';

        if (title && link) {
          items.push({
            title,
            episode: ep || null,
            type: type || null,
            status: status || null,
            thumbnail: thumb || null,
            url: link
          });
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
