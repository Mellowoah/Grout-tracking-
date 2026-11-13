// Grout Tracker offline support.
// The page registers this as sw.js?v=<APPV>, so bumping APPV in index.html is the only version to change.
// - The app page: newest from the network when there's signal (4 s limit), the saved copy when there isn't.
// - Everything else (icons, fonts, Excel export, form pictures, ticket reader): saved copy first, refreshed in the background.
const VERSION='grout-'+(new URL(self.location).searchParams.get('v')||'0');
const SHELL=['./','index.html','manifest.webmanifest','icon-180.png','icon-192.png','icon-512.png'];
// Small helper files saved up front so Email/Text pictures and Excel work with no signal (best effort).
// The big ticket-reader files (~7 MB) are saved the first time a ticket is scanned.
const EXTRA=['ocr/html2canvas.min.js','ocr/tesseract.min.js','ocr/worker.min.js',
 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'];

self.addEventListener('install',e=>e.waitUntil(caches.open(VERSION).then(async c=>{
 await c.addAll(SHELL.map(u=>new Request(u,{cache:'reload'}))); // skip the browser's HTTP cache so a new version really lands
 // carry over anything the last version already saved (reader files, fonts) so it isn't downloaded again
 for(const k of await caches.keys()){if(k===VERSION||!k.startsWith('grout-'))continue;const old=await caches.open(k);
  for(const r of await old.keys()){if(SHELL.some(u=>new URL(u,self.location).href===r.url.split('?')[0]))continue;const res=await old.match(r);if(res)await c.put(r,res)}}
 await Promise.all(EXTRA.map(u=>c.add(new Request(u,u.startsWith('http')?{mode:'cors'}:{cache:'reload'})).catch(()=>{})));
}).then(()=>self.skipWaiting())));

self.addEventListener('activate',e=>e.waitUntil(caches.keys()
 .then(ks=>Promise.all(ks.filter(k=>k!==VERSION&&k.startsWith('grout-')).map(k=>caches.delete(k))))
 .then(()=>self.clients.claim())));

const isPage=r=>{const u=new URL(r.url);return r.mode==='navigate'||(u.origin===location.origin&&/(\/|index\.html|preload\.json)$/.test(u.pathname))};
const timeout=(p,ms)=>Promise.race([p,new Promise((_,rej)=>setTimeout(()=>rej(new Error('slow')),ms))]);

self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET'||!/^https?:/.test(r.url))return;
 e.respondWith(caches.open(VERSION).then(async c=>{
  if(isPage(r)){
   try{const res=await timeout(fetch(r,{cache:'no-store'}),4000);
    if(res&&res.ok){const copy=res.clone();e.waitUntil(c.put(r,copy.clone()).then(()=>r.mode==='navigate'?c.put('index.html',copy):null));return res}}catch(_){}
   const hit=await c.match(r,{ignoreSearch:true})||(r.mode==='navigate'?await c.match('index.html'):null);
   return hit||new Response('Offline and not saved yet. Open the app once with signal.',{status:504,headers:{'content-type':'text/plain'}})}
  const hit=await c.match(r,{ignoreSearch:true});
  const net=fetch(r).then(res=>{if(res&&(res.ok||res.type==='opaque'))c.put(r,res.clone());return res}).catch(()=>null);
  if(hit){e.waitUntil(net);return hit}
  const res=await net;return res||new Response('',{status:504})}))});
