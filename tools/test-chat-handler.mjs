import handler from '../api/chat.js';

function mockRes() {
  const r = { code: 200, body: null };
  r.status = c => { r.code = c; return r; };
  r.json = o => { r.body = o; return r; };
  return r;
}
const post = body => ({ method: 'POST', body });

let fail = 0;
const check = (name, cond) => { console.log(cond ? 'PASS' : 'FAIL', name); if (!cond) fail++; };

// 1. non-POST -> 405
let r = mockRes();
await handler({ method: 'GET' }, r);
check('GET rejected 405', r.code === 405);

// 2. missing messages -> 400
r = mockRes();
await handler(post({}), r);
check('missing messages 400', r.code === 400);

// 3. too many messages -> 400
r = mockRes();
await handler(post({ messages: Array.from({ length: 21 }, () => ({ role: 'user', content: 'hi' })) }), r);
check('21 messages 400', r.code === 400);

// 4. oversize message -> 400
r = mockRes();
await handler(post({ messages: [{ role: 'user', content: 'x'.repeat(1001) }] }), r);
check('oversize message 400', r.code === 400);

// 5. bad role -> 400
r = mockRes();
await handler(post({ messages: [{ role: 'system', content: 'hi' }] }), r);
check('bad role 400', r.code === 400);

// 6. handler still resolves shape on POST with valid single message (no throw on structure)
r = mockRes();
await handler(post({ messages: [{ role: 'user', content: 'hi' }] }), r).catch(() => {});
check('valid request does not 400', r.code !== 400);

process.exit(fail ? 1 : 0);
