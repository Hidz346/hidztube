// params : none

const axios = require('axios');
const cheerio = require('cheerio');

module.exports = {
  category: 'Manga',
  params: [],
  desc: 'Mendapatkan update homepage manga dari Manga UP (banner, update terbaru, manga baru, ranking)',

  async run(req, res) {
    try {
      const response = await axios.get('https://global.manga-up.com/', {
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
      const data = parsedNext?.props?.pageProps?.data || {};
      const imgBase = 'https://global-api.manga-up.com';

      const mapTitle = (item) => ({
        id: item.titleId,
        title: item.titleName,
        thumbnail: item.imageUrl ? (item.imageUrl.startsWith('http') ? item.imageUrl : imgBase + item.imageUrl) : null,
        badge: item.badge || 0,
        subscriptionBadge: item.subscriptionBadge || 0
      });

      const topBanners = (data.topBanners || []).map((b) => ({
        id: b.id,
        title: b.title,
        link: b.link,
        imageUrl: b.imageUrl ? (b.imageUrl.startsWith('http') ? b.imageUrl : imgBase + b.imageUrl) : null
      }));

      const updatedTitles = (data.updatedTitles || []).map(mapTitle);
      const newTitles = (data.newTitles || []).map(mapTitle);
      const rankings = (data.rankings || []).map(mapTitle);
      const tags = (data.tags || []).map((t) => ({
        id: t.tagId,
        name: t.name
      }));

      return res.json({
        status: true,
        creator: '@hidz',
        result: {
          topBanners,
          updatedTitles,
          newTitles,
          rankings,
          tags
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
