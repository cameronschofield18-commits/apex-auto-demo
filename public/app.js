// Apex Auto Group — shared rendering

const fmtPrice = n => '$' + n.toLocaleString('en-US');
const fmtMiles = n => n.toLocaleString('en-US') + ' mi';

async function loadInventory() {
  const res = await fetch('data/inventory.json');
  const data = await res.json();
  return data.vehicles;
}

function cardHTML(v) {
  return `
  <a class="vcard" href="vehicle.html?id=${v.id}">
    <div class="vcard-media">
      ${v.badge ? `<span class="badge${v.badge === 'Price drop' ? ' badge-hot' : ''}">${v.badge}</span>` : ''}
      <img src="${v.img}" alt="${v.year} ${v.make} ${v.model}" loading="lazy">
    </div>
    <div class="vcard-body">
      <div class="vcard-title">${v.year} ${v.make} ${v.model} <span class="trim">${v.trim}</span></div>
      <div class="vcard-meta">
        <span class="chip">${fmtMiles(v.mileage)}</span>
        <span class="chip">${v.transmission}</span>
        <span class="chip">${v.drivetrain}</span>
      </div>
      <div class="vcard-foot">
        <span class="price">${fmtPrice(v.price)}</span>
        <span class="vcard-cta">Check availability &rarr;</span>
      </div>
    </div>
  </a>`;
}

/* ---------- home: featured ---------- */
async function initHome() {
  const el = document.getElementById('featured');
  if (!el) return;
  const vehicles = await loadInventory();
  const featured = ['mclaren-720s-2019', 'huracan-2017', 'mustang-gt-2022']
    .map(id => vehicles.find(v => v.id === id))
    .filter(Boolean);
  el.innerHTML = featured.map(cardHTML).join('');
}

/* ---------- inventory page ---------- */
async function initInventory() {
  const grid = document.getElementById('grid');
  if (!grid) return;
  const vehicles = await loadInventory();

  const makeSel = document.getElementById('f-make');
  const priceSel = document.getElementById('f-price');
  const sortSel = document.getElementById('f-sort');
  const count = document.getElementById('count');

  [...new Set(vehicles.map(v => v.make))].sort().forEach(m => {
    const o = document.createElement('option');
    o.value = m; o.textContent = m;
    makeSel.appendChild(o);
  });

  function render() {
    let list = [...vehicles];
    if (makeSel.value) list = list.filter(v => v.make === makeSel.value);
    if (priceSel.value) {
      const [lo, hi] = priceSel.value.split('-').map(Number);
      list = list.filter(v => v.price >= lo && v.price <= hi);
    }
    const sorts = {
      'price-asc': (a, b) => a.price - b.price,
      'price-desc': (a, b) => b.price - a.price,
      'miles-asc': (a, b) => a.mileage - b.mileage,
      'year-desc': (a, b) => b.year - a.year
    };
    list.sort(sorts[sortSel.value] || sorts['price-asc']);
    grid.innerHTML = list.map(cardHTML).join('');
    count.textContent = list.length + ' of ' + vehicles.length + ' vehicles';
  }

  [makeSel, priceSel, sortSel].forEach(s => s.addEventListener('change', render));
  render();
}

/* ---------- vehicle detail ---------- */
async function initDetail() {
  const root = document.getElementById('vd-root');
  if (!root) return;
  const vehicles = await loadInventory();
  const id = new URLSearchParams(location.search).get('id');
  const v = vehicles.find(x => x.id === id) || vehicles[0];

  document.title = `${v.year} ${v.make} ${v.model} — Apex Auto Group`;
  const img = document.getElementById('vd-img');
  img.src = v.img;
  img.alt = `${v.year} ${v.make} ${v.model}`;
  document.getElementById('vd-badge').textContent = v.badge || 'In stock';
  document.getElementById('vd-name').textContent = `${v.year} ${v.make} ${v.model}`;
  document.getElementById('vd-sub').textContent = `${v.trim} · ${v.exterior} over ${v.interior}`;
  document.getElementById('vd-blurb').textContent = v.blurb;
  document.getElementById('vd-price').textContent = fmtPrice(v.price);

  const specs = [
    ['Mileage', fmtMiles(v.mileage)],
    ['Engine', v.engine],
    ['Transmission', v.transmission],
    ['Drivetrain', v.drivetrain],
    ['Economy', v.mpg],
    ['Exterior', v.exterior]
  ];
  document.getElementById('vd-specs').innerHTML = specs
    .map(([l, val]) => `<div class="spec"><div class="sl">${l}</div><div class="sv">${val}</div></div>`)
    .join('');

  document.getElementById('vd-features').innerHTML = v.features
    .map(f => `<li>${f}</li>`).join('');

  // payment estimator
  const down = document.getElementById('est-down');
  const monthly = document.getElementById('est-monthly');
  const downLabel = document.getElementById('est-down-label');
  down.max = Math.max(1000, Math.round(v.price * 0.5 / 500) * 500);
  function calc() {
    const principal = Math.max(0, v.price - Number(down.value));
    const r = 0.079 / 12, n = 72;
    const m = principal > 0 ? principal * r / (1 - Math.pow(1 + r, -n)) : 0;
    monthly.textContent = '$' + Math.round(m).toLocaleString('en-US') + '/mo';
    downLabel.textContent = fmtPrice(Number(down.value));
  }
  down.addEventListener('input', calc);
  calc();

  // lead form: store like chat leads so the Phase 4 dashboard sees both sources
  document.getElementById('lead-form').addEventListener('submit', e => {
    e.preventDefault();
    const entry = {
      name: document.getElementById('lf-name').value.trim(),
      contact: document.getElementById('lf-phone').value.trim(),
      vehicle_id: v.id,
      note: document.getElementById('lf-msg').value.trim() || 'Is this still available?',
      ts: new Date().toISOString(),
      source: 'form'
    };
    try {
      const all = JSON.parse(localStorage.getItem('apex-leads') || '[]');
      all.push(entry);
      localStorage.setItem('apex-leads', JSON.stringify(all));
    } catch {}
    document.getElementById('lf-success').style.display = 'block';
  });

  // similar vehicles: same make first, then nearest price
  const similar = vehicles
    .filter(x => x.id !== v.id)
    .sort((a, b) =>
      (b.make === v.make) - (a.make === v.make) ||
      Math.abs(a.price - v.price) - Math.abs(b.price - v.price))
    .slice(0, 3);
  document.getElementById('similar').innerHTML = similar.map(cardHTML).join('');
}

/* ---------- home: dash cluster ---------- */
const GAUGE_MIN = -120, GAUGE_MAX = 120, GAUGE_SCALE = 12;
const angleFor = n => GAUGE_MIN + (Math.min(n, GAUGE_SCALE) / GAUGE_SCALE) * (GAUGE_MAX - GAUGE_MIN);

function runGauge(count) {
  const needle = document.getElementById('needle');
  const num = document.getElementById('gauge-num');
  const setAngle = a => needle.setAttribute('transform', `rotate(${a} 110 118)`);
  const settled = angleFor(count);

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    setAngle(settled);
    num.textContent = count;
    return;
  }

  const SWEEP_UP = 700, SWEEP_BACK = 900;
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  const start = performance.now();

  function frame(now) {
    const t = now - start;
    if (t < SWEEP_UP) {
      setAngle(GAUGE_MIN + easeOut(t / SWEEP_UP) * (GAUGE_MAX - GAUGE_MIN));
      num.textContent = Math.round(easeOut(t / SWEEP_UP) * GAUGE_SCALE);
      requestAnimationFrame(frame);
    } else if (t < SWEEP_UP + SWEEP_BACK) {
      const p = easeOut((t - SWEEP_UP) / SWEEP_BACK);
      setAngle(GAUGE_MAX + p * (settled - GAUGE_MAX));
      num.textContent = Math.round(GAUGE_SCALE + p * (count - GAUGE_SCALE));
      requestAnimationFrame(frame);
    } else {
      num.textContent = count;
      breathe();
    }
  }

  function breathe() {
    const t0 = performance.now();
    (function loop(now) {
      setAngle(settled + Math.sin((now - t0) / 1400) * 0.8);
      requestAnimationFrame(loop);
    })(t0);
  }

  requestAnimationFrame(frame);
}

async function initDashHero() {
  if (!document.getElementById('gauge')) return;
  const vehicles = await loadInventory();
  runGauge(vehicles.length);

  const list = document.getElementById('featured-list');
  list.innerHTML = vehicles.map(v => `
    <a class="feat-row" href="vehicle.html?id=${v.id}">
      <img src="${v.img.replace('w=1400', 'w=160')}" alt="${v.year} ${v.make} ${v.model}" loading="lazy">
      <span class="fr-name">${v.year} ${v.make} ${v.model}</span>
      <span class="fr-price">${fmtPrice(v.price)}</span>
    </a>`).join('');

  const comms = document.getElementById('comms-list');
  const rand = (a, b) => a + Math.floor(Math.random() * (b - a));
  const makeEvent = () => {
    const v = vehicles[rand(0, vehicles.length)];
    return Math.random() < 0.35
      ? `<div class="comms-row"><span>Reply sent · ${v.model}</span><span class="c-ok">ok</span></div>`
      : `<div class="comms-row"><span>Inquiry: ${v.model}</span><span class="c-val">${rand(20, 59)}s</span></div>`;
  };
  for (let i = 0; i < 3; i++) comms.insertAdjacentHTML('afterbegin', makeEvent());
  let leadPinnedUntil = 0;
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    setInterval(() => {
      if (Date.now() < leadPinnedUntil) return;
      comms.insertAdjacentHTML('afterbegin', makeEvent());
      while (comms.children.length > 4) comms.lastElementChild.remove();
    }, 4000);
  }

  // real leads from the chat widget take visual priority
  document.addEventListener('apex-lead', e => {
    const lead = e.detail;
    const v = vehicles.find(x => x.id === lead.vehicle_id);
    comms.insertAdjacentHTML('afterbegin',
      `<div class="comms-row comms-lead"><span>Lead: ${lead.name}${v ? ' · ' + v.model : ''}</span><span class="c-val">now</span></div>`);
    while (comms.children.length > 4) comms.lastElementChild.remove();
    leadPinnedUntil = Date.now() + 30000;
  });
}

initHome();
initInventory();
initDetail();
initDashHero();
