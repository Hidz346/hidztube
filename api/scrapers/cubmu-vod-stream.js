// params : ?slug=5037-the-transmart-mamet-si-artis-kpop

const axios = require('axios');
const cheerio = require('cheerio');
const { decryptManifest } = require('./_cubmu_helper');

module.exports = {
  category: 'CubMu',
  params: ['slug'],
  'desc-slug': 'Slug watch VOD di CubMu (contoh: 5037-the-transmart-mamet-si-artis-kpop)',
  desc: 'Mendapatkan link streaming HLS (.m3u8) dan DASH (.mpd) film/serial CubMu dengan dekripsi otomatis AES-128-CFB',

  async run(req, res) {
    let slug = String(req.query.slug || req.body.slug || '').trim();

    if (!slug) {
      return res.status(400).json({
        status: false,
        creator: '@hidz',
        message: 'Parameter slug diperlukan'
      });
    }

    if (slug.includes('/watch/')) {
      const match = slug.match(/\/watch\/(?:series\/)?([^/?#]+)/);
      if (match) slug = match[1];
    }

    try {
      let pageUrl = `https://www.cubmu.com/watch/series/${slug}`;
      let pageRes;
      try {
        pageRes = await axios.get(pageUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
          },
          timeout: 15000
        });
      } catch (err) {
        pageUrl = `https://www.cubmu.com/watch/${slug}`;
        pageRes = await axios.get(pageUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
          },
          timeout: 15000
        });
      }

      const $ = cheerio.load(pageRes.data);
      const nextDataRaw = $('#__NEXT_DATA__').html();

      if (!nextDataRaw) {
        return res.status(500).json({
          status: false,
          creator: '@hidz',
          message: 'Gagal mengekstrak data Next.js dari CubMu'
        });
      }

      const parsed = JSON.parse(nextDataRaw);
      const props = parsed?.props?.pageProps || {};
      const detailMovie = props.detailMovie || {};
      const libDetail = detailMovie.product_library_detail;

      if (!libDetail) {
        return res.status(404).json({
          status: false,
          creator: '@hidz',
          message: 'Data streaming VOD tidak ditemukan'
        });
      }

      const rawDash = libDetail.manifest || null;
      const rawHls = libDetail.manifest_hls || null;

      const decryptedDash = decryptManifest(rawDash);
      const decryptedHls = decryptManifest(rawHls);

      return res.json({
        status: true,
        creator: '@hidz',
        result: {
          title: detailMovie.product_name,
          episodeTitle: libDetail.episode_name || libDetail.title,
          episodeNo: libDetail.episode_no || '1',
          durationSeconds: libDetail.duration || 0,
          genre: libDetail.genre_name || detailMovie.genre_name,
          studio: libDetail.studio_name || detailMovie.studio_name,
          actors: libDetail.actors || null,
          director: libDetail.director || null,
          synopsis: libDetail.indonesia_synopsis || libDetail.second_language_synopsis || null,
          posterLandscape: libDetail.poster_horizontal || detailMovie.product_poster || null,
          posterPortrait: libDetail.poster_vertical || detailMovie.product_poster_potrait || null,
          stream: {
            hls: decryptedHls,
            dash: decryptedDash
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
