const express = require('express');
const cors = require('cors');
const dns = require('dns');

// Enforce IPv4 lookup order to eliminate IPv6 network route timeouts
try {
  dns.setDefaultResultOrder('ipv4first');
} catch (e) {}

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Scrapers registry
const scrapers = {
  // Anime (Samehadaku)
  'anime/latest': require('./scrapers/anime-latest'),
  'anime/search': require('./scrapers/anime-search'),
  'anime/detail': require('./scrapers/anime-detail'),
  'anime/stream': require('./scrapers/anime-stream'),

  // Drakor (Drakor.id)
  'drama/latest': require('./scrapers/drakor-latest'),
  'drama/search': require('./scrapers/drakor-search'),
  'drama/detail': require('./scrapers/drakor-detail'),
  'drama/stream': require('./scrapers/drakor-stream'),

  // Donghua (Anichin)
  'donghua/latest': require('./scrapers/donghua-latest'),
  'donghua/search': require('./scrapers/donghua-search'),
  'donghua/detail': require('./scrapers/donghua-detail'),
  'donghua/stream': require('./scrapers/donghua-stream'),

  // Manga (Manga UP)
  'manga/home': require('./scrapers/manga-home'),
  'manga/search': require('./scrapers/manga-search'),
  'manga/detail': require('./scrapers/manga-detail'),
  'manga/read': require('./scrapers/manga-read'),
  'manga/image': require('./scrapers/manga-image'),

  // Live TV & VOD (CubMu)
  'livetv/list': require('./scrapers/cubmu-livetv'),
  'livetv/stream': require('./scrapers/cubmu-livetv-stream'),
  'vod/list': require('./scrapers/cubmu-vod'),
  'vod/detail': require('./scrapers/cubmu-vod-detail'),
  'vod/stream': require('./scrapers/cubmu-vod-stream'),
  'cubmu/search': require('./scrapers/cubmu-search')
};

// Route loader
Object.entries(scrapers).forEach(([endpoint, scraper]) => {
  const handler = async (req, res) => {
    try {
      await scraper.run(req, res);
    } catch (err) {
      if (!res.headersSent) {
        res.status(500).json({
          status: false,
          creator: '@hidzstream',
          message: err.message
        });
      }
    }
  };

  app.get(`/api/${endpoint}`, handler);
  app.post(`/api/${endpoint}`, handler);
  app.get(`/${endpoint}`, handler);
  app.post(`/${endpoint}`, handler);
});

// Health check & root
app.get('/', (req, res) => {
  res.json({
    name: 'HidzStream Scraper API',
    version: '1.0.0',
    status: 'online',
    endpoints: Object.keys(scrapers).map((e) => `/api/${e}`)
  });
});

app.get('/api', (req, res) => {
  res.json({
    name: 'HidzStream Scraper API',
    version: '1.0.0',
    status: 'online',
    endpoints: Object.keys(scrapers).map((e) => `/api/${e}`)
  });
});

if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`[HidzStream API] Running on port ${PORT}`);
  });
}

module.exports = app;
