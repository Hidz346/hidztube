// params : ?slug=the-scandal-2026

const axios = require('axios');
const cheerio = require('cheerio');

module.exports = {
  category: 'Drakor',
  params: ['slug'],
  'desc-slug': 'Slug atau URL drama di Drakor.id (contoh: the-scandal-2026 atau https://drakorid.co/nonton/the-scandal-2026/)',
  desc: 'Mendapatkan detail drama korea, sinopsis, info lengkap, dan daftar episode dari Drakor.id',

  async run(req, res) {
    let slug = String(req.query.slug || req.body.slug || '').trim();

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
    } else if (slug.startsWith('http')) {
      const parts = slug.replace(/\/+$/, '').split('/');
      slug = parts[parts.length - 1];
    }

    const targetUrl = `https://drakorid.co/nonton/${slug}/`;

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
      const rawTitle = $('title').text().replace(/-\s*Drakor\.id.*$/i, '').trim();

      if (!rawTitle) {
        return res.status(404).json({
          status: false,
          creator: '@hidz',
          message: 'Drama tidak ditemukan'
        });
      }

      // Thumbnail
      const thumb = $('meta[property="og:image"]').attr('content') ||
        $('img.movie-detail-card__img, .movie-cover img, img[alt*="Poster"]').first().attr('src') ||
        $('img').first().attr('src') || null;

      // Details block & Synopsis
      const bodyText = response.data;
      let synopsis = '';
      const sinopsisMatch = bodyText.match(/Sinopsis\s*<\/h\d+>\s*<p[^>]*>([\s\S]*?)<\/p>/i) ||
        bodyText.match(/Sinopsis[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i);
      if (sinopsisMatch) {
        synopsis = cheerio.load(sinopsisMatch[1]).text().trim();
      }

      // Extract details metadata
      const details = {};
      const detailRegex = /([A-Za-z ]+):\s*([^<\n\r]+)/g;
      const detailSection = bodyText.match(/Details[\s\S]*?(?=Sinopsis|<\/div>)/i);
      if (detailSection) {
        let m;
        while ((m = detailRegex.exec(detailSection[0])) !== null) {
          const key = m[1].trim().toLowerCase().replace(/\s+/g, '_');
          const val = m[2].trim();
          if (val && !key.includes('class') && !key.includes('style')) {
            details[key] = val;
          }
        }
      }

      // Episodes list from modalPilihEpisode
      const episodes = [];
      $('#modalPilihEpisode .episode-pick-num').each((i, el) => {
        const epNum = $(el).attr('data-episode') || String(i + 1);
        const epLabel = $(el).attr('data-ep-label') || `Episode ${epNum}`;
        const isEnd = $(el).hasClass('is-end') || epLabel.toLowerCase().includes('end');

        episodes.push({
          episode: parseInt(epNum, 10) || i + 1,
          label: epLabel,
          isEnd,
          watchUrl: `https://drakorid.co/watch-lite/${slug}/${epNum}`,
          downloadUrl: `https://drakorid.co/download-lite/${slug}/${epNum}`
        });
      });

      return res.json({
        status: true,
        creator: '@hidz',
        result: {
          title: rawTitle,
          slug,
          thumbnail: thumb,
          synopsis: synopsis || null,
          details,
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
