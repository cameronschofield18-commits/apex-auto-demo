import puppeteer from 'puppeteer';

const BASE = process.env.E2E_BASE || 'http://localhost:3000';
const b = await puppeteer.launch();
const pg = await b.newPage();
await pg.goto(BASE + '/vehicle.html?id=mustang-gt-2022', { waitUntil: 'networkidle0' });

async function ensureOpen() {
  const visible = await pg.evaluate(() => document.getElementById('chat-panel').checkVisibility());
  if (!visible) await pg.click('#chat-fab');
}

async function say(text) {
  await ensureOpen();
  await pg.type('#chat-input', text);
  const before = await pg.$$eval('.chat-assistant:not(.chat-typing)', els => els.length);
  await pg.click('.chat-send');
  await pg.waitForFunction(
    n => document.querySelectorAll('.chat-assistant:not(.chat-typing)').length > n,
    { timeout: 45000 }, before
  );
  return pg.$$eval('.chat-assistant:not(.chat-typing)', els => els.at(-1).textContent);
}

let fail = 0;
const check = (name, cond, extra) => { console.log(cond ? 'PASS' : 'FAIL', name, extra ?? ''); if (!cond) fail++; };

const r1 = await say('Is this Mustang still available? What does it cost?');
check('answers with real price', /42,?990/.test(r1), '| ' + r1);

const r2 = await say("Great. I'm Sam Walker, you can reach me at 555-301-7788. I'd like to see it this week.");
check('reply confirms follow-up', r2.length > 0, '| ' + r2);

await new Promise(r => setTimeout(r, 500));
const leads = await pg.evaluate(() => JSON.parse(localStorage.getItem('apex-leads') || '[]'));
check('lead stored', leads.length === 1 && /Sam/.test(leads[0].name) && /7788/.test(leads[0].contact), JSON.stringify(leads));
check('lead has vehicle context', leads[0]?.vehicle_id === 'mustang-gt-2022', leads[0]?.vehicle_id);

const fu = leads[0]?.followups;
check('followups stored on lead', !!fu && typeof fu.sms === 'string' && fu.sms.length > 0, JSON.stringify(fu)?.slice(0, 120));
check('drip is 3 items days 1/3/7', Array.isArray(fu?.drip) && JSON.stringify(fu.drip.map(d => d.day)) === '[1,3,7]');

// phone overlay rendered the instant SMS
await pg.waitForSelector('#fu-overlay:not([hidden]) .fu-bubble .fu-text', { timeout: 8000 });
const phoneSms = await pg.$eval('#fu-overlay .fu-bubble .fu-text', el => el.textContent);
check('phone shows instant SMS', phoneSms.length > 0, phoneSms.slice(0, 50));

// fast-forward replays all 3 drip items
await pg.click('#fu-ff');
await pg.waitForFunction(() => document.querySelectorAll('#fu-overlay .fu-bubble, #fu-overlay .fu-email').length >= 4, { timeout: 8000 });
const total = await pg.$$eval('#fu-overlay .fu-bubble, #fu-overlay .fu-email', els => els.length);
check('fast-forward shows instant + 3 drip', total === 4, 'total=' + total);

await b.close();
process.exit(fail ? 1 : 0);
