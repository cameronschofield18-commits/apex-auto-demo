import { readFileSync } from 'fs';
for (const l of readFileSync('.env', 'utf8').split(/\r?\n/)) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) process.env[m[1]] ??= m[2]; }

const resp = await fetch('http://localhost:3000/api/chat', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    vehicleContext: 'mustang-gt-2022',
    messages: [
      { role: 'user', content: 'I want the Mustang.' },
      { role: 'assistant', content: 'Great choice. Can I get your name and a phone number?' },
      { role: 'user', content: "I'm Dana Reed, 555-220-9931, looking to buy this week." }
    ]
  })
});
const data = await resp.json();
let fail = 0;
const check = (n, c, x) => { console.log(c ? 'PASS' : 'FAIL', n, x ?? ''); if (!c) fail++; };
check('has followups', !!data.followups, JSON.stringify(data).slice(0, 200));
const f = data.followups || {};
check('sms non-empty', typeof f.sms === 'string' && f.sms.length > 0);
check('email subject + body', !!f.email_subject && !!f.email_body);
check('drip is 3 items', Array.isArray(f.drip) && f.drip.length === 3, JSON.stringify(f.drip?.map(d => d.day + d.channel)));
check('drip days [1,3,7]', JSON.stringify((f.drip || []).map(d => d.day)) === '[1,3,7]');
check('sms personalized', /Dana/.test(f.sms) && /Mustang/.test(f.sms), f.sms);
process.exit(fail ? 1 : 0);
