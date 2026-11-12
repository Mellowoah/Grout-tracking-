// Headless checks for Grout Tracker at a phone size (390×844).
// Run from the repo root, with the app served (or this file starts it):
//   npm install --no-save playwright-core
//   node test/field.test.mjs
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';

const require = createRequire(import.meta.url);
let pw;
try { pw = require('playwright-core'); }
catch { pw = require('/tmp/pw/node_modules/playwright-core'); }
const { chromium } = pw;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = '/tmp/grout-after';
fs.mkdirSync(outDir, { recursive: true });

const PRELOAD = JSON.stringify([
  'sheets-2026-11-12-piles-42-45',
  'patch-2026-11-12-batch-times',
  'drop-45-2026-11-12',
  'rename-2026-11-12-45-to-46',
  'sheets-2026-11-12-piles-46-48',
  'drop-45-2026-11-12-b',
]);

let fails = 0;
function assert(cond, msg) {
  if (!cond) { fails++; console.error('FAIL', msg); }
  else console.log('ok', msg);
}

function ping(url) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => { res.resume(); resolve(res.statusCode === 200); });
    req.on('error', () => resolve(false));
    req.setTimeout(1000, () => { req.destroy(); resolve(false); });
  });
}
async function startServer() {
  const proc = spawn('python3', ['-m', 'http.server', '8766', '--bind', '127.0.0.1'], { cwd: root, stdio: 'ignore' });
  const url = 'http://127.0.0.1:8766/index.html';
  for (let i = 0; i < 40; i++) {
    if (await ping(url)) return proc;
    await new Promise(r => setTimeout(r, 150));
  }
  proc.kill();
  throw new Error('test server did not start');
}

async function newPage(browser) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const errors = [];
  page.on('pageerror', err => errors.push(String(err)));
  page._errors = errors;
  await page.addInitScript((preload) => {
    localStorage.setItem('groutTracker.preloaded', preload);
    if (navigator.serviceWorker) navigator.serviceWorker.register = () => new Promise(() => {});
  }, PRELOAD);
  await page.goto('http://127.0.0.1:8766/index.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => /Saved on this phone/.test(document.getElementById('save').textContent));
  return page;
}

async function openSection(page, id) {
  const bar = page.locator(`#sec-${id} button.secbar`);
  if ((await bar.getAttribute('aria-expanded')) !== 'true') {
    await bar.evaluate(el => el.scrollIntoView({ block: 'center' }));
    await bar.click();
  }
}

const server = await startServer();
const browser = await chromium.launch({
  executablePath: '/usr/bin/google-chrome',
  args: ['--headless=new', '--no-sandbox', '--disable-dev-shm-usage'],
});

try {
  // --- layout: pour order, tray, padding, tap targets ---
  {
    const page = await newPage(browser);
    await page.screenshot({ path: path.join(outDir, '01-empty.png') });
    const order = await page.evaluate(() => [...document.querySelectorAll('main section')].map(s => s.id));
    assert(order.join(',') === 'sec-setup,sec-arrival,sec-pump,sec-qc,sec-stages,sec-close', 'sections follow the pour: ' + order.join(','));
    const open = await page.evaluate(() => [...document.querySelectorAll('main section')].filter(s => !s.classList.contains('shut')).map(s => s.id));
    assert(open.join(',') === 'sec-setup', 'only pile setup starts open, got ' + open.join(','));
    assert(await page.locator('#tray #plus').count() === 1, '+1 lives in the bottom tray');
    assert(await page.locator('#tray').locator('text=Next pile').count() === 0, 'Next pile is not in the tray');
    const pad = await page.evaluate(() => parseFloat(getComputedStyle(document.body).paddingBottom));
    const trayH = await page.evaluate(() => document.getElementById('tray').getBoundingClientRect().height);
    assert(Math.abs(pad - trayH) < 2, `body padding ${pad} matches tray ${trayH}`);
    assert(pad > 80 && Math.abs(pad - 290) > 20, `padding follows the tray (${pad}), not the old fixed 290px`);
    await page.click('#fold');
    const padShut = await page.evaluate(() => parseFloat(getComputedStyle(document.body).paddingBottom));
    const trayShut = await page.evaluate(() => document.getElementById('tray').getBoundingClientRect().height);
    assert(padShut < pad - 40 && Math.abs(padShut - trayShut) < 2, `folded tray shrinks padding (${pad} → ${padShut})`);
    await page.click('#fold');
    for (const id of ['arrival', 'pump', 'qc', 'stages', 'close']) await openSection(page, id);
    const small = await page.evaluate(() => [...document.querySelectorAll('button,input,select,summary')].filter(el => {
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) return false;
      const s = getComputedStyle(el);
      if (s.display === 'none' || s.visibility === 'hidden') return false;
      return r.height < 43.5;
    }).map(el => ({ id: el.id, tag: el.tagName, h: Math.round(el.getBoundingClientRect().height), t: (el.innerText || el.getAttribute('aria-label') || '').slice(0, 40) })));
    assert(small.length === 0, 'every visible control is at least 44px tall' + (small.length ? ' ' + JSON.stringify(small) : ''));
    const fold = await page.locator('#fold').boundingBox();
    assert(fold && fold.width >= 300 && fold.height >= 44, `fold control is wide (${fold && Math.round(fold.width)}×${fold && Math.round(fold.height)})`);
    assert(page._errors.length === 0, 'no page errors on load: ' + page._errors.join(' | '));
    await page.close();
  }

  // --- cutoff: batch 10 min after arrival, limit 3 min, must not alert now ---
  {
    const page = await newPage(browser);
    const result = await page.evaluate(() => {
      S.limit = 3;
      A.arrive();
      const t = S.trucks[S.trucks.length - 1];
      const d = new Date(t.arrived + 10 * 60000);
      t.batch = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
      const co = cutoff(t);
      tick();
      const alert = document.getElementById('alert');
      const midnightArrived = new Date(2026, 10, 13, 0, 10, 0).getTime();
      S.limit = 120;
      const overnight = cutoff({ batch: '23:50', arrived: midnightArrived });
      const expectOvernight = new Date(2026, 10, 12, 23, 50, 0).getTime() + 120 * 60000;
      S.limit = 3;
      const sameDay = cutoff({ batch: '10:10', arrived: new Date(2026, 10, 13, 10, 0, 0).getTime() });
      const expectSame = new Date(2026, 10, 13, 10, 10, 0).getTime() + 3 * 60000;
      return {
        co, arrived: t.arrived, now: Date.now(),
        alertOn: alert.style.display !== 'none',
        alertText: alert.textContent,
        overnight, expectOvernight, sameDay, expectSame,
      };
    });
    assert(result.co > result.now + 8 * 60000, `cutoff is about 13 min ahead, not already passed (in ${(result.co - result.now) / 60000} min)`);
    assert(!result.alertOn && !/Cutoff reached/.test(result.alertText), 'no immediate cutoff alert when batch is 10 min after arrival');
    assert(result.overnight === result.expectOvernight, 'batch 23:50 and arrival 00:10 rolls back one day');
    assert(result.sameDay === result.expectSame, 'batch 10 min after a 10:00 arrival stays on that day');
    await page.close();
  }

  // --- yardage: thousandths, 2-decimal equation that adds up, clean Excel numbers ---
  {
    const page = await newPage(browser);
    await page.waitForFunction(() => window.XLSX, null, { timeout: 15000 }).catch(() => {});
    const math = await page.evaluate(() => {
      S.cal = '0.05'; S.calUnit = 'yd3'; S.sampleYd = 1.1; S.sampleEvery = 50; S.pile.id = '42';
      A.arrive();
      const t = S.trucks[S.trucks.length - 1];
      t.qty = '10'; t.num = 'A';
      A.sw(t.id);
      for (let i = 0; i < 83; i++) stroke(1);
      A.sample(t.id); A.sample(t.id);
      t.waste = '0.5'; t.wastePk = S.pile.key;
      // A second truck with no sample due: one Sample taken must add 1.1.
      A.arrive();
      const b = S.trucks[S.trucks.length - 1];
      b.qty = '10'; b.num = 'B';
      const before = sy(b);
      const label = sampleActionLabel(b);
      A.sample(b.id);
      const after = sy(b);
      closeSeg();
      render();
      const eq = document.getElementById('ydeq-' + t.id);
      const text = eq.textContent.replace(/\s+/g, ' ');
      const nums = text.match(/\d+\.\d{2}/g).map(Number);
      return { text, nums, left: eq.getAttribute('data-left'), raw: leftAfter(t, S.pile.key), sy: sy(t), used: usedOn(t, S.pile.key), before, after, label };
    });
    assert(math.raw === 3.15 && Number(math.left).toFixed(3) === '3.150', `remaining is 3.150 thousandths, got raw ${math.raw} data-left ${math.left}`);
    assert(math.sy === 2.2 && math.used === 4.15, `used 4.15 and two samples 2.2, got used ${math.used} sample ${math.sy}`);
    assert(math.nums.length >= 5 && math.nums[0] === 10 && math.nums[1] === 4.15 && math.nums[2] === 2.2 && math.nums[3] === 0.5 && math.nums[4] === 3.15, 'equation shows 10.00 − 4.15 − 2.20 − 0.50 = 3.15 (' + math.text + ')');
    const sum = Math.round((math.nums[0] - math.nums[1] - math.nums[2] - math.nums[3]) * 100) / 100;
    assert(sum === math.nums[4], `shown equation adds up (${sum} vs ${math.nums[4]})`);
    assert(math.before === 0 && math.after === 1.1 && /−1\.10/.test(math.label), `Sample taken on a truck with no sample due adds 1.10 (before ${math.before}, after ${math.after}, label ${math.label})`);
    await openSection(page, 'arrival');
    await page.screenshot({ path: path.join(outDir, '02-equation-315.png') });

    const excel = await page.evaluate(() => {
      if (!window.XLSX) return { missing: true };
      let captured = null;
      const orig = XLSX.write;
      XLSX.write = function (wb, opts) {
        const cell = wb.Sheets.Trucks_QC && Object.values(wb.Sheets.Trucks_QC).find(c => c && c.v === 3.15 || (c && typeof c.v === 'number' && c.v.toFixed && c.v.toFixed(3) === '3.150'));
        captured = {
          rows: XLSX.utils.sheet_to_json(wb.Sheets.Trucks_QC, { raw: true }),
          yardage: XLSX.utils.sheet_to_json(wb.Sheets.Pile_yardage, { raw: true }),
          leftCell: wb.Sheets.Trucks_QC.G2 || null,
        };
        // Find the LeftOnTruck cell by header.
        const ws = wb.Sheets.Trucks_QC;
        const ref = XLSX.utils.decode_range(ws['!ref']);
        let col = -1;
        for (let c = ref.s.c; c <= ref.e.c; c++) {
          const h = ws[XLSX.utils.encode_cell({ r: 0, c })];
          if (h && h.v === 'LeftOnTruckYd3') col = c;
        }
        const cells = [];
        for (let r = 1; r <= ref.e.r; r++) {
          const cell = ws[XLSX.utils.encode_cell({ r, c: col })];
          if (cell) cells.push({ v: cell.v, t: cell.t, z: cell.z, s: String(cell.v) });
        }
        captured.lefts = cells;
        return orig.apply(this, arguments);
      };
      exportX();
      XLSX.write = orig;
      return captured;
    });
    assert(!excel.missing, 'Excel library loaded');
    if (!excel.missing) {
      const left = excel.lefts.find(c => c.t === 'n' && Math.abs(c.v - 3.15) < 1e-6);
      assert(!!left, 'Excel has a 3.15 left-on-truck cell, got ' + JSON.stringify(excel.lefts));
      if (left) {
        assert(left.z === '0.000', 'Excel yardage cell format is 0.000, got ' + left.z);
        assert(left.s.length < 8 && left.v.toFixed(3) === '3.150', `Excel value is a clean 3.150, got ${left.s}`);
      }
    }
    await page.close();
  }

  // --- T-7: ticket 10, 10 strokes, leaves 8.50 (not 8.499) ---
  {
    const page = await newPage(browser);
    const t7 = await page.evaluate(() => {
      // 0.15 yd³/stroke makes 10 strokes exactly 1.50. Truck 7 is past the 50 yd³ sample marks.
      S.cal = '0.15'; S.calUnit = 'yd3'; S.sampleYd = 1.1; S.sampleEvery = 50; S.pile.id = '7';
      for (let i = 0; i < 6; i++) { A.arrive(); S.trucks[S.trucks.length - 1].qty = '10'; }
      A.arrive();
      const t = S.trucks[S.trucks.length - 1];
      t.num = 'T-7'; t.qty = '10';
      const due = sy(t);
      A.sw(t.id);
      for (let i = 0; i < 10; i++) stroke(1);
      render();
      const eq = document.getElementById('ydeq-' + t.id);
      return { due, raw: leftAfter(t, S.pile.key), text: eq.textContent.replace(/\s+/g, ' '), left: eq.getAttribute('data-left') };
    });
    assert(t7.due === 0, 'T-7 has no sample due (cumulative already passed 50)');
    assert(Number(t7.raw).toFixed(3) === '8.500', `T-7 ticket 10 with 10 strokes leaves 8.500, got ${t7.raw}`);
    assert(/8\.50/.test(t7.text) && !/8\.499/.test(t7.text), 'T-7 displays 8.50 (' + t7.text + ')');
    const nums = t7.text.match(/\d+\.\d{2}/g).map(Number);
    const sum = Math.round((nums[0] - nums[1] - nums[2] - nums[3]) * 100) / 100;
    assert(nums[4] === 8.5 && sum === 8.5, `T-7 equation adds up to 8.50 (${t7.text})`);
    await page.close();
  }

  // --- Clear all wipes the IndexedDB mirror, reload stays empty ---
  {
    const page = await newPage(browser);
    await page.evaluate(() => { S.pile.id = 'KEEPME'; save(); render(); });
    await page.waitForTimeout(450);
    const mirrored = await page.evaluate(async () => {
      const db = await pdb();
      const row = await new Promise(res => { const q = db.transaction('s').objectStore('s').get('state'); q.onsuccess = () => res(q.result || null); q.onerror = () => res(null); });
      await new Promise((res, rej) => { const tx = db.transaction('p', 'readwrite'); tx.objectStore('p').put(new Blob(['pic']), 'pic1'); tx.oncomplete = res; tx.onerror = () => rej(tx.error); });
      return !!(row && row.j && row.j.includes('KEEPME'));
    });
    assert(mirrored, 'backup copy in IndexedDB has the pile before clear');
    await openSection(page, 'close');
    await page.locator('#rs').evaluate(el => el.scrollIntoView({ block: 'center' }));
    await page.click('#rs');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
      page.click('#rs'),
    ]);
    await page.waitForFunction(() => /Saved on this phone/.test(document.getElementById('save').textContent));
    const after = await page.evaluate(async () => {
      const db = await pdb();
      const row = await new Promise(res => { const q = db.transaction('s').objectStore('s').get('state'); q.onsuccess = () => res(q.result || null); q.onerror = () => res(null); });
      const pic = await new Promise(res => { const q = db.transaction('p').objectStore('p').get('pic1'); q.onsuccess = () => res(q.result || null); q.onerror = () => res(null); });
      let ls = null; try { ls = localStorage.getItem('groutTracker.v1'); } catch (e) {}
      return { id: S.pile.id, trucks: S.trucks.length, ls, mirror: row && row.j, pic: !!pic };
    });
    assert(after.id === '' && after.trucks === 0 && !(after.ls || '').includes('KEEPME'), `reload stays cleared (id "${after.id}", trucks ${after.trucks})`);
    assert(!after.mirror && !after.pic, 'IndexedDB state and photos stay cleared');
    await page.close();
  }

  // --- full pour, one-handed tray, skipped steps flagged, next pile is two taps ---
  {
    const page = await newPage(browser);
    const taps = [];
    const click = async (sel) => { taps.push(sel); await page.locator(sel).evaluate(el => el.scrollIntoView({ block: 'center' })); await page.click(sel); };
    await page.fill('#f-pile', '42');
    await page.locator('#f-pile').evaluate(el => el.blur());
    await page.waitForTimeout(50);
    await click('#sec-arrival .secbody button:has-text("Truck arrival")');
    await openSection(page, 'pump'); taps.push('open-pump');
    await click('#sec-pump .secbody button:has-text("Feed pump")');
    await click('#plus'); await click('#plus'); await click('#plus');
    await click('#undoStroke');
    await click('#tmark');
    await click('#tmiss');
    await openSection(page, 'qc'); taps.push('open-qc');
    await click('#sec-qc .secbody button:has-text("Sample taken")');
    await openSection(page, 'stages'); taps.push('open-stages');
    await click('#sec-stages .secbody button:has-text("Grout return")');
    await click('#sec-stages .secbody button:has-text("Grout finish")');
    const review = await page.locator('#review').innerText();
    assert(/batch time/i.test(review), 'closeout lists the skipped batch time');
    assert(/not stamped|filled in automatically|stage/i.test(review), 'closeout lists open stage times');
    const strokesBefore = await page.evaluate(() => S.strokes);
    await page.locator('#np').evaluate(el => el.scrollIntoView({ block: 'center' }));
    await page.click('#np'); taps.push('#np');
    const still = await page.evaluate(() => S.pile.id);
    assert(still === '42', 'first Next pile tap does not leave the pile');
    await page.click('#np'); taps.push('#np-confirm');
    await page.waitForTimeout(100);
    const after = await page.evaluate(() => ({ id: S.pile.id, strokes: S.strokes, piles: S.piles.length, prev: S.piles[0] && S.piles[0].id }));
    assert(after.id === '43' && after.strokes === 0 && after.prev === '42', `next pile started (${JSON.stringify(after)})`);
    assert(strokesBefore === 2, 'live count is +1 three times and one undo = 2, got ' + strokesBefore);
    const marks = await page.evaluate(() => S.piles[0] ? null : null);
    const markCount = await page.evaluate(() => S.ev.filter(e => e.type === 'depth_mark').length);
    assert(markCount === 2, 'mark and missed mark both logged, got ' + markCount);
    await page.screenshot({ path: path.join(outDir, '03-next-pile.png') });
    // Tray shot from mid-pour is more useful; grab a pumping frame by stepping back via undo? The new pile is fine.
    // Re-open the finished pile and screenshot the tray with the count still on that record.
    await page.evaluate(() => { const p = S.piles[0]; if (p) A.openPile(p.key); });
    await page.waitForTimeout(100);
    await page.screenshot({ path: path.join(outDir, '04-pour-tray.png') });
    console.log('POUR_TAPS', taps.length, taps.join(' > '));
    assert(page._errors.length === 0, 'no page errors in the pour: ' + page._errors.join(' | '));
    await page.close();
  }
} finally {
  await browser.close();
  server.kill();
}

if (fails) { console.error(fails + ' failed'); process.exit(1); }
console.log('all checks passed');
