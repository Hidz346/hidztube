# hidztube

Platform streaming & baca komik — Neobrutalism × Y2K, dark & light mode, responsif.

## Fitur

- 🎌 **Anime** — episode subtitle Indonesia terbaru (Samehadaku)
- 🎭 **Drama Asia** — drama Korea & Asia terbaru (Drakor.id)
- 🐉 **Donghua** — animasi 3D Tiongkok (Anichin)
- 📺 **Live TV** — 80+ saluran TV Indonesia & mancanegara (CubMu)
- 🎬 **Film & Series (VOD)** — katalog film/serial (CubMu)
- 📖 **Komik** — baca manga/manhwa online (Manga UP)
- 🔍 Pencarian per kategori + pencarian lintas kategori dari beranda
- 🌗 Tema gelap & terang, tersimpan otomatis di perangkat
- 📱 Tampilan responsif, nyaman di HP maupun desktop

## Struktur Proyek

```
hidztube-main/
├── index.html          # Shell SPA (navbar, kategori, mount point)
├── styles.css           # Semua styling (tema dark/light, komponen)
├── js/
│   ├── api.js            # Wrapper fetch ke /api/* + normalisasi data
│   └── app.js             # Router (hash-based) + render tiap halaman
├── api/                  # Backend scraper (Express, deploy sebagai Vercel Function)
│   ├── server.js
│   ├── package.json
│   └── scrapers/          # 1 file = 1 endpoint
└── vercel.json           # Konfigurasi deploy gabungan (static + API)
```

## Deploy ke Vercel

Repo ini sudah berisi frontend dan backend API dalam satu project — tinggal deploy dari root:

```bash
vercel --prod
```

Tidak perlu environment variable tambahan. Setelah live, frontend otomatis memanggil backend lewat path relatif `/api/...` (satu origin, tanpa masalah CORS).

## Menjalankan API secara lokal (opsional)

```bash
cd api
npm install
npm start
```

Server berjalan di `http://localhost:4000`, dengan endpoint yang sama seperti `/api/...` di production.
