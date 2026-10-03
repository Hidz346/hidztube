// params : ?url=https://anichin.ro/renegade-immortal/

const axios = require('axios');
const cheerio = require('cheerio');

module.exports = {
  category: 'Donghua',
  params: ['url'],
  'desc-url': 'URL donghua di Anichin atau slug donghua',
  desc: 'Mendapatkan informasi detail donghua, sinopsis, dan daftar episode lengkap dari Anichin',

  async run(req, res) {
    let url = String(req.query.url || req.body.url || '').trim();

    if (!url) {
      return res.status(400).json({
        status: false,
        creator: '@hidz',
        message: 'Parameter url diperlukan'
      });
    }

    if (!url.startsWith('http')) {
      url = url.replace(/^\/+|\/+$/g, '');
      url = `https://anichin.ro/${url}/`;
    }

    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Referer': 'https://anichin.ro/'
        },
        timeout: 15000
      });

      const $ = cheerio.load(response.data);
      const title = $('h1.entry-title, h1').first().text().trim();

      if (!title) {
        return res.status(404).json({
          status: false,
          creator: '@hidz',
          message: 'Donghua tidak ditemukan'
        });
      }

      const thumbnail = $('.thumb img').attr('data-src') || $('.thumb img').attr('src') || '';
      const synopsis = $('.entry-content, .desc, .synopsis').first().text().trim();

      const info = {};
      $('.spe span').each((i, el) => {
        const text = $(el).text().trim();
        const parts = text.split(':');
        if (parts.length >= 2) {
          const key = parts[0].trim().toLowerCase().replace(/\s+/g, '_');
          const val = parts.slice(1).join(':').trim();
          info[key] = val;
        }
      });

      const genres = [];
      $('.genxed a, .genre-info a').each((i, el) => {
        const g = $(el).text().trim();
        if (g) genres.push(g);
      });

      const episodes = [];
      // Support both Anichin styles: .episodes-ul or .eplister
      if ($('.episodes-ul a, .block_area-content a[href*="episode"]').length > 0) {
        $('.episodes-ul a, .block_area-content a[href*="episode"]').each((i, el) => {
          const epText = $(el).text().trim();
          const epLink = $(el).attr('href') || '';
          if (epLink && !episodes.some((e) => e.url === epLink)) {
            episodes.push({
              episode: epText || String(i + 1),
              title: `Episode ${epText}`,
              url: epLink
            });
          }
        });
      } else {
        $('.eplister ul li').each((i, el) => {
          const epNum = $(el).find('.epl-num').text().trim();
          const epTitle = $(el).find('.epl-title').text().trim();
          const epDate = $(el).find('.epl-date').text().trim();
          const epLink = $(el).find('a').attr('href') || '';

          if (epLink) {
            episodes.push({
              episode: epNum || null,
              title: epTitle || `Episode ${epNum}`,
              date: epDate || null,
              url: epLink
            });
          }
        });
      }

      return res.json({
        status: true,
        creator: '@hidz',
        result: {
          title,
          thumbnail: thumbnail || null,
          synopsis: synopsis || null,
          info,
          genres,
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
