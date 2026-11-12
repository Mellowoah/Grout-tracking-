// Grout Tracker offline cache. Bump VERSION when you upload a changed index.html.
const VERSION='grout-v53';
const SHELL=['./','index.html','manifest.webmanifest','icon-180.png','icon-192.png','icon-512.png'];
const XLSX_URL='https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
self.addEventListener('install',e=>e.waitUntil(caches.open(VERSION).then(async c=>{
 await c.addAll(SHELL.map(u=>new Request(u,{cache:'reload'}))); // skip the browser's HTTP cache so a new version really lands
 try{await c.add(new Request(XLSX_URL,{mode:'cors'}))}catch(_){}}).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
const fresh=r=>{const u=new URL(r.url);return r.mode==='navigate'||(u.origin===location.origin&&/(\/|index\.html|preload\.json)$/.test(u.pathname))};
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET')return;
 e.respondWith(caches.open(VERSION).then(async c=>{
  // The app page itself: newest from the network when there is signal (4 s limit), the saved copy when there isn't.
  if(fresh(r)){try{const res=await Promise.race([fetch(r,{cache:'no-store'}),new Promise((_,rej)=>setTimeout(()=>rej(new Error('slow')),4000))]);
    if(res&&res.ok){c.put(r,res.clone());return res}}catch(_){}
   const hit=await c.match(r,{ignoreSearch:true})||(r.mode==='navigate'?await c.match('index.html'):null);return hit||new Response('',{status:504})}
  // Everything else (icons, reader files, fonts): saved copy first, refreshed in the background.
  const hit=await c.match(r,{ignoreSearch:true});
  const net=fetch(r).then(res=>{if(res&&(res.ok||res.type==='opaque'))c.put(r,res.clone());return res}).catch(()=>null);
  if(hit){e.waitUntil(net);return hit}
  const res=await net;return res||new Response('',{status:504})}))});
