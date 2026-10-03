// params : ?url=https://anichin.ro/renegade-immortal-episode-158-subtitle-indonesia/

const axios = require('axios');
const cheerio = require('cheerio');

module.exports = {
  category: 'Donghua',
  params: ['url'],
  'desc-url': 'URL episode donghua di Anichin',
  desc: 'Mendapatkan link streaming iframe player dan direct video link (1080p, 720p, 480p, m3u8) via ekstraksi OK.ru dari episode Anichin',

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
          'Referer': 'https://anichin.ro/'
        },
        timeout: 15000
      });

      const $ = cheerio.load(response.data);
      const title = $('h1.entry-title').text().trim();

      if (!title) {
        return res.status(404).json({
          status: false,
          creator: '@hidz',
          message: 'Halaman episode donghua tidak ditemukan'
        });
      }

      // Collect all available servers
      const servers = [];
      let okruUrl = null;

      // Check direct iframes in page
      $('iframe').each((i, el) => {
        const src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-litespeed-src') || '';
        if (src && !src.includes('about:blank')) {
          servers.push({
            name: 'Default Player',
            iframe: src
          });
          if (src.includes('ok.ru/videoembed/')) {
            const idMatch = src.match(/videoembed\/(\d+)/);
            if (idMatch) okruUrl = `https://ok.ru/video/${idMatch[1]}`;
          }
        }
      });

      // Check server tabs (.server-item a[data-hash])
      $('.server-item a, ul.mirror li a').each((i, el) => {
        const serverName = $(el).text().trim() || `Server ${i + 1}`;
        const dataHash = $(el).attr('data-hash') || $(el).attr('data-video') || '';

        if (dataHash) {
          try {
            let decoded = dataHash;
            if (/^[A-Za-z0-9+/=]+$/.test(dataHash) && dataHash.length > 20) {
              decoded = Buffer.from(dataHash, 'base64').toString('utf-8');
            }
            const match = decoded.match(/src=["']([^"']+)["']/i);
            const iframeUrl = match ? match[1] : (decoded.startsWith('http') ? decoded : null);

            if (iframeUrl) {
              if (!servers.some((s) => s.iframe === iframeUrl)) {
                servers.push({
                  name: serverName,
                  iframe: iframeUrl
                });
              }
              if (iframeUrl.includes('ok.ru/videoembed/')) {
                const idMatch = iframeUrl.match(/videoembed\/(\d+)/);
                if (idMatch) okruUrl = `https://ok.ru/video/${idMatch[1]}`;
              }
            }
          } catch (e) {
            // ignore error
          }
        }
      });

      // Extract direct video via OK.ru extractor API
      let okruData = null;
      if (okruUrl) {
        try {
          const extractRes = await axios.post(
            'https://okrufunction7.vercel.app/api/extract',
            { url: okruUrl },
            {
              headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
              },
              timeout: 10000
            }
          );
          if (extractRes.data && extractRes.data.success) {
            okruData = extractRes.data;
          }
        } catch (extractErr) {
          // extractor timed out or failed, fallback to iframe
        }
      }

      // Navigation
      const prev = $('.naveps .nvs a[href*="episode"]').first().attr('href') || null;
      const next = $('.naveps .nvs.nvsl a[href*="episode"]').attr('href') || null;
      const allEpisodes = $('.naveps .nvs a[href*="/donghua/"], .naveps .nvs a:not([href*="episode"])').attr('href') || null;

      return res.json({
        status: true,
        creator: '@hidz',
        result: {
          title,
          okruUrl,
          directVideo: okruData ? {
            mediaUrl: okruData.mediaUrl,
            mediaType: okruData.mediaType,
            title: okruData.title,
            duration: okruData.duration,
            videoUrls: okruData.videoUrls,
            metadata: okruData.metadata
          } : null,
          servers,
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
