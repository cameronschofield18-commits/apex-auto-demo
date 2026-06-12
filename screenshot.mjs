import puppeteer from 'puppeteer';
import { readdirSync, mkdirSync } from 'fs';

const url = process.argv[2] || 'http://localhost:3000';
const label = process.argv[3];
const dir = './temporary screenshots';
mkdirSync(dir, { recursive: true });
const n = readdirSync(dir).filter(f => f.startsWith('screenshot-')).length + 1;
const name = `${dir}/screenshot-${n}${label ? '-' + label : ''}.png`;

const browser = await puppeteer.launch();
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 2200, deviceScaleFactor: 1 });
await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
await new Promise(r => setTimeout(r, 800));
await page.screenshot({ path: name, fullPage: true });
await browser.close();
console.log(name);
