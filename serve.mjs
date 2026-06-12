import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { readFileSync, existsSync } from 'fs';
import { extname, join, normalize } from 'path';

// minimal .env loader (no dependency)
if (existsSync('.env')) {
  for (const line of readFileSync('.env', 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const root = join(process.cwd(), 'public');
const types = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ico': 'image/x-icon'
};

async function handleApi(req, res) {
  const { default: handler } = await import('./api/chat.js');
  // Vercel-style shims
  let body = '';
  for await (const chunk of req) body += chunk;
  try { req.body = body ? JSON.parse(body) : {}; } catch { req.body = {}; }
  res.status = code => { res.statusCode = code; return res; };
  res.json = obj => { res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(obj)); };
  return handler(req, res);
}

createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p === '/api/chat') return await handleApi(req, res);
    if (p.endsWith('/')) p += 'index.html';
    const file = normalize(join(root, p));
    if (!file.startsWith(root)) { res.writeHead(403); res.end(); return; }
    const data = await readFile(file);
    res.writeHead(200, { 'content-type': types[extname(file).toLowerCase()] || 'application/octet-stream' });
    res.end(data);
  } catch (e) {
    if (req.url === '/api/chat') { res.writeHead(500); res.end('{"error":"server"}'); console.error(e); return; }
    res.writeHead(404); res.end('not found');
  }
}).listen(3000, () => console.log('serving public/ at http://localhost:3000'));
