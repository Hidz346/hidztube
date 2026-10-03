// params : ?slug=the-scandal-2026&episode=1&server=lite

const axios = require('axios');
const cheerio = require('cheerio');

module.exports = {
  category: 'Drakor',
  params: ['slug', 'episode', 'server'],
  'desc-slug': 'Slug drama di Drakor.id (contoh: the-scandal-2026)',
  'desc-episode': 'Nomor episode (contoh: 1)',
  'desc-server': 'Pilihan server streaming: lite, fast, atau max (opsional, default: lite)',
  desc: 'Mendapatkan direct stream HLS (.m3u8), player iframe, dan direct download MP4 episode Drakor.id',

  async run(req, res) {
    let slug = String(req.query.slug || req.body.slug || '').trim();
    const episode = parseInt(req.query.episode || req.body.episode || '1', 10) || 1;
    const server = String(req.query.server || req.body.server || 'lite').trim().toLowerCase();

    if (!slug) {
      return res.status(400).json({
        status: false,
        creator: '@hidz',
        message: 'Parameter slug diperlukan'
      });
    }

    if (slug.includes('/nonton/')) {
      const match = slug.match(/\/nonton\/([^/]+)/);
      if (match) slug = match[1];
    }

    const watchUrl = `https://drakorid.co/watch-${server}/${slug}/${episode}`;
    const downloadUrl = `https://drakorid.co/download-${server}/${slug}/${episode}`;

    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      Referer: `https://drakorid.co/nonton/${slug}/`
    };

    try {
      // 1. Fetch Watch Page for HLS & Player
      const watchRes = await axios.get(watchUrl, { headers, timeout: 15000 });
      const $watch = cheerio.load(watchRes.data);
      const title = $watch('title').text().replace(/-\s*Drakor\.id.*$/i, '').trim();

      const hlsStreams = [];
      let playerIframe = null;
      let coverImage = null;

      $watch('iframe').each((i, el) => {
        const src = $watch(el).attr('src') || '';
        if (src.includes('player/bunny.php') || src.includes('player/')) {
          if (!playerIframe) playerIframe = src;

          try {
            const parsedUrl = new URL(src);
            const vParam = parsedUrl.searchParams.get('v');
            const cParam = parsedUrl.searchParams.get('c');

            if (cParam && !coverImage) {
              coverImage = Buffer.from(cParam, 'base64').toString('utf-8');
            }

            if (vParam) {
              const decodedStream = Buffer.from(vParam, 'base64').toString('utf-8');
              const quality = decodedStream.includes('/480p/') ? '480p' : (decodedStream.includes('/files/') ? '720p' : `stream_${i + 1}`);

              if (!hlsStreams.some((s) => s.url === decodedStream)) {
                hlsStreams.push({
                  quality,
                  url: decodedStream
                });
              }
            }
          } catch (e) {
            // ignore parse error
          }
        }
      });

      // 2. Fetch Download Page for Direct MP4 Downloads
      const downloads = [];
      try {
        const dlRes = await axios.get(downloadUrl, { headers, timeout: 10000 });
        const $dl = cheerio.load(dlRes.data);

        $dl('a[href*="/download/"]').each((i, el) => {
          const dlText = $dl(el).text().trim();
          const dlHref = $dl(el).attr('href') || '';

          if (dlHref && dlText) {
            downloads.push({
              title: dlText,
              url: dlHref
            });
          }
        });
      } catch (dlErr) {
        // Download page fetch failed, proceed with stream links
      }

      return res.json({
        status: true,
        creator: '@hidz',
        result: {
          title,
          slug,
          episode,
          server,
          coverImage,
          playerIframe,
          hlsStreams,
          downloads
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
