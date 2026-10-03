// params : ?channel=210-trans-tv

const axios = require('axios');
const cheerio = require('cheerio');
const { getAccessToken, decryptManifest } = require('./_cubmu_helper');

module.exports = {
  category: 'LiveTV',
  params: ['channel'],
  'desc-channel': 'ID channel (contoh: 210) atau slug channel (contoh: 210-trans-tv atau trans-tv)',
  desc: 'Mendapatkan link streaming DASH (.mpd), HLS (.m3u8), dan detail channel Live TV CubMu',

  async run(req, res) {
    let channel = String(req.query.channel || req.body.channel || '').trim();

    if (!channel) {
      return res.status(400).json({
        status: false,
        creator: '@hidz',
        message: 'Parameter channel diperlukan'
      });
    }

    if (channel.includes('/live-tv/')) {
      const match = channel.match(/\/live-tv\/([^/?#]+)/);
      if (match) channel = match[1];
    }

    try {
      let slug = channel;

      // If channel is just a number (e.g. 210) or channel name (e.g. trans-tv), resolve slug from channel list
      if (/^\d+$/.test(channel) || !channel.includes('-')) {
        const token = await getAccessToken();
        const listRes = await axios.get(
          'https://servicebuss.transvision.co.id/global/v4/channel-list?page=1&per_page=50&platform_id=1',
          {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 10000
          }
        );

        const items = listRes.data?.data?.items || [];
        for (const g of items) {
          for (const c of g.channels || []) {
            const cSlugName = (c.channel_name || '').trim().toLowerCase().replace(/\s+/g, '-');
            if (String(c.channel_id) === channel || String(c.channel_number) === channel || cSlugName === channel.toLowerCase()) {
              slug = `${c.channel_id}-${cSlugName}`;
              break;
            }
          }
        }
      }

      const watchUrl = `https://www.cubmu.com/watch/live-tv/${slug}`;
      const pageRes = await axios.get(watchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        },
        timeout: 15000
      });

      const $ = cheerio.load(pageRes.data);
      const nextDataRaw = $('#__NEXT_DATA__').html();

      if (!nextDataRaw) {
        return res.status(500).json({
          status: false,
          creator: '@hidz',
          message: 'Gagal mengekstrak data streaming CubMu'
        });
      }

      const parsed = JSON.parse(nextDataRaw);
      const props = parsed?.props?.pageProps || {};
      const detail = props.detailChannel;

      if (!detail) {
        return res.status(404).json({
          status: false,
          creator: '@hidz',
          message: 'Channel tidak ditemukan di CubMu'
        });
      }

      // Collect manifests
      const resolvedManifest = props.manifest || null;
      const cdnManifests = [];

      (detail.channel_cdn_list || []).forEach((cdn, idx) => {
        const globalEnc = cdn.cdn_manifest?.global;
        const hlsEnc = cdn.cdn_manifest?.hls;

        const globalDec = decryptManifest(globalEnc);
        const hlsDec = decryptManifest(hlsEnc);

        if (globalDec || hlsDec) {
          cdnManifests.push({
            priority: cdn.cdn_priority || idx + 1,
            drmType: cdn.cdn_drm_type,
            dash: globalDec || null,
            hls: hlsDec || null
          });
        }
      });

      return res.json({
        status: true,
        creator: '@hidz',
        result: {
          channelId: detail.channel_id,
          channelName: detail.channel_name,
          channelNumber: detail.channel_number,
          genre: detail.genre_name,
          description: detail.description || null,
          image: detail.channel_image || null,
          ottImage: detail.channel_ott_image || null,
          slug: detail.slug_url || slug,
          stream: {
            dash: resolvedManifest,
            sign: props.sign || null,
            drm: props.drmDetail || null,
            cdns: cdnManifests
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
