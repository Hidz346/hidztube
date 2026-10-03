// params : ?page=1

const axios = require('axios');
const { getAccessToken } = require('./_cubmu_helper');

module.exports = {
  category: 'CubMu',
  params: ['page'],
  'desc-page': 'Nomor halaman (opsional, default: 1)',
  desc: 'Mendapatkan katalog film dan serial VOD terbaru & populer dari CubMu',

  async run(req, res) {
    const page = parseInt(req.query.page || req.body.page || '1', 10) || 1;

    try {
      const token = await getAccessToken();
      const response = await axios.get(
        `https://servicebuss.transvision.co.id/global/v4/vod/list/homepage?page=${page}&per_page=10&platform_id=1`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Origin: 'https://www.cubmu.com',
            Referer: 'https://www.cubmu.com/'
          },
          timeout: 15000
        }
      );

      const rawItems = response.data?.data?.items || [];
      const sections = rawItems.map((sec) => {
        const rawList = sec.contents || sec.data || [];
        const contents = rawList.map((c) => ({
          vodId: c.vod_id,
          title: c.vod_name || c.title || c.meta?.title || 'Unknown Title',
          type: c.type_vod || c.type || 'vod',
          posterLandscape: c.poster_landscape || c.meta?.poster_og || null,
          posterPortrait: c.poster_portrait || c.meta?.poster_og || null,
          slug: c.meta?.slug_url || String(c.vod_id),
          watchSlug: c.meta?.slug_watch_url || null,
          description: c.meta?.description || null
        }));

        return {
          sectionId: sec.section_id || sec.category_id,
          sectionName: sec.section_name || sec.category_name || 'VOD Category',
          totalContents: contents.length,
          contents
        };
      });

      return res.json({
        status: true,
        creator: '@hidz',
        result: {
          page,
          totalSections: sections.length,
          sections
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
