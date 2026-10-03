// params : ?url=https://samehadaku.li/otome-game-sekai-wa-mob-ni-kibishii-sekai-desu-2-episode-12-subtitle-indonesia/

const axios = require('axios');
const cheerio = require('cheerio');

module.exports = {
  category: 'Anime',
  params: ['url'],
  'desc-url': 'URL episode anime di Samehadaku',
  desc: 'Mendapatkan link streaming iframe embed dan link download (termasuk Gofile) dari episode Samehadaku',

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
      url = `https://samehadaku.li/${url}/`;
    }

    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://samehadaku.li/'
        },
        timeout: 15000
      });

      const $ = cheerio.load(response.data);
      const title = $('h1.entry-title').text().trim();

      if (!title) {
        return res.status(404).json({
          status: false,
          creator: '@hidz',
          message: 'Halaman episode tidak ditemukan'
        });
      }

      // Default Iframe Player
      const defaultIframeEl = $('#pembed iframe, .player-embed iframe').first();
      let defaultIframeSrc = defaultIframeEl.attr('data-litespeed-src') || defaultIframeEl.attr('data-src') || defaultIframeEl.attr('src') || '';
      if (defaultIframeSrc === 'about:blank') {
        defaultIframeSrc = defaultIframeEl.attr('data-litespeed-src') || defaultIframeEl.attr('data-src') || '';
      }

      // Mirror / Server Streams
      const streams = [];
      if (defaultIframeSrc) {
        streams.push({
          server: 'Default Server',
          iframe: defaultIframeSrc
        });
      }

      $('select.mirror option, .server option, .mirror option').each((i, el) => {
        const serverName = $(el).text().trim();
        const rawVal = $(el).attr('value') || '';
        if (rawVal && rawVal.length > 10) {
          try {
            const decoded = Buffer.from(rawVal, 'base64').toString('utf-8');
            const match = decoded.match(/src=["']([^"']+)["']/i);
            const iframeUrl = match ? match[1] : decoded;
            if (iframeUrl && !streams.some((s) => s.iframe === iframeUrl)) {
              streams.push({
                server: serverName || `Server ${i}`,
                iframe: iframeUrl
              });
            }
          } catch (e) {
            // ignore malformed base64
          }
        }
      });

      // Downloads (termasuk Gofile)
      const downloads = [];
      $('.soraddlx, .download-eps li').each((i, el) => {
        const format = $(el).find('.sorattlx h3, strong').first().text().trim();
        const links = [];

        $(el).find('a').each((j, a) => {
          const source = $(a).text().trim() || 'Link';
          const href = $(a).attr('href') || '';
          if (href && href !== '#') {
            links.push({
              source,
              url: href
            });
          }
        });

        if (links.length > 0) {
          downloads.push({
            quality: format || 'Download',
            links
          });
        }
      });

      // Navigation
      const prev = $('.naveps .nvs a[href*="episode"]').first().attr('href') || null;
      const next = $('.naveps .nvs.nvsl a[href*="episode"]').attr('href') || null;
      const allEpisodes = $('.naveps .nvs a[href*="/anime/"]').attr('href') || null;

      return res.json({
        status: true,
        creator: '@hidz',
        result: {
          title,
          streams,
          downloads,
          navigation: {
            prev,
            next,
            allEpisodes
          }
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
