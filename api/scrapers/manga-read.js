// params : ?chapterId=12955

const axios = require('axios');
const { parseProto } = require('./_manga_proto');

module.exports = {
  category: 'Manga',
  params: ['chapterId'],
  'desc-chapterId': 'ID chapter manga di Manga UP (contoh: 12955)',
  desc: 'Mendapatkan daftar gambar halaman chapter manga dari Manga UP',

  async run(req, res) {
    const chapterId = String(req.query.chapterId || req.body.chapterId || '').trim();

    if (!chapterId) {
      return res.status(400).json({
        status: false,
        creator: '@hidz',
        message: 'Parameter chapterId diperlukan'
      });
    }

    try {
      const url = `https://global-api.manga-up.com/api/manga/viewer_v2?chapter_id=${chapterId}&first=yes&quality=high&lang=en`;
      const response = await axios.post(
        url,
        {},
        {
          responseType: 'arraybuffer',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Origin': 'https://global.manga-up.com',
            'Referer': 'https://global.manga-up.com/'
          },
          timeout: 15000
        }
      );

      const buffer = Buffer.from(response.data);
      const topProto = parseProto(buffer);

      // In MangaViewerV2View:
      // field 3 contains viewerBlock with pages and title
      const blockRaw = topProto[3]?.[0]?.val;
      if (!blockRaw) {
        return res.status(404).json({
          status: false,
          creator: '@hidz',
          message: 'Data halaman chapter tidak ditemukan atau chapter ini terkunci'
        });
      }

      const block = parseProto(blockRaw);
      const chapterTitle = block[2]?.[0]?.val ? Buffer.from(block[2][0].val).toString('utf-8') : '';
      const rawPages = block[3] || [];
      const imgBase = 'https://global-api.manga-up.com';

      const pages = rawPages.map((p, idx) => {
        const pageProto = parseProto(p.val);
        const relUrl = pageProto[1]?.[0]?.val ? Buffer.from(pageProto[1][0].val).toString('utf-8') : '';
        const keyHex = pageProto[5]?.[0]?.val ? Buffer.from(pageProto[5][0].val).toString('utf-8') : '';
        const ivHex = pageProto[6]?.[0]?.val ? Buffer.from(pageProto[6][0].val).toString('utf-8') : '';

        return {
          page: idx + 1,
          url: relUrl ? (relUrl.startsWith('http') ? relUrl : imgBase + relUrl) : null,
          key: keyHex || null,
          iv: ivHex || null
        };
      }).filter((p) => p.url);

      // Next chapter info
      const nextRaw = topProto[4]?.[0]?.val;
      let nextChapter = null;
      if (nextRaw) {
        const nextProto = parseProto(nextRaw);
        const nextId = nextProto[1]?.[0]?.val;
        const nextName = nextProto[2]?.[0]?.val ? Buffer.from(nextProto[2][0].val).toString('utf-8') : '';
        const nextSub = nextProto[3]?.[0]?.val ? Buffer.from(nextProto[3][0].val).toString('utf-8') : '';
        if (nextId) {
          nextChapter = {
            id: nextId,
            title: nextSub ? `${nextName} - ${nextSub}` : nextName
          };
        }
      }

      return res.json({
        status: true,
        creator: '@hidz',
        result: {
          chapterId: Number(chapterId),
          title: chapterTitle,
          totalPages: pages.length,
          pages,
          nextChapter
        }
      });
    } catch (err) {
      if (err.response && err.response.status === 401) {
        return res.status(403).json({
          status: false,
          creator: '@hidz',
          message: 'Chapter ini berbayar atau membutuhkan login akun Manga UP'
        });
      }
      return res.status(500).json({
        status: false,
        creator: '@hidz',
        message: err.message
      });
    }
  }
};
