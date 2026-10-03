// params : none

const axios = require('axios');
const { getAccessToken } = require('./_cubmu_helper');

module.exports = {
  category: 'LiveTV',
  params: [],
  desc: 'Mendapatkan daftar saluran Live TV CubMu (Trans TV, Trans7, CNN Indonesia, CNBC Indonesia, SCTV, Indosiar, tvN Movies, dll)',

  async run(req, res) {
    try {
      const token = await getAccessToken();
      const response = await axios.get(
        'https://servicebuss.transvision.co.id/global/v4/channel-list?page=1&per_page=50&platform_id=1',
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

      const items = response.data?.data?.items || [];
      const genres = items.map((g) => ({
        genreId: g.genre_id,
        genreName: g.genre_name,
        channels: (g.channels || []).map((c) => {
          const rawSlug = (c.channel_name || '').trim().toLowerCase().replace(/\s+/g, '-');
          const slug = `${c.channel_id}-${rawSlug}`;
          return {
            id: c.channel_id,
            name: c.channel_name,
            number: c.channel_number,
            image: c.channel_image || null,
            ottImage: c.channel_ott_image || null,
            slug,
            isWatchable: c.is_watchable_channel !== false
          };
        })
      }));

      const totalChannels = genres.reduce((acc, g) => acc + g.channels.length, 0);

      return res.json({
        status: true,
        creator: '@hidz',
        result: {
          totalGenres: genres.length,
          totalChannels,
          genres
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
