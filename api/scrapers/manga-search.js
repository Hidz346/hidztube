// params : ?query=contoh

const axios = require('axios');
const { parseProto } = require('./_manga_proto');

module.exports = {
  category: 'Manga',
  params: ['query'],
  'desc-query': 'Kata kunci pencarian manga',
  desc: 'Mencari manga berdasarkan judul di Manga UP',

  async run(req, res) {
    const query = String(req.query.query || req.body.query || '').trim();

    if (!query) {
      return res.status(400).json({
        status: false,
        creator: '@hidz',
        message: 'Parameter query diperlukan'
      });
    }

    try {
      const response = await axios.get('https://global-api.manga-up.com/api/manga/search', {
        params: {
          word: query,
          lang: 'en'
        },
        responseType: 'arraybuffer',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Origin': 'https://global.manga-up.com',
          'Referer': 'https://global.manga-up.com/'
        },
        timeout: 15000
      });

      const buffer = Buffer.from(response.data);
      const parsed = parseProto(buffer);
      const rawTitles = parsed[1] || [];
      const imgBase = 'https://global-api.manga-up.com';

      const results = rawTitles.map((item) => {
        const sub = parseProto(item.val);
        const titleId = sub[1]?.[0]?.val;
        const titleName = sub[2]?.[0]?.val ? Buffer.from(sub[2][0].val).toString('utf-8') : '';
        const imgPath = sub[3]?.[0]?.val ? Buffer.from(sub[3][0].val).toString('utf-8') : '';
        const lastUpdated = sub[9]?.[0]?.val ? Buffer.from(sub[9][0].val).toString('utf-8') : '';
        const bookmarks = sub[7]?.[0]?.val || 0;

        return {
          id: titleId,
          title: titleName,
          thumbnail: imgPath ? (imgPath.startsWith('http') ? imgPath : imgBase + imgPath) : null,
          lastUpdated: lastUpdated || null,
          bookmarks: bookmarks
        };
      }).filter((t) => t.id && t.title);

      return res.json({
        status: true,
        creator: '@hidz',
        result: {
          query,
          total: results.length,
          data: results
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
