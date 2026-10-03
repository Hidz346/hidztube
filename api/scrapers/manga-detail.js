// params : ?id=142

const axios = require('axios');
const cheerio = require('cheerio');

module.exports = {
  category: 'Manga',
  params: ['id'],
  'desc-id': 'ID manga atau URL manga di Manga UP (contoh: 142 atau https://global.manga-up.com/manga/142)',
  desc: 'Mendapatkan detail informasi manga dan daftar chapter dari Manga UP',

  async run(req, res) {
    let id = String(req.query.id || req.body.id || '').trim();

    if (!id) {
      return res.status(400).json({
        status: false,
        creator: '@hidz',
        message: 'Parameter id diperlukan'
      });
    }

    if (id.includes('/manga/')) {
      const match = id.match(/\/manga\/(\d+)/);
      if (match) id = match[1];
    }

    try {
      const response = await axios.get(`https://global.manga-up.com/manga/${id}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        timeout: 15000
      });

      const $ = cheerio.load(response.data);
      const nextDataRaw = $('#__NEXT_DATA__').html();

      if (!nextDataRaw) {
        return res.status(500).json({
          status: false,
          creator: '@hidz',
          message: 'Gagal mengekstrak data Next.js dari Manga UP'
        });
      }

      const parsedNext = JSON.parse(nextDataRaw);
      const data = parsedNext?.props?.pageProps?.data;

      if (!data) {
        return res.status(404).json({
          status: false,
          creator: '@hidz',
          message: 'Manga tidak ditemukan'
        });
      }

      const imgBase = 'https://global-api.manga-up.com';

      const chapters = (data.chapters || []).map((ch) => {
        const isFree = ch.consumptionType === 3 || ch.price === null || ch.price === 0;
        return {
          id: ch.id,
          title: ch.subName ? `${ch.mainName} - ${ch.subName}` : ch.mainName,
          mainName: ch.mainName,
          subName: ch.subName || null,
          thumbnail: ch.imageUrl ? (ch.imageUrl.startsWith('http') ? ch.imageUrl : imgBase + ch.imageUrl) : null,
          firstPageImageUrl: ch.firstPageImageUrl ? (ch.firstPageImageUrl.startsWith('http') ? ch.firstPageImageUrl : imgBase + ch.firstPageImageUrl) : null,
          isFree,
          price: ch.price || 0,
          badge: ch.badge || 0
        };
      });

      return res.json({
        status: true,
        creator: '@hidz',
        result: {
          id: Number(id),
          title: data.titleName,
          author: data.authorName || null,
          description: data.description || '',
          thumbnail: data.imageUrl ? (data.imageUrl.startsWith('http') ? data.imageUrl : imgBase + data.imageUrl) : null,
          tags: (data.tags || []).map((t) => t.name || t),
          nextUpdate: data.nextUpdateInfo || null,
          copyright: data.copyright || null,
          totalChapters: chapters.length,
          chapters
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
