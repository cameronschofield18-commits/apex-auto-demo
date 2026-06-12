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
      ${v.badge ? `<span class="badge">${v.badge}</span>` : ''}
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

  // lead form (Phase 1: fake success; Phase 2 wires this to the AI follow-up)
  document.getElementById('lead-form').addEventListener('submit', e => {
    e.preventDefault();
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

initHome();
initInventory();
initDetail();
