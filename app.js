// ============================================================
// THE NORTH ESSEX CURRY CLUB — App Logic v5 (Single-page scroll)
// ============================================================

(function () {
  'use strict';

  // ---- DOM refs ----
  const grid = document.getElementById('cardsGrid');
  const timelineView = document.getElementById('timelineView');
  const searchInput = document.getElementById('searchInput');
  const sortSelect = document.getElementById('sortSelect');
  const organiserFilter = document.getElementById('organiserFilter');
  const ratingFilter = document.getElementById('ratingFilter');
  const resultsCount = document.getElementById('resultsCount');
  const noResults = document.getElementById('noResults');
  const lightbox = document.getElementById('lightbox');

  // ---- Members Data ----
  const members = [
    { name: 'John Garrett', nickname: 'JG / The Spreadsheet King', joined: 'Oct 2021', role: 'Founder & Chief Scorer', avatar: '🎯' },
    { name: 'Wodge', nickname: 'Rog / The Short-Wearing Legend', joined: 'Oct 2021', role: 'Founding Member', avatar: '🩳' },
    { name: 'Andy Bott', nickname: 'Mr Bott / The Adventurer', joined: 'Oct 2021', role: 'Founding Member', avatar: '🗺️' },
    { name: 'Pete Chalklen', nickname: 'The Elusive One', joined: 'Oct 2021', role: 'Founding Member (Retired Mar 2026)', avatar: '👻' },
    { name: 'Stephen Brazier', nickname: 'Brazier / The Designated Driver', joined: 'Apr 2022', role: 'Member', avatar: '🚗' },
    { name: 'Taylor Hickson', nickname: 'Big Fella / The Tablecloth Inspector', joined: 'Jan 2023', role: 'Member', avatar: '🧐' },
    { name: 'Big Guy (Stu)', nickname: 'The New Recruit', joined: 'Jan 2026', role: 'Member', avatar: '💪' },
    { name: 'Jeff', nickname: 'The Bhaji Connoisseur', joined: 'Jan 2026', role: 'Member', avatar: '🧅' }
  ];

  // ---- Local Storage Overrides ----
  const STORAGE_KEY = 'curryClubEdits';

  function loadEdits() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
    catch (e) { return {}; }
  }

  function saveEdit(id, field, value) {
    const edits = loadEdits();
    if (!edits[id]) edits[id] = {};
    edits[id][field] = value;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(edits));
  }

  function applyEdits() {
    const edits = loadEdits();
    curryNights.forEach(item => {
      if (edits[item.id]) {
        Object.keys(edits[item.id]).forEach(field => {
          const val = edits[item.id][field];
          // Empty images array means all photos removed
          if (field === 'images' && Array.isArray(val) && val.length === 0) {
            item.images = undefined;
          } else {
            item[field] = val;
          }
        });
      }
    });
  }

  applyEdits();

  // Load any entries added via the Add form (from localStorage)
  (function () {
    const edits = loadEdits();
    // Remove deleted entries
    if (edits['__deleted__'] && Array.isArray(edits['__deleted__'])) {
      edits['__deleted__'].forEach(id => {
        const idx = curryNights.findIndex(r => r.id === id);
        if (idx > -1) curryNights.splice(idx, 1);
      });
    }
    // Add user-created entries
    if (edits['__added__'] && Array.isArray(edits['__added__'])) {
      edits['__added__'].forEach(entry => {
        if (!curryNights.find(r => r.id === entry.id)) {
          curryNights.push(entry);
        }
      });
    }
  })();

  window.exportCurryEdits = function () {
    const edits = loadEdits();
    console.log(JSON.stringify(edits, null, 2));
    return edits;
  };

  // ---- Helpers ----
  function needsEdit(value) {
    return !value || value === 'Unknown' || value === 'N/A' || value === 'Unknown (South Indian)';
  }

  function starsHTML(rating) {
    let html = '<span class="stars" aria-label="' + rating + ' out of 5 stars">';
    for (let i = 1; i <= 5; i++) {
      if (i <= Math.floor(rating)) html += '<span class="star filled">★</span>';
      else if (i - 0.5 <= rating) html += '<span class="star half">★</span>';
      else html += '<span class="star">★</span>';
    }
    return html + '</span>';
  }

  function formatDate(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  const curryEmojis = ['🍛', '🍲', '🌶️', '🥘', '🍽️', '🥄', '🫕', '🧄'];
  function getPlaceholderEmoji(id) { return curryEmojis[id % curryEmojis.length]; }

  // ---- Animated Counters ----
  function animateCounter(el, target, suffix) {
    suffix = suffix || '';
    const isFloat = String(target).includes('.');
    const duration = 1200;
    const start = performance.now();
    function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const val = eased * target;
      el.textContent = (isFloat ? val.toFixed(1) : Math.round(val)) + suffix;
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  // ---- Password Gate for Edit Section ----
  // SHA-256 hash of the shared password (default: "curryclub")
  // To change: run in console: crypto.subtle.digest('SHA-256', new TextEncoder().encode('yourpassword')).then(b => console.log([...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')))
  const EDIT_PASSWORD_HASH = '57734cbd8304c71ba50bf294ff9cc9f77bf05b9c7d4b022e96de157d3c9da834';
  const AUTH_SESSION_KEY = 'curryClubAuth';

  async function hashPassword(pw) {
    const data = new TextEncoder().encode(pw);
    const buf = await crypto.subtle.digest('SHA-256', data);
    return [...new Uint8Array(buf)].map(x => x.toString(16).padStart(2, '0')).join('');
  }

  function isAuthenticated() {
    return sessionStorage.getItem(AUTH_SESSION_KEY) === 'true';
  }

  function showEditGate() {
    const gate = document.getElementById('passwordGate');
    const inner = document.getElementById('adminInner');
    if (isAuthenticated()) {
      gate.hidden = true;
      inner.hidden = false;
    } else {
      gate.hidden = false;
      inner.hidden = true;
    }
  }

  // Password submit handler
  document.getElementById('passwordSubmit').addEventListener('click', async () => {
    const input = document.getElementById('passwordInput');
    const error = document.getElementById('passwordError');
    const hash = await hashPassword(input.value);
    if (hash === EDIT_PASSWORD_HASH) {
      sessionStorage.setItem(AUTH_SESSION_KEY, 'true');
      error.hidden = true;
      showEditGate();
      if (editNeedsRender) { renderFixTable(); editNeedsRender = false; }
    } else {
      error.hidden = false;
      input.value = '';
      input.focus();
    }
  });

  document.getElementById('passwordInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('passwordSubmit').click();
  });

  // ---- Section Navigation (show/hide) ----
  const allSections = document.querySelectorAll('.page-section');
  let activeSection = 'home';
  let timelineNeedsRender = true;
  let editNeedsRender = true;

  function showSection(name) {
    window.scrollTo(0, 0);
    allSections.forEach(s => s.hidden = true);
    document.getElementById('section-' + name).hidden = false;
    activeSection = name;

    // Lazy render on first visit
    if (name === 'timeline' && timelineNeedsRender) { renderTimeline(); timelineNeedsRender = false; }
    if (name === 'restaurants') render();
    if (name === 'edit') {
      showEditGate();
      if (isAuthenticated() && editNeedsRender) { renderFixTable(); editNeedsRender = false; }
    }
    if (name === 'map' && curryMapInstance) {
      setTimeout(function() { curryMapInstance.invalidateSize(); }, 100);
    }
  }

  // Hero nav buttons
  document.querySelectorAll('.hero-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => showSection(btn.dataset.section));
  });

  // Back buttons
  document.querySelectorAll('.btn-back').forEach(btn => {
    btn.addEventListener('click', () => showSection(btn.dataset.section));
  });

  // Brand click = home
  document.getElementById('brandHome').addEventListener('click', () => showSection('home'));

  // Helper: mark sections dirty after data changes
  function refreshAfterEdit() {
    render();
    timelineNeedsRender = true;
    editNeedsRender = true;
    if (activeSection === 'timeline') { renderTimeline(); timelineNeedsRender = false; }
    if (activeSection === 'edit') { renderFixTable(); editNeedsRender = false; }
  }

  // ---- Hero Stats ----
  const totalNights = curryNights.length;
  const uniqueRestaurants = new Set(curryNights.filter(r => !needsEdit(r.name)).map(r => r.name)).size;
  const avgRating = (curryNights.reduce((s, r) => s + r.rating, 0) / totalNights);

  animateCounter(document.getElementById('stat-visits'), totalNights);
  animateCounter(document.getElementById('stat-restaurants'), uniqueRestaurants);
  animateCounter(document.getElementById('stat-avg'), parseFloat(avgRating.toFixed(1)));

  // ---- Hero Particles ----
  (function () {
    const container = document.getElementById('heroParticles');
    const emojis = ['🍛', '🌶️', '🥘', '🍲', '⭐', '🧅', '🫕', '🍺'];
    for (let i = 0; i < 12; i++) {
      const p = document.createElement('span');
      p.className = 'hero-particle';
      p.textContent = emojis[Math.floor(Math.random() * emojis.length)];
      p.style.left = Math.random() * 100 + '%';
      p.style.animationDelay = Math.random() * 8 + 's';
      p.style.animationDuration = (6 + Math.random() * 6) + 's';
      container.appendChild(p);
    }
  })();

  // ---- Hero Photo Carousel ----
  (function () {
    const track = document.getElementById('heroCarouselTrack');
    const photos = curryNights
      .filter(r => r.image)
      .map(r => r.image);
    if (photos.length === 0) return;
    // Shuffle and pick up to 20, then duplicate for seamless loop
    const shuffled = photos.sort(() => Math.random() - 0.5).slice(0, 20);
    const doubled = [...shuffled, ...shuffled];
    doubled.forEach(src => {
      const img = document.createElement('img');
      img.src = src;
      img.alt = '';
      img.loading = 'lazy';
      track.appendChild(img);
    });
    // Adjust animation speed based on image count
    track.style.animationDuration = (shuffled.length * 3) + 's';
  })();

  // ---- Scroll-In Observer ----
  (function () {
    const els = document.querySelectorAll('.scroll-in');
    if (!els.length) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    els.forEach(el => observer.observe(el));
  })();

  // ---- Organiser Leaderboard ----
  (function () {
    const counts = {};
    curryNights.forEach(item => {
      if (!counts[item.organiser]) counts[item.organiser] = { count: 0, totalRating: 0 };
      counts[item.organiser].count++;
      counts[item.organiser].totalRating += item.rating;
    });

    const leaders = Object.entries(counts)
      .map(([name, d]) => ({ name, count: d.count, avg: (d.totalRating / d.count).toFixed(1) }))
      .sort((a, b) => b.count - a.count);

    const maxCount = leaders[0].count;
    const lbGrid = document.getElementById('leaderboardGrid');

    leaders.forEach((leader, i) => {
      const medal = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';
      const rank = i + 1;
      const card = document.createElement('div');
      card.className = 'leader-card' + (medal ? ' ' + medal : '');
      card.innerHTML =
        '<div class="leader-rank">#' + rank + '</div>' +
        '<div class="leader-avatar">' + leader.name.charAt(0) + '</div>' +
        '<div class="leader-name">' + leader.name + '</div>' +
        '<div class="leader-stat">' + leader.count + ' nights organised</div>' +
        '<div class="leader-avg">★ ' + leader.avg + '</div>' +
        '<div class="leader-bar"><div class="leader-bar-fill"></div></div>';
      lbGrid.appendChild(card);
      setTimeout(() => {
        card.querySelector('.leader-bar-fill').style.width = (leader.count / maxCount * 100) + '%';
      }, 300 + i * 150);
    });
  })();

  // ---- Map ----
  var curryMapInstance;
  (function () {
    var map = L.map('curryMap', {
      scrollWheelZoom: false
    }).setView([51.82, 0.52], 10);
    curryMapInstance = map;

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
      maxZoom: 18
    }).addTo(map);

    // Known location coordinates
    var locationCoords = {
      'Great Dunmow': [51.8722, 0.3622],
      'Chelmsford': [51.7356, 0.4685],
      'Felsted': [51.8600, 0.4450],
      'Bishops Stortford': [51.8720, 0.1600],
      'Rayne': [51.8700, 0.5200],
      'White Notley': [51.8350, 0.6050],
      'Stansted Mountfitchet': [51.8980, 0.1980],
      'Thaxted': [51.9530, 0.3470],
      'Witham': [51.7970, 0.6380],
      'Great Baddow': [51.7150, 0.4950],
      'Braintree': [51.8780, 0.5530],
      'Braintree area': [51.8780, 0.5530],
      'Ongar': [51.7060, 0.2440],
      'Debden': [51.7150, 0.2100],
      'Epping': [51.6940, 0.1130],
      'London (Brick Lane)': [51.5220, -0.0720],
      'London (Old Street, Shoreditch)': [51.5265, -0.0878],
      'London': [51.5074, -0.1278],
      'Maldon': [51.7310, 0.6750],
      'Danbury': [51.7220, 0.5830],
      'Kelvedon': [51.8380, 0.7050],
      'Halstead': [51.9450, 0.6400],
      'Sudbury': [52.0380, 0.7270],
      'Hatfield Heath': [51.8100, 0.2350],
      'Sawbridgeworth': [51.8140, 0.1530],
      'Coggeshall Hamlet': [51.8650, 0.6900],
      'Bradwell': [51.8150, 0.5750],
      'North Weald': [51.7193, 0.1680],
      'Hatfield Peveral': [51.7752, 0.5920],
      'Writtle': [51.7290, 0.4280],
      'Saffron Walden': [52.0230, 0.2430]
    };

    // Group by unique restaurant name + location, one label per restaurant
    var restaurants = {};
    curryNights.forEach(function (r) {
      if (needsEdit(r.location) || needsEdit(r.name)) return;
      var key = r.name + '|' + r.location;
      if (!restaurants[key]) {
        restaurants[key] = { name: r.name, location: r.location, visits: [] };
      }
      restaurants[key].visits.push(r);
    });

    var markers = L.markerClusterGroup({
      maxClusterRadius: 35,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      iconCreateFunction: function(cluster) {
        var count = cluster.getChildCount();
        return L.divIcon({
          className: 'map-cluster-marker',
          html: '<div class="map-cluster">' + count + ' restaurants</div>',
          iconSize: null,
          iconAnchor: [50, 12]
        });
      }
    });

    var usedCoords = {};
    Object.values(restaurants).forEach(function (rest) {
      var coords = locationCoords[rest.location];
      if (!coords) return;

      // Offset labels at the same location so they don't stack
      var coordKey = coords[0] + ',' + coords[1];
      if (!usedCoords[coordKey]) usedCoords[coordKey] = 0;
      var offset = usedCoords[coordKey] * 0.004;
      usedCoords[coordKey]++;
      var pinCoords = [coords[0] + (offset * Math.cos(usedCoords[coordKey] * 2.5)), coords[1] + (offset * Math.sin(usedCoords[coordKey] * 2.5))];

      var visitCount = rest.visits.length;
      var avgRating = (rest.visits.reduce(function(s, v) { return s + v.rating; }, 0) / visitCount).toFixed(1);
      var labelText = rest.name + (visitCount > 1 ? ' ×' + visitCount : '');
      var ratingClass = parseFloat(avgRating) >= 4 ? ' rating-high' : parseFloat(avgRating) < 3 ? ' rating-low' : '';

      var labelIcon = L.divIcon({
        className: 'map-label-marker',
        html: '<div class="map-label' + ratingClass + '">' + labelText + '</div>',
        iconSize: null,
        iconAnchor: [0, 12],
        popupAnchor: [0, -12]
      });

      var visitDetails = rest.visits.map(function(v) {
        return '#' + v.id + ' ' + v.rating + '★ — ' + formatDate(v.date);
      }).join('<br>');
      var popup = '<div class="map-popup-title">' + rest.name + '</div>' +
        '<div class="map-popup-meta">' + rest.location + '<br>Avg: ' + avgRating + '★ · ' + visitCount + ' visit' + (visitCount > 1 ? 's' : '') + '<br>' + visitDetails + '</div>';
      var marker = L.marker(pinCoords, { icon: labelIcon }).bindPopup(popup);
      markers.addLayer(marker);
    });

    map.addLayer(markers);
  })();

  // ---- Ticker ----
  (function () {
    const track = document.getElementById('tickerTrack');
    const highlights = curryNights
      .filter(r => r.rating >= 4 || r.rating <= 2)
      .map(r => {
        const emoji = r.rating >= 4.5 ? '🔥' : r.rating >= 4 ? '⭐' : '💀';
        return '<div class="ticker-item">' + emoji + ' <span>' + r.name + '</span> — ' +
          r.location + ' (' + r.rating + '★)</div>';
      });
    track.innerHTML = highlights.join('') + highlights.join('');
  })();

  // ---- Footer Quote ----
  (function () {
    const quotes = curryNights
      .filter(r => r.comment.length > 40 && r.comment.length < 150)
      .map(r => '"' + r.comment + '" — #' + r.id + ' ' + r.name);
    const el = document.getElementById('footerQuote');
    if (quotes.length) el.textContent = quotes[Math.floor(Math.random() * quotes.length)];
  })();

  // ---- Next Curry Night Countdown ----
  const NEXT_EVENT_KEY = 'curryClubNextEvent';

  function startCountdown() {
    const bar = document.getElementById('countdownBar');
    const timerEl = document.getElementById('countdownTimer');
    const dateEl = document.getElementById('countdownDate');
    const stored = localStorage.getItem(NEXT_EVENT_KEY);
    if (!stored) { bar.hidden = true; return; }

    const target = new Date(stored + 'T19:00:00'); // assume 7pm
    bar.hidden = false;

    function tick() {
      const now = new Date();
      const diff = target - now;

      if (diff <= 0) {
        // Event is today or passed
        const dayDiff = Math.floor((now - target) / 86400000);
        if (dayDiff === 0) {
          bar.classList.add('event-today');
          timerEl.innerHTML = '<span style="font-size:1.6rem">🔥 Tonight!</span>';
          dateEl.textContent = formatDate(stored);
        } else {
          bar.hidden = true;
        }
        return;
      }

      bar.classList.remove('event-today');
      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const secs = Math.floor((diff % 60000) / 1000);

      timerEl.innerHTML =
        '<div class="cd-unit"><span class="cd-num">' + days + '</span><span class="cd-lbl">Days</span></div>' +
        '<div class="cd-unit"><span class="cd-num">' + String(hours).padStart(2, '0') + '</span><span class="cd-lbl">Hrs</span></div>' +
        '<div class="cd-unit"><span class="cd-num">' + String(mins).padStart(2, '0') + '</span><span class="cd-lbl">Min</span></div>' +
        '<div class="cd-unit"><span class="cd-num">' + String(secs).padStart(2, '0') + '</span><span class="cd-lbl">Sec</span></div>';
      dateEl.textContent = formatDate(stored);
    }

    tick();
    setInterval(tick, 1000);
  }

  startCountdown();

  // Next event setter (in Edit Entries)
  (function () {
    const dateInput = document.getElementById('nextEventDate');
    const setBtn = document.getElementById('setNextEvent');
    const clearBtn = document.getElementById('clearNextEvent');
    const status = document.getElementById('nextEventStatus');

    // Pre-fill with current value
    const current = localStorage.getItem(NEXT_EVENT_KEY);
    if (current) dateInput.value = current;

    setBtn.addEventListener('click', () => {
      const val = dateInput.value;
      if (!val) return;
      localStorage.setItem(NEXT_EVENT_KEY, val);
      status.textContent = '✅ Set!';
      setTimeout(() => { status.textContent = ''; }, 2000);
      startCountdown();
    });

    clearBtn.addEventListener('click', () => {
      localStorage.removeItem(NEXT_EVENT_KEY);
      dateInput.value = '';
      document.getElementById('countdownBar').hidden = true;
      status.textContent = '🗑️ Cleared';
      setTimeout(() => { status.textContent = ''; }, 2000);
    });
  })();

  // ---- Populate Organiser Filter ----
  const organisers = [...new Set(curryNights.map(r => r.organiser))].sort();
  organisers.forEach(org => {
    const opt = document.createElement('option');
    opt.value = org;
    opt.textContent = org;
    organiserFilter.appendChild(opt);
  });

  // ---- Populate Location Filter ----
  const locationFilter = document.getElementById('locationFilter');
  const locations = [...new Set(curryNights.filter(r => !needsEdit(r.location)).map(r => r.location))].sort();
  locations.forEach(loc => {
    const opt = document.createElement('option');
    opt.value = loc;
    opt.textContent = loc;
    locationFilter.appendChild(opt);
  });

  // ---- Members Tab ----
  (function () {
    const mgrid = document.getElementById('membersGrid');
    const avatarColors = [
      'linear-gradient(135deg, #14b8a6, #06b6d4)',
      'linear-gradient(135deg, #f97316, #ef4444)',
      'linear-gradient(135deg, #8b5cf6, #6366f1)',
      'linear-gradient(135deg, #22c55e, #14b8a6)',
      'linear-gradient(135deg, #ec4899, #f43f5e)',
      'linear-gradient(135deg, #eab308, #f97316)',
      'linear-gradient(135deg, #06b6d4, #3b82f6)',
      'linear-gradient(135deg, #a855f7, #ec4899)'
    ];

    members.forEach((m, i) => {
      // Count appearances and organised
      const organised = curryNights.filter(r => r.organiser === m.name).length;
      const attended = curryNights.filter(r => {
        const d = new Date(r.date + 'T00:00:00');
        const joinDate = memberJoinDate(m.joined);
        return d >= joinDate;
      }).length;

      const card = document.createElement('div');
      card.className = 'member-card';
      card.innerHTML =
        '<div class="member-avatar" style="background:' + avatarColors[i] + '">' + m.avatar + '</div>' +
        '<div class="member-name">' + m.name + '</div>' +
        '<div class="member-nickname">' + m.nickname + '</div>' +
        '<div class="member-role">' + m.role + ' · Joined ' + m.joined + '</div>' +
        '<div class="member-stats">' +
          '<div><strong>' + organised + '</strong>Organised</div>' +
          '<div><strong>' + attended + '</strong>Eligible</div>' +
        '</div>';
      card.style.cursor = 'pointer';
      card.setAttribute('title', organised > 0 ? 'View restaurants organised by ' + m.name : m.name + ' hasn\'t organised one yet');
      card.addEventListener('click', () => {
        // Set the organiser filter — if they haven't organised any, show all
        organiserFilter.value = organised > 0 ? m.name : 'all';
        showSection('restaurants');
        render();
      });
      mgrid.appendChild(card);
    });

    function memberJoinDate(joinStr) {
      const parts = joinStr.split(' ');
      const months = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
      return new Date(parseInt(parts[1]), months[parts[0]], 1);
    }
  })();

  // ---- Card Builder ----
  function createCard(item, index) {
    const card = document.createElement('article');
    card.className = 'card';
    card.style.animationDelay = (index * 0.04) + 's';
    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', 'View details for ' + item.name);

    const nameClass = needsEdit(item.name) ? ' editable-hint' : '';
    const locClass = needsEdit(item.location) ? ' editable-hint' : '';

    const imageContent = item.image
      ? '<img src="' + item.image + '" alt="Photo of ' + item.name + '" loading="lazy">'
      : '<div class="card-image-placeholder">' + getPlaceholderEmoji(item.id) + '</div>';

    const photoCount = (item.images && item.images.length > 1)
      ? '<span class="card-photo-count">📷 ' + item.images.length + '</span>'
      : '';

    card.innerHTML =
      '<div class="card-image">' +
        imageContent +
        '<span class="card-number">#' + item.id + '</span>' +
        photoCount +
        '<span class="card-rating-badge">' + starsHTML(item.rating) + '</span>' +
      '</div>' +
      '<div class="card-body">' +
        '<h3 class="card-name' + nameClass + '">' + item.name + '</h3>' +
        '<div class="card-location' + locClass + '">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>' +
          '<span>' + item.location + '</span>' +
        '</div>' +
        '<p class="card-comment">"' + item.comment + '"</p>' +
        '<div class="card-footer">' +
          '<div class="card-organiser">' +
            '<span class="organiser-avatar">' + item.organiser.charAt(0) + '</span>' +
            item.organiser +
          '</div>' +
          '<span>' + formatDate(item.date) + '</span>' +
        '</div>' +
      '</div>';

    card.addEventListener('click', () => openLightbox(item));
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLightbox(item); }
    });
    return card;
  }

  // ---- Timeline ----
  function renderTimeline() {
    timelineView.innerHTML = '';
    const sorted = [...curryNights].sort((a, b) => b.date.localeCompare(a.date));
    let lastYear = null;

    sorted.forEach((item, i) => {
      const year = item.date.substring(0, 4);
      if (year !== lastYear) {
        const marker = document.createElement('div');
        marker.className = 'timeline-year-marker';
        marker.innerHTML = '<span>' + year + '</span>';
        timelineView.appendChild(marker);
        lastYear = year;
      }

      const el = document.createElement('div');
      el.className = 'timeline-item';
      el.style.animationDelay = (i * 0.06) + 's';

      // Build photo HTML
      let photoHTML = '';
      const allPhotos = item.images || (item.image ? [item.image] : []);
      if (allPhotos.length > 0) {
        photoHTML = '<div class="timeline-photos">';
        allPhotos.forEach((src, pi) => {
          photoHTML += '<img src="' + src + '" alt="Photo ' + (pi + 1) + ' from ' + item.name + '" loading="lazy" class="timeline-photo">';
        });
        photoHTML += '</div>';
      }

      el.innerHTML =
        '<div class="timeline-date">' + formatDate(item.date) + '</div>' +
        '<div class="timeline-name">' + item.name + '</div>' +
        '<div class="timeline-meta">' +
          starsHTML(item.rating) +
          '<span>' + item.organiser + '</span>' +
          '<span>' + item.location + '</span>' +
        '</div>' +
        photoHTML +
        '<div class="timeline-comment">"' + item.comment + '"</div>';
      el.addEventListener('click', () => openLightbox(item));
      timelineView.appendChild(el);
    });
  }

  // ---- Inline Editing ----
  function makeEditable(el, item, field) {
    el.classList.add('editable');
    if (needsEdit(item[field])) el.classList.add('editable-hint');

    el.addEventListener('click', (e) => {
      e.stopPropagation();
      if (el.querySelector('input')) return;

      const current = item[field];
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'inline-edit-input';
      input.value = needsEdit(current) ? '' : current;
      input.placeholder = 'Type ' + field + '...';

      el.textContent = '';
      el.appendChild(input);
      input.focus();
      input.select();

      function commit() {
        const val = input.value.trim();
        if (val && val !== current) {
          item[field] = val;
          saveEdit(item.id, field, val);
        }
        renderLightboxFields(item);
        refreshAfterEdit();
      }

      input.addEventListener('blur', commit);
      input.addEventListener('keydown', (ke) => {
        if (ke.key === 'Enter') { ke.preventDefault(); input.blur(); }
        if (ke.key === 'Escape') { el.textContent = current; }
      });
    });
  }

  function renderLightboxFields(item) {
    const nameEl = document.getElementById('lightboxName');
    const locEl = document.getElementById('lightboxLocation');
    const pubEl = document.getElementById('lightboxPub');
    const commentEl = document.getElementById('lightboxComment');

    nameEl.textContent = item.name;
    locEl.textContent = item.location;
    pubEl.textContent = item.pub;

    // Format comment with line breaks and bold section headers
    const formatted = item.comment
      .replace(/\n/g, '<br>')
      .replace(/(THE FOOD:|THE MAINS:|DESSERT & BILL:|FINAL THOUGHT:)/g, '<strong>$1</strong>');
    commentEl.innerHTML = '"' + formatted + '"';

    makeEditable(nameEl, item, 'name');
    makeEditable(locEl, item, 'location');
    makeEditable(pubEl, item, 'pub');
    makeEditable(commentEl, item, 'comment');
  }

  // ---- Lightbox ----
  let lightboxPhotos = [];
  let lightboxPhotoIndex = 0;

  function setLightboxPhoto(index) {
    lightboxPhotoIndex = index;
    const img = document.getElementById('lightboxImage');
    img.src = lightboxPhotos[index];
    img.alt = 'Photo ' + (index + 1);
    document.getElementById('lightboxPhotoCount').textContent = (index + 1) + ' / ' + lightboxPhotos.length;

    // Update thumb active state
    document.querySelectorAll('.lightbox-thumb').forEach((t, i) => {
      t.classList.toggle('active', i === index);
    });

    // Show/hide nav arrows
    document.getElementById('lightboxPrev').hidden = lightboxPhotos.length <= 1;
    document.getElementById('lightboxNext').hidden = lightboxPhotos.length <= 1;
  }

  function openLightbox(item) {
    document.getElementById('lightboxNumber').textContent = 'Curry Night #' + item.id;
    document.getElementById('lightboxRating').innerHTML = starsHTML(item.rating);
    document.getElementById('lightboxOrganiser').textContent = item.organiser;
    document.getElementById('lightboxDate').textContent = formatDate(item.date);

    renderLightboxFields(item);

    // Build photo gallery
    lightboxPhotos = item.images || (item.image ? [item.image] : []);
    const imgArea = document.querySelector('.lightbox-image-area');
    const thumbsContainer = document.getElementById('lightboxThumbs');
    const countEl = document.getElementById('lightboxPhotoCount');

    if (lightboxPhotos.length > 0) {
      imgArea.querySelector('#lightboxImage').style.display = '';
      imgArea.querySelector('#lightboxImage').src = lightboxPhotos[0];

      // Build thumbnails
      thumbsContainer.innerHTML = '';
      if (lightboxPhotos.length > 1) {
        lightboxPhotos.forEach((src, i) => {
          const thumb = document.createElement('img');
          thumb.className = 'lightbox-thumb' + (i === 0 ? ' active' : '');
          thumb.src = src;
          thumb.alt = 'Thumbnail ' + (i + 1);
          thumb.loading = 'lazy';
          thumb.addEventListener('click', (e) => { e.stopPropagation(); setLightboxPhoto(i); });
          thumbsContainer.appendChild(thumb);
        });
        thumbsContainer.style.display = '';
      } else {
        thumbsContainer.style.display = 'none';
      }

      countEl.textContent = '1 / ' + lightboxPhotos.length;
      countEl.style.display = lightboxPhotos.length > 1 ? '' : 'none';
      lightboxPhotoIndex = 0;

      document.getElementById('lightboxPrev').hidden = lightboxPhotos.length <= 1;
      document.getElementById('lightboxNext').hidden = lightboxPhotos.length <= 1;
    } else {
      imgArea.querySelector('#lightboxImage').style.display = 'none';
      thumbsContainer.innerHTML = '';
      thumbsContainer.style.display = 'none';
      countEl.style.display = 'none';
      document.getElementById('lightboxPrev').hidden = true;
      document.getElementById('lightboxNext').hidden = true;

      // Show placeholder
      let placeholder = imgArea.querySelector('.card-image-placeholder');
      if (!placeholder) {
        placeholder = document.createElement('div');
        placeholder.className = 'card-image-placeholder';
        placeholder.style.cssText = 'height:100%;font-size:4rem;';
        imgArea.appendChild(placeholder);
      }
      placeholder.textContent = getPlaceholderEmoji(item.id);
      placeholder.style.display = '';
    }

    // Remove any leftover placeholder when we have photos
    if (lightboxPhotos.length > 0) {
      const ph = imgArea.querySelector('.card-image-placeholder');
      if (ph) ph.style.display = 'none';
    }

    lightbox.hidden = false;
    document.body.style.overflow = 'hidden';
    document.querySelector('.lightbox-close').focus();
  }

  // Gallery navigation
  document.getElementById('lightboxPrev').addEventListener('click', (e) => {
    e.stopPropagation();
    if (lightboxPhotos.length <= 1) return;
    setLightboxPhoto((lightboxPhotoIndex - 1 + lightboxPhotos.length) % lightboxPhotos.length);
  });

  document.getElementById('lightboxNext').addEventListener('click', (e) => {
    e.stopPropagation();
    if (lightboxPhotos.length <= 1) return;
    setLightboxPhoto((lightboxPhotoIndex + 1) % lightboxPhotos.length);
  });

  function closeLightbox() {
    lightbox.hidden = true;
    document.body.style.overflow = '';
  }

  document.querySelector('.lightbox-close').addEventListener('click', closeLightbox);
  document.querySelector('.lightbox-backdrop').addEventListener('click', closeLightbox);
  document.addEventListener('keydown', (e) => {
    if (lightbox.hidden) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft' && lightboxPhotos.length > 1) {
      setLightboxPhoto((lightboxPhotoIndex - 1 + lightboxPhotos.length) % lightboxPhotos.length);
    }
    if (e.key === 'ArrowRight' && lightboxPhotos.length > 1) {
      setLightboxPhoto((lightboxPhotoIndex + 1) % lightboxPhotos.length);
    }
  });

  // ---- Filter & Sort ----
  function getFilteredData() {
    let data = [...curryNights];
    const query = searchInput.value.toLowerCase().trim();
    const org = organiserFilter.value;
    const loc = locationFilter.value;
    const minRating = parseInt(ratingFilter.value, 10);
    const sort = sortSelect.value;

    if (query) {
      data = data.filter(item =>
        item.name.toLowerCase().includes(query) ||
        item.location.toLowerCase().includes(query) ||
        item.organiser.toLowerCase().includes(query) ||
        item.pub.toLowerCase().includes(query) ||
        item.comment.toLowerCase().includes(query)
      );
    }
    if (org !== 'all') data = data.filter(item => item.organiser === org);
    if (loc !== 'all') data = data.filter(item => item.location === loc);
    if (minRating > 0) data = data.filter(item => item.rating >= minRating);

    switch (sort) {
      case 'date-desc': data.sort((a, b) => b.date.localeCompare(a.date)); break;
      case 'date-asc': data.sort((a, b) => a.date.localeCompare(b.date)); break;
      case 'rating-desc': data.sort((a, b) => b.rating - a.rating || b.date.localeCompare(a.date)); break;
      case 'rating-asc': data.sort((a, b) => a.rating - b.rating || a.date.localeCompare(b.date)); break;
      case 'name-asc': data.sort((a, b) => a.name.localeCompare(b.name)); break;
    }
    return data;
  }

  function render() {
    const data = getFilteredData();
    grid.innerHTML = '';
    data.forEach((item, i) => grid.appendChild(createCard(item, i)));
    resultsCount.textContent = data.length;
    noResults.hidden = data.length > 0;
  }

  let searchTimeout;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(render, 200);
  });
  sortSelect.addEventListener('change', render);
  organiserFilter.addEventListener('change', render);
  locationFilter.addEventListener('change', render);
  ratingFilter.addEventListener('change', render);

  // ---- Hall of Fame ----
  (function () {
    const fameGrid = document.getElementById('fameGrid');
    const sorted = [...curryNights].sort((a, b) => b.rating - a.rating);
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];

    const visitCounts = {};
    curryNights.forEach(r => {
      if (!needsEdit(r.name)) visitCounts[r.name] = (visitCounts[r.name] || 0) + 1;
    });
    const mostVisited = Object.entries(visitCounts).sort((a, b) => b[1] - a[1])[0];
    const legendary = [...curryNights].sort((a, b) => b.comment.length - a.comment.length)[0];

    const cards = [
      { icon: '👑', title: best.name, subtitle: 'Highest Rated — ' + best.rating + '★', detail: best.comment, rating: best.rating },
      { icon: '💀', title: worst.name, subtitle: 'Lowest Rated — ' + worst.rating + '★', detail: worst.comment, rating: worst.rating },
      { icon: '🏠', title: mostVisited ? mostVisited[0] : 'N/A', subtitle: mostVisited ? 'Most Visited — ' + mostVisited[1] + ' times' : '', detail: 'The go-to favourite that keeps pulling the lads back.', rating: null },
      { icon: '📖', title: 'Best Story', subtitle: legendary.name + ' — #' + legendary.id, detail: legendary.comment, rating: legendary.rating }
    ];

    cards.forEach(c => {
      const el = document.createElement('div');
      el.className = 'fame-card';
      el.innerHTML =
        '<div class="fame-card-icon">' + c.icon + '</div>' +
        '<div class="fame-card-title">' + c.title + '</div>' +
        '<div class="fame-card-subtitle">' + c.subtitle + '</div>' +
        '<div class="fame-card-detail">"' + c.detail + '"</div>' +
        (c.rating ? '<div class="fame-card-rating">' + starsHTML(c.rating) + '</div>' : '');
      fameGrid.appendChild(el);
    });
  })();

  // ---- Undo Toast ----
  let undoToastEl = null;
  let undoTimeout = null;

  function showUndoToast(message, onUndo) {
    // Remove existing toast
    if (undoToastEl) { undoToastEl.remove(); clearTimeout(undoTimeout); }

    undoToastEl = document.createElement('div');
    undoToastEl.className = 'undo-toast';
    undoToastEl.innerHTML =
      '<span>' + message + '</span>' +
      '<button class="btn-undo">Undo</button>' +
      '<button class="toast-dismiss">✕</button>';

    document.body.appendChild(undoToastEl);

    function dismiss() {
      if (undoToastEl) { undoToastEl.remove(); undoToastEl = null; }
      clearTimeout(undoTimeout);
    }

    undoToastEl.querySelector('.btn-undo').addEventListener('click', () => {
      onUndo();
      dismiss();
    });

    undoToastEl.querySelector('.toast-dismiss').addEventListener('click', dismiss);

    // Auto-dismiss after 8 seconds
    undoTimeout = setTimeout(dismiss, 8000);
  }

  // ---- Edit Table Filters ----
  const editFilters = { name: '', location: '', pub: '', organiser: '' };

  function initEditFilters() {
    const filterRow = document.getElementById('editFilterRow');
    if (filterRow) return; // already initialised
    const thead = document.querySelector('#fixTable thead');
    const tr = document.createElement('tr');
    tr.id = 'editFilterRow';
    tr.className = 'filter-row';
    const cols = [
      { key: '', span: 1 },   // #
      { key: '', span: 1 },   // Date
      { key: 'name', span: 1, ph: 'Filter restaurant...' },
      { key: 'location', span: 1, ph: 'Filter location...' },
      { key: 'pub', span: 1, ph: 'Filter pub...' },
      { key: 'organiser', span: 1, ph: 'Filter organiser...' },
      { key: '', span: 1 },   // Rating
      { key: '', span: 1 },   // Comment
      { key: '', span: 1 },   // Attended
      { key: '', span: 1 }    // Actions
    ];
    cols.forEach(c => {
      const td = document.createElement('th');
      td.className = 'filter-cell';
      if (c.key) {
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'filter-input';
        input.placeholder = c.ph;
        input.dataset.filterKey = c.key;
        input.value = editFilters[c.key] || '';
        input.addEventListener('input', () => {
          editFilters[c.key] = input.value.toLowerCase().trim();
          renderFixTable();
        });
        td.appendChild(input);
      }
      tr.appendChild(td);
    });
    thead.appendChild(tr);
  }

  // ---- Fix / Edit Table ----
  function renderFixTable() {
    initEditFilters();
    const tbody = document.getElementById('fixTableBody');
    tbody.innerHTML = '';

    // Show ALL entries, most recent first, then apply filters
    let allItems = [...curryNights].sort((a, b) => b.date.localeCompare(a.date));

    // Apply column filters
    Object.keys(editFilters).forEach(key => {
      const q = editFilters[key];
      if (q) {
        allItems = allItems.filter(item => (item[key] || '').toLowerCase().includes(q));
      }
    });

    allItems.forEach(item => {
      const allPhotos = item.images || (item.image ? [item.image] : []);
      const photoLabel = allPhotos.length > 0 ? ' 📷' + allPhotos.length : '';

      const attendeesList = item.attendees && item.attendees.length > 0
        ? item.attendees.map(n => n.split(' ')[0]).join(', ')
        : '—';

      const tr = document.createElement('tr');
      tr.innerHTML =
        '<td class="col-id">' + item.id + '</td>' +
        '<td class="col-date">' + formatDate(item.date) + '</td>' +
        '<td class="' + (needsEdit(item.name) ? 'cell-unknown' : 'cell-ok') + '" data-field="name">' + item.name + '</td>' +
        '<td class="' + (needsEdit(item.location) ? 'cell-unknown' : 'cell-ok') + '" data-field="location">' + item.location + '</td>' +
        '<td class="' + (needsEdit(item.pub) ? 'cell-unknown' : 'cell-ok') + '" data-field="pub">' + item.pub + '</td>' +
        '<td class="cell-ok" data-field="organiser">' + item.organiser + '</td>' +
        '<td class="col-rating">' + item.rating + '★</td>' +
        '<td class="col-comment cell-ok" data-field="comment">' + item.comment.substring(0, 80) + (item.comment.length > 80 ? '...' : '') + '</td>' +
        '<td class="col-attendees" data-field="attendees">' + attendeesList + '</td>' +
        '<td class="col-action">' +
          (allPhotos.length > 0 ? '<button class="btn-photos" title="Manage photos" aria-label="Manage photos for #' + item.id + '">' + photoLabel + '</button> ' : '') +
          '<button class="btn-delete" title="Remove entry" aria-label="Remove entry #' + item.id + '">✕</button>' +
        '</td>';

      // Delete button
      tr.querySelector('.btn-delete').addEventListener('click', () => {
        // Remove from runtime array
        const idx = curryNights.findIndex(r => r.id === item.id);
        if (idx === -1) return;
        const removedItem = curryNights.splice(idx, 1)[0];
        const removedIdx = idx;

        // Track deletion in localStorage
        const edits = loadEdits();
        edits['__deleted__'] = edits['__deleted__'] || [];
        if (!edits['__deleted__'].includes(item.id)) edits['__deleted__'].push(item.id);
        if (edits['__added__']) {
          edits['__added__'] = edits['__added__'].filter(e => e.id !== item.id);
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(edits));

        renderFixTable();
        refreshAfterEdit();

        // Show undo toast
        showUndoToast('Removed #' + removedItem.id + ' ' + removedItem.name, () => {
          // Restore the entry
          curryNights.splice(removedIdx, 0, removedItem);
          const edits2 = loadEdits();
          if (edits2['__deleted__']) {
            edits2['__deleted__'] = edits2['__deleted__'].filter(id => id !== removedItem.id);
          }
          localStorage.setItem(STORAGE_KEY, JSON.stringify(edits2));
          renderFixTable();
          refreshAfterEdit();
        });
      });

      // Photo management row
      const photosBtn = tr.querySelector('.btn-photos');
      if (photosBtn) {
        const photoRow = document.createElement('tr');
        photoRow.className = 'photo-manage-row';
        photoRow.hidden = true;
        const photoTd = document.createElement('td');
        photoTd.colSpan = 10;
        photoTd.className = 'photo-manage-cell';
        photoRow.appendChild(photoTd);

        function renderPhotoRow() {
          const photos = item.images || (item.image ? [item.image] : []);
          if (photos.length === 0) {
            photoRow.hidden = true;
            photosBtn.textContent = '';
            return;
          }
          photoTd.innerHTML = '<div class="photo-manage-grid">' +
            photos.map(function (src, pi) {
              return '<div class="photo-manage-item">' +
                '<img src="' + src + '" alt="Photo ' + (pi + 1) + '" loading="lazy">' +
                '<button class="photo-remove-btn" data-index="' + pi + '" title="Remove this photo" aria-label="Remove photo ' + (pi + 1) + '">✕</button>' +
              '</div>';
            }).join('') +
          '</div>';
          photosBtn.textContent = ' 📷' + photos.length;

          photoTd.querySelectorAll('.photo-remove-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
              var idx = parseInt(btn.dataset.index, 10);
              // Build the full photo list the same way display does
              var photos = item.images ? item.images.slice() : (item.image ? [item.image] : []);
              var removed = photos[idx];

              // Remove from the array
              photos.splice(idx, 1);

              // Update item
              item.images = photos.length > 0 ? photos : undefined;
              item.image = photos.length > 0 ? photos[0] : null;

              // Persist to localStorage
              saveEdit(item.id, 'images', item.images || []);
              saveEdit(item.id, 'image', item.image);

              renderPhotoRow();
              refreshAfterEdit();
            });
          });
        }

        photosBtn.addEventListener('click', function () {
          photoRow.hidden = !photoRow.hidden;
          if (!photoRow.hidden) renderPhotoRow();
        });

        tbody.appendChild(tr);
        tbody.appendChild(photoRow);
        // Skip the normal appendChild below
      }

      // Make editable cells clickable
      tr.querySelectorAll('[data-field]').forEach(td => {
        td.addEventListener('click', () => {
          if (td.querySelector('input, textarea, select, .attendees-edit')) return;
          const field = td.dataset.field;
          const current = item[field];

          if (field === 'organiser') {
            // Show dropdown for organiser
            td.textContent = '';
            td.classList.add('cell-editing');
            const select = document.createElement('select');
            select.style.cssText = 'width:100%;padding:4px 6px;background:var(--color-surface);border:1px solid var(--color-primary);border-radius:4px;color:var(--color-text);font-family:var(--font-body);font-size:0.82rem;';
            const activeOrgMembers = members.filter(m => !m.role.includes('Retired'));
            activeOrgMembers.forEach(m => {
              const opt = document.createElement('option');
              opt.value = m.name;
              opt.textContent = m.name;
              if (m.name === current) opt.selected = true;
              select.appendChild(opt);
            });
            td.appendChild(select);
            select.focus();
            select.addEventListener('change', () => {
              const val = select.value;
              if (val !== current) {
                item.organiser = val;
                saveEdit(item.id, 'organiser', val);
              }
              renderFixTable();
              refreshAfterEdit();
            });
            select.addEventListener('blur', () => {
              renderFixTable();
            });
          } else if (field === 'attendees') {
            // Show checkboxes for attendees
            td.textContent = '';
            td.classList.add('cell-editing');
            const wrap = document.createElement('div');
            wrap.className = 'attendees-edit';
            const currentAttendees = item.attendees || [];
            const editableMembers = members.filter(m => !m.role.includes('Retired'));
            editableMembers.forEach(m => {
              const lbl = document.createElement('label');
              lbl.className = 'attendee-edit-label';
              const cb = document.createElement('input');
              cb.type = 'checkbox';
              cb.value = m.name;
              cb.checked = currentAttendees.includes(m.name);
              lbl.appendChild(cb);
              lbl.appendChild(document.createTextNode(m.name.split(' ')[0]));
              wrap.appendChild(lbl);
            });
            const doneBtn = document.createElement('button');
            doneBtn.className = 'btn-attendee-done';
            doneBtn.textContent = '✓ Done';
            doneBtn.addEventListener('click', (e) => {
              e.stopPropagation();
              const selected = [...wrap.querySelectorAll('input:checked')].map(cb => cb.value);
              item.attendees = selected;
              saveEdit(item.id, 'attendees', selected);
              renderFixTable();
              refreshAfterEdit();
            });
            wrap.appendChild(doneBtn);
            td.appendChild(wrap);
          } else if (field === 'comment') {
            const ta = document.createElement('textarea');
            ta.className = 'admin-table-textarea';
            ta.value = current;
            ta.rows = 3;
            td.textContent = '';
            td.classList.add('cell-editing');
            td.appendChild(ta);
            ta.focus();

            function commitTA() {
              const val = ta.value.trim();
              if (val && val !== current) {
                item[field] = val;
                saveEdit(item.id, field, val);
              }
              renderFixTable();
              refreshAfterEdit();
            }
            ta.addEventListener('blur', commitTA);
            ta.addEventListener('keydown', (e) => {
              if (e.key === 'Escape') { td.textContent = current.substring(0, 80); td.classList.remove('cell-editing'); }
            });
          } else {
            const input = document.createElement('input');
            input.type = 'text';
            input.value = needsEdit(current) ? '' : current;
            input.placeholder = field + '...';
            td.textContent = '';
            td.classList.add('cell-editing');
            td.appendChild(input);
            input.focus();
            input.select();

            function commit() {
              const val = input.value.trim();
              if (val && val !== current) {
                item[field] = val;
                saveEdit(item.id, field, val);
              }
              renderFixTable();
              refreshAfterEdit();
            }

            input.addEventListener('blur', commit);
            input.addEventListener('keydown', (e) => {
              if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
              if (e.key === 'Escape') { td.textContent = current; td.classList.remove('cell-editing'); }
            });
          }
        });
      });

      // Only append tr here if we didn't already in the photo block
      if (!photosBtn) {
        tbody.appendChild(tr);
      }
    });
  }

  // ---- Add New Entry Form ----
  (function () {
    const form = document.getElementById('addForm');
    const addOrganiser = document.getElementById('addOrganiser');
    const msg = document.getElementById('formMessage');
    const toggleBtn = document.getElementById('addToggleBtn');
    const formWrap = document.getElementById('addFormWrap');

    // Toggle form visibility
    toggleBtn.addEventListener('click', () => {
      const showing = !formWrap.hidden;
      formWrap.hidden = showing;
      toggleBtn.classList.toggle('active', !showing);
      toggleBtn.textContent = showing ? '➕ Add New Curry Night' : '✕ Close Form';
    });

    // Populate organiser dropdown from full members list (excluding retired)
    const activeOrgMembers = members.filter(m => !m.role.includes('Retired'));
    activeOrgMembers.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.name;
      opt.textContent = m.name;
      addOrganiser.appendChild(opt);
    });

    // Populate attendees checkboxes (exclude retired members)
    const attendeesContainer = document.getElementById('addAttendees');
    const activeMembers = members.filter(m => !m.role.includes('Retired'));
    const memberNames = activeMembers.map(m => m.name);
    memberNames.forEach(name => {
      const label = document.createElement('label');
      label.className = 'attendee-label';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.value = name;
      cb.checked = true;
      cb.addEventListener('change', () => label.classList.toggle('checked', cb.checked));
      label.appendChild(cb);
      label.appendChild(document.createTextNode(name));
      label.classList.add('checked');
      attendeesContainer.appendChild(label);
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const newId = Math.max(...curryNights.map(r => r.id)) + 1;
      const organiser = addOrganiser.value === '__other__'
        ? prompt('Enter organiser name:') || 'Unknown'
        : addOrganiser.value;

      const entry = {
        id: newId,
        name: document.getElementById('addName').value.trim(),
        location: document.getElementById('addLocation').value.trim(),
        date: document.getElementById('addDate').value,
        organiser: organiser,
        pub: document.getElementById('addPub').value.trim() || 'N/A',
        rating: parseFloat(document.getElementById('addRating').value) || 3,
        comment: document.getElementById('addComment').value.trim() || 'Another great curry night.',
        attendees: [...attendeesContainer.querySelectorAll('input:checked')].map(cb => cb.value),
        image: null
      };

      // Add to runtime array
      curryNights.push(entry);

      // Save to localStorage so it persists
      const edits = loadEdits();
      edits['__added__'] = edits['__added__'] || [];
      edits['__added__'].push(entry);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(edits));

      // Show success
      msg.hidden = false;
      msg.className = 'form-message success';
      msg.textContent = '✅ Curry Night #' + newId + ' added!';

      form.reset();
      renderFixTable();
      refreshAfterEdit();

      // Collapse form after a moment
      setTimeout(() => {
        msg.hidden = true;
        formWrap.hidden = true;
        toggleBtn.classList.remove('active');
        toggleBtn.textContent = '➕ Add New Curry Night';
      }, 3000);
    });
  })();

  // ---- Initial Render ----
  render();

})();
