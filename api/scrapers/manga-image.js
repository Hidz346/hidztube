// params : ?url=...&key=...&iv=...

const axios = require('axios');
const crypto = require('crypto');

module.exports = {
  category: 'Manga',
  params: ['url', 'key', 'iv'],
  'desc-url': 'URL gambar webp.enc Manga UP',
  'desc-key': 'Kunci dekripsi AES (32 bytes hex)',
  'desc-iv': 'IV AES (16 bytes hex)',
  desc: 'Mendekripsi gambar chapter Manga UP (.webp.enc) menjadi file gambar WebP',

  async run(req, res) {
    const url = String(req.query.url || req.body.url || '').trim();
    const key = String(req.query.key || req.body.key || '').trim();
    const iv = String(req.query.iv || req.body.iv || '').trim();

    if (!url) {
      return res.status(400).json({
        status: false,
        creator: '@hidz',
        message: 'Parameter url diperlukan'
      });
    }

    try {
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://global.manga-up.com/'
        },
        timeout: 15000
      });

      let imgBuffer = Buffer.from(response.data);

      if (key && iv) {
        try {
          const keyBuf = Buffer.from(key, 'hex');
          const ivBuf = Buffer.from(iv, 'hex');
          const decipher = crypto.createDecipheriv('aes-256-cbc', keyBuf, ivBuf);
          imgBuffer = Buffer.concat([decipher.update(imgBuffer), decipher.final()]);
        } catch (decryptErr) {
          return res.status(500).json({
            status: false,
            creator: '@hidz',
            message: `Gagal mendekripsi gambar: ${decryptErr.message}`
          });
        }
      }

      res.setHeader('creator', '@hidz');
      res.setHeader('Content-Type', 'image/webp');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.send(imgBuffer);
    } catch (err) {
      return res.status(500).json({
        status: false,
        creator: '@hidz',
        message: err.message
      });
    }
  }
};
