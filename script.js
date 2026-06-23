let allVideos = [];
let currentFeatured = null;

const loader      = document.getElementById('loader');
const errorMsg    = document.getElementById('error-message');
const errorText   = document.getElementById('error-text');
const homeView    = document.getElementById('home-view');
const watchView   = document.getElementById('watch-view');
const navbar      = document.getElementById('navbar');
const btnBack     = document.getElementById('btn-back');
const searchForm  = document.getElementById('search-form');
const searchInput = document.getElementById('search-input');

/* ── Helpers ── */

const extractVideoID = (url) => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

const generateFakeRating = (id) => {
  if (!id) return '8.5';
  const num = (id.charCodeAt(0) % 5) + 5;
  return (num + (id.charCodeAt(1) % 10) / 10).toFixed(1);
};

const normalizeData = (data) => {
  let list = [];
  if (Array.isArray(data)) list = data;
  else if (data?.result && Array.isArray(data.result)) list = data.result;
  else if (data?.data   && Array.isArray(data.data))   list = data.data;
  else if (data?.items  && Array.isArray(data.items))  list = data.items;

  return list.map(item => {
    const rawUrl      = item.url || item.link || '';
    const vidId       = item.videoId || item.id || extractVideoID(rawUrl);
    const hqThumbnail = vidId
      ? `https://img.youtube.com/vi/${vidId}/maxresdefault.jpg`
      : (item.thumbnail || item.image);

    return {
      id:           vidId,
      title:        item.title || 'Tanpa Judul',
      shortTitle:   (item.title || 'Tanpa Judul').split('|')[0].trim(),
      thumbnail:    hqThumbnail,
      fallbackThumb: item.thumbnail || `https://img.youtube.com/vi/${vidId}/hqdefault.jpg`,
      channel:      item.channel || item.author || item.channelTitle || 'YouTube',
      views:        item.views || item.viewCount || '',
      duration:     item.duration || item.time || '',
    };
  }).filter(item => item.id);
};

/* ── Card hover interactions ── */

const addCardHover = (card) => {
  card.addEventListener('mouseenter', () => {
    const overlay = card.querySelector('.nb-play-overlay');
    const img     = card.querySelector('img');
    const h4      = card.querySelector('h4');
    const bar     = card.querySelector('.nb-bar');
    const body    = card.querySelector('.nb-body');
    const plus    = card.querySelector('.nb-plus');
    if (overlay) overlay.style.opacity = '1';
    if (img)     img.style.opacity     = '1';
    if (h4)      h4.style.color        = '#00ffff';
    if (bar)     bar.style.width       = '100%';
    if (body)    body.style.background = '#1a1a1a';
    if (plus)    plus.style.opacity    = '1';
  });
  card.addEventListener('mouseleave', () => {
    const overlay = card.querySelector('.nb-play-overlay');
    const img     = card.querySelector('img');
    const h4      = card.querySelector('h4');
    const bar     = card.querySelector('.nb-bar');
    const body    = card.querySelector('.nb-body');
    const plus    = card.querySelector('.nb-plus');
    if (overlay) overlay.style.opacity = '0';
    if (img)     img.style.opacity     = '0.82';
    if (h4)      h4.style.color        = '#fff';
    if (bar)     bar.style.width       = '0';
    if (body)    body.style.background = '#111111';
    if (plus)    plus.style.opacity    = '0';
  });
};

/* ── Fetch ── */

const fetchVideos = async (query) => {
  loader.classList.remove('hidden');
  homeView.classList.add('hidden');
  homeView.classList.remove('fade-in');
  watchView.classList.add('hidden');
  watchView.classList.remove('fade-in');
  errorMsg.classList.add('hidden');

  try {
    const response = await fetch(`https://api-faa.my.id/faa/youtube?q=${encodeURIComponent(query)}`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const data             = await response.json();
    const normalizedVideos = normalizeData(data);

    if (normalizedVideos.length === 0) throw new Error('Pencarian tidak menemukan hasil.');

    allVideos       = normalizedVideos;
    currentFeatured = allVideos[0];

    setTimeout(() => renderHome(), 300);
  } catch (err) {
    console.error('Error:', err);
    errorText.innerText = err.message || 'Gagal memuat data. Periksa sinyal internet.';
    loader.classList.add('hidden');
    errorMsg.classList.remove('hidden');
  }
};

/* ── Render Home ── */

const renderHome = () => {
  loader.classList.add('hidden');
  homeView.classList.remove('hidden');
  homeView.classList.add('fade-in');
  watchView.classList.add('hidden');

  // Navbar: CSS (#navbar) handles visual; these JS classes won't override the ID rule
  navbar.classList.add('bg-gradient-to-b');
  navbar.classList.remove('bg-[#05070a]');
  navbar.style.boxShadow = 'none';
  btnBack.classList.add('hidden');

  // Hero image
  const heroImg = document.getElementById('hero-img');
  heroImg.classList.add('opacity-0', 'scale-105');
  setTimeout(() => {
    heroImg.src     = currentFeatured.thumbnail;
    heroImg.onerror = function () { this.src = currentFeatured.fallbackThumb; };
  }, 50);

  document.getElementById('hero-title').innerText   = currentFeatured.shortTitle;
  document.getElementById('hero-channel').innerText = currentFeatured.channel;
  document.getElementById('hero-duration').innerText = currentFeatured.duration || 'HD';
  document.getElementById('hero-desc').innerText    = `${currentFeatured.title} - Video unggulan dari channel ${currentFeatured.channel}. ${currentFeatured.views ? 'Total tayang: ' + currentFeatured.views : ''}`;

  const playBtn    = document.getElementById('hero-play-btn');
  playBtn.onclick  = () => openWatchPage(currentFeatured);

  const homeGrid   = document.getElementById('home-grid');
  homeGrid.innerHTML = '';

  const gridVideos = allVideos.filter(v => v.id !== currentFeatured.id);

  gridVideos.forEach((video, index) => {
    const card            = document.createElement('div');
    card.className        = 'overflow-hidden cursor-pointer card-hover relative fade-in';
    card.style.animationDelay = `${0.3 + index * 0.05}s`;
    card.onclick          = () => openWatchPage(video);

    card.innerHTML = `
      <div class="nb-thumb">
        <img
          src="${video.fallbackThumb}"
          alt="${video.shortTitle}"
          style="width:100%;height:100%;object-fit:cover;opacity:0.82;transition:opacity 0.3s;"
        />
        ${video.duration
          ? `<div style="position:absolute;top:8px;right:8px;background:rgba(0,0,0,0.85);border:1px solid #facc15;color:#facc15;font-family:'Space Mono',monospace;font-size:0.62rem;padding:2px 5px;letter-spacing:0.06em;">${video.duration}</div>`
          : ''}
        <div class="nb-play-overlay"
          style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity 0.2s;background:rgba(0,0,0,0.22);">
          <div style="width:44px;height:44px;background:rgba(250,204,21,0.92);border:2px solid #000;box-shadow:3px 3px 0 #00ffff;display:flex;align-items:center;justify-content:center;">
            <i class="fas fa-play" style="color:#000;font-size:0.78rem;margin-left:3px;"></i>
          </div>
        </div>
        <div class="nb-bar" style="position:absolute;bottom:0;left:0;height:2px;width:0;background:#facc15;box-shadow:0 0 5px #facc15;transition:width 0.4s;"></div>
      </div>
      <div class="nb-body" style="padding:10px 12px;background:#111111;transition:background 0.2s;">
        <h4 style="color:#fff;font-size:0.75rem;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;font-family:'Space Grotesk',sans-serif;overflow:hidden;display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;transition:color 0.15s;">
          ${video.shortTitle}
        </h4>
        <p style="color:#6b7280;font-size:0.63rem;margin-top:4px;font-family:'Space Mono',monospace;overflow:hidden;display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;">
          ${video.channel}
        </p>
      </div>
    `;

    addCardHover(card);
    homeGrid.appendChild(card);
  });
};

/* ── Watch Page ── */

const openWatchPage = (video) => {
  homeView.classList.add('hidden');
  homeView.classList.remove('fade-in');
  watchView.classList.remove('hidden');
  watchView.classList.add('fade-in');

  navbar.classList.remove('bg-gradient-to-b');
  navbar.classList.add('bg-[#05070a]');
  navbar.style.boxShadow = '0 4px 10px -1px rgba(0,0,0,0.6)';
  btnBack.classList.remove('hidden');
  btnBack.classList.add('fade-in');

  window.scrollTo({ top: 0, behavior: 'smooth' });

  document.getElementById('video-player').src     = `https://www.youtube.com/embed/${video.id}?autoplay=1&rel=0&modestbranding=1`;
  document.getElementById('watch-title').innerText  = video.shortTitle;
  document.getElementById('watch-channel').innerText = video.channel;
  document.getElementById('watch-rating').innerText  = generateFakeRating(video.id);
  document.getElementById('watch-duration').innerText = video.duration || '24m';
  document.getElementById('watch-desc').innerText   = `${video.title}. Video ini berasal dari ${video.channel} ${video.views ? 'dengan jumlah ' + video.views : ''}.`;

  const watchGrid = document.getElementById('watch-grid');
  watchGrid.innerHTML = '';

  const relatedVideos = allVideos.filter(v => v.id !== video.id).slice(0, 15);

  relatedVideos.forEach((relVideo, index) => {
    const card            = document.createElement('div');
    card.className        = 'overflow-hidden cursor-pointer card-hover relative fade-in';
    card.style.animationDelay = `${0.3 + index * 0.05}s`;
    card.onclick          = () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => openWatchPage(relVideo), 300);
    };

    card.innerHTML = `
      <div class="nb-thumb">
        <img
          src="${relVideo.fallbackThumb}"
          alt="Thumbnail"
          style="width:100%;height:100%;object-fit:cover;opacity:0.82;transition:opacity 0.3s;"
        />
        <div class="nb-play-overlay"
          style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity 0.2s;background:rgba(0,0,0,0.25);">
          <div style="width:38px;height:38px;background:rgba(250,204,21,0.9);border:2px solid #000;box-shadow:2px 2px 0 #00ffff;display:flex;align-items:center;justify-content:center;">
            <i class="fas fa-play" style="color:#000;font-size:0.68rem;margin-left:2px;"></i>
          </div>
        </div>
        <div class="nb-bar" style="position:absolute;bottom:0;left:0;height:2px;width:0;background:#facc15;box-shadow:0 0 5px #facc15;transition:width 0.5s;"></div>
      </div>
      <div class="nb-body" style="padding:10px 12px;background:#111111;transition:background 0.2s;">
        <h4 style="color:#fff;font-size:0.72rem;font-weight:700;line-height:1.4;text-transform:uppercase;font-family:'Space Grotesk',sans-serif;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;transition:color 0.15s;">
          ${relVideo.shortTitle}
        </h4>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;">
          <span style="color:#6b7280;font-size:0.62rem;font-family:'Space Mono',monospace;">${relVideo.duration || '24m'}</span>
          <i class="fas fa-plus-circle nb-plus" style="color:#6b7280;font-size:0.72rem;opacity:0;transition:opacity 0.2s;"></i>
        </div>
      </div>
    `;

    addCardHover(card);
    watchGrid.appendChild(card);
  });
};

/* ── Go Home ── */

const goHome = () => {
  document.getElementById('video-player').src = '';
  window.scrollTo({ top: 0, behavior: 'smooth' });
  renderHome();
};

/* ── Scroll: navbar stays solid via CSS, no override needed ── */
window.addEventListener('scroll', () => {
  const isWatchViewHidden = watchView.classList.contains('hidden');
  if (isWatchViewHidden) {
    if (window.scrollY > 50) {
      navbar.classList.replace('bg-gradient-to-b', 'bg-[#0a0e17]/95');
      navbar.classList.add('backdrop-blur-md');
      navbar.classList.add('shadow-lg');
    } else {
      navbar.classList.replace('bg-[#0a0e17]/95', 'bg-gradient-to-b');
      navbar.classList.remove('backdrop-blur-md');
      navbar.classList.remove('shadow-lg');
    }
  }
});

/* ── Search ── */
searchForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const query = searchInput.value.trim();
  if (query) {
    document.getElementById('video-player').src = '';
    fetchVideos(query);
    searchInput.blur();
  }
});

/* ── Init ── */
window.addEventListener('DOMContentLoaded', () => {
  fetchVideos('Upin ipin');
});
