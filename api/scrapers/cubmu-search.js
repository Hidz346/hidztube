// params : ?query=trans

const axios = require('axios');
const { getAccessToken } = require('./_cubmu_helper');

module.exports = {
  category: 'CubMu',
  params: ['query'],
  'desc-query': 'Kata kunci pencarian Live TV, serial, atau film di CubMu',
  desc: 'Mencari saluran Live TV, serial, film VOD, dan program catchup di CubMu',

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
      const token = await getAccessToken();

      // Parallel fetch: search API and channel list for comprehensive channel & VOD results
      const [searchRes, channelRes] = await Promise.allSettled([
        axios.get(`https://servicebuss.transvision.co.id/global/v4/search/result?q=${encodeURIComponent(query)}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Origin: 'https://www.cubmu.com'
          },
          timeout: 15000
        }),
        axios.get('https://servicebuss.transvision.co.id/global/v4/channel-list?page=1&per_page=50&platform_id=1', {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000
        })
      ]);

      const searchData = searchRes.status === 'fulfilled' ? searchRes.value?.data?.data || {} : {};
      const channelItems = channelRes.status === 'fulfilled' ? channelRes.value?.data?.data?.items || [] : [];

      // Extract matching channels
      const queryLower = query.toLowerCase();
      const channels = [];
      const seenChannelIds = new Set();

      for (const group of channelItems) {
        for (const ch of group.channels || []) {
          const name = String(ch.channel_name || '');
          if (name.toLowerCase().includes(queryLower) && !seenChannelIds.has(ch.channel_id)) {
            seenChannelIds.add(ch.channel_id);
            const slug = `${ch.channel_id}-${name.trim().toLowerCase().replace(/\s+/g, '-')}`;
            channels.push({
              id: ch.channel_id,
              name: ch.channel_name,
              number: ch.channel_number,
              genre: group.genre_name || 'TV',
              slug,
              image: ch.channel_image || null,
              ottImage: ch.channel_ott_image || null
            });
          }
        }
      }

      // Extract VOD items
      const rawVods = searchData.vod || [];
      const vods = rawVods.map((item) => ({
        id: item.product_id || item.content_id,
        title: item.title,
        type: item.type,
        slug: item.meta?.slug_url || null,
        watchSlug: item.meta?.slug_watch_url || null,
        description: item.meta?.description || null,
        posterLandscape: item.banner_landscape || item.meta?.poster_og || null,
        posterPortrait: item.banner_portrait || null
      }));

      // Extract Catchup items
      const rawCatchup = searchData.catchup || [];
      const catchup = rawCatchup.map((item) => ({
        catchupId: item.catchup_id,
        channelId: item.channel_official_id,
        channelName: item.title,
        program: item.program,
        scheduleDate: item.schedule_date,
        startTime: item.schedule_start_time,
        endTime: item.schedule_end_time,
        synopsis: item.indonesia_synopsis || null,
        posterLandscape: item.banner_landscape || null,
        posterPortrait: item.banner_portrait || null
      }));

      return res.json({
        status: true,
        creator: '@hidz',
        result: {
          query,
          total: channels.length + vods.length + catchup.length,
          channels,
          vods,
          catchup
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
