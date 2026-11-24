// End-to-end tests: the real app page in a headless browser, driven through the same actions the buttons,
// the clicker and the forms use. Run: node --test test/   (needs: npm i playwright && npx playwright install chromium)
const test=require('node:test');const assert=require('node:assert/strict');
const http=require('node:http');const fs=require('node:fs');const path=require('node:path');
const {chromium}=require('playwright');
const ROOT=path.join(__dirname,'..');const CAL=0.86/27;
const near=(a,b,m)=>assert.ok(a!=null&&Math.abs(a-b)<0.0015,(m||'')+': expected '+b.toFixed(3)+' got '+a);
const TYPES={'.html':'text/html','.js':'text/javascript','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png'};
let server,base,browser;
test.before(async()=>{server=http.createServer((q,r)=>{let f=decodeURIComponent(q.url.split('?')[0]);if(f==='/')f='/index.html';const p=path.join(ROOT,f);
  if(!p.startsWith(ROOT)||!fs.existsSync(p)){r.writeHead(404);return r.end()}r.writeHead(200,{'Content-Type':TYPES[path.extname(p)]||'application/octet-stream'});fs.createReadStream(p).pipe(r)});
 await new Promise(r=>server.listen(0,r));base='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch(process.env.CHROME?{executablePath:process.env.CHROME}:{})});
test.after(async()=>{await browser?.close();server?.close()});

async function open(profile,seed){const ctx=await browser.newContext({serviceWorkers:'block'});const page=await ctx.newPage();
 const errs=[];page.on('pageerror',e=>errs.push(String(e)));page.on('dialog',d=>d.accept());
 // block the external Excel library so the test never needs the network
 await page.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.abort());
 if(seed){await page.goto(base+'/manifest.webmanifest');await page.evaluate(([k,v])=>localStorage.setItem(k,v),['groutTracker.v1:'+profile,JSON.stringify(seed)])}
 await page.goto(base+'/index.html?profile='+profile);await page.waitForFunction(()=>typeof A==='object'&&typeof LG==='function');
 page.errs=errs;page.appErrors=()=>page.evaluate(()=>errList());return page}

// Everything a report shows for one pile, read through the same functions the paper form uses.
const report=page=>page.evaluate(()=>{const L=LG();const txt=v=>v&&v.html!=null?v.html.replace(/<[^>]+>/g,'').trim():String(v??'');
 return{L,form:L.pileOrder.map(k=>{const m=midVals(k),o={};for(const f in m)o[f]=txt(m[f]);return{pile:pname(k),...o}}),
  trucks:Object.fromEntries(S.trucks.map(t=>[t.num||t.seq,{used:usedAll(t),left:calc(t).rem,waste:LG().trucks[t.id].waste}])),
  rebalance:dayRebalanceH().replace(/<[^>]+>/g,' ')}});

test('Live clicker day: 4 piles 180/182/184/142, trucks 688 → 651 → 2129',async()=>{
 const page=await open('sim-live');
 await page.evaluate(()=>{const tap=n=>{for(let i=0;i<n;i++)stroke(1)};
  const arrive=num=>{A.arrive();const t=S.trucks[S.trucks.length-1];A.setT(t.id,'num',num);return t};
  A.cfg('pile','68');
  const t1=arrive('688');A.sample(t1.id);
  A.stage('drillStart');A.stage('drillFinish');tap(180);A.stage('groutFinish');
  A.newPile();arrive('651');A.stage('drillStart');A.stage('drillFinish');tap(182);A.stage('groutFinish');
  A.newPile();arrive('2129');A.stage('drillStart');A.stage('drillFinish');tap(184);A.stage('groutFinish');
  A.newPile();A.stage('drillStart');A.stage('drillFinish');tap(142);A.stage('groutFinish');
  A.waste(S.trucks.find(t=>t.num==='2129').id);render()});
 const R=await report(page),T=R.L.trucks,id=n=>R.L.order.find(i=>R.L.trucks[i].label==='688'&&n==='688'||R.L.trucks[i].label===n);
 const used=(n,p)=>{const P=R.L.pileOrder.find(k=>R.L.piles[k].id===p);return T[id(n)].used[P]||0};
 near(used('688','68'),5.7333,'688 on 68');near(used('688','69'),2.1667,'688 on 69');near(used('651','69'),3.6304,'651 on 69');
 near(used('651','70'),5.3696,'651 on 70');near(used('2129','70'),0.4911,'2129 on 70');near(used('2129','71'),4.5230,'2129 on 71');
 near(T[id('2129')].waste,3.9859,'2129 waste');near(R.L.totals.balance,0,'balance');near(R.L.totals.samples,1.1,'one sample');
 const F=Object.fromEntries(R.form.map(f=>[f.pile,f]));
 assert.equal(F['68'].ARRIVED,'9.000');assert.equal(F['68'].USED,'5.733');assert.match(F['68']['CARRY OVER OUT'],/^2\.166/);
 assert.match(F['69']['CARRY OVER INTO'],/^2\.166/);assert.equal(F['69'].ARRIVED,'9.000');assert.equal(F['69'].USED,'5.797');assert.match(F['69']['CARRY OVER OUT'],/^5\.369/);
 assert.match(F['70']['CARRY OVER INTO'],/^5\.369/);assert.equal(F['70'].USED,'5.861');assert.match(F['70']['CARRY OVER OUT'],/^8\.508/);
 assert.match(F['71']['CARRY OVER INTO'],/^8\.508/);assert.equal(F['71'].USED,'4.523');assert.equal(F['71'].WASTE,'3.986');assert.equal(F['71']['CARRY OVER OUT']||'','');
 assert.doesNotMatch(R.rebalance,/mismatch/i);
 // every form, the QC sheet, End day and Excel rows build with no error
 await page.evaluate(()=>{for(const k of orderKeys()){showForm(k,false,false);showForm(k,true,true)}endDayOpen&&endDayOpen();remoteOpen();remRender();remoteClose()});
 assert.deepEqual(page.errs,[]);assert.deepEqual(await page.appErrors(),[]);
 // close the app and open it again: the saved day gives the same ledger
 await page.reload();await page.waitForFunction(()=>typeof LG==='function');
 const again=await page.evaluate(()=>LG().totals);assert.deepEqual(again,R.L.totals);
 await page.context().close()});

test('Retrospective entry: counting off, trucks keyed in afterwards, pump counts typed, then corrected',async()=>{
 const page=await open('sim-retro');
 await page.evaluate(()=>{S.noCount=true;
  const add=(num,hm)=>{A.addTruck();const t=S.trucks[S.trucks.length-1];A.setT(t.id,'num',num);A.setTime(t.id,'arrived',hm);return t};
  const t1=add('688','08:10');A.sample(t1.id);add('651','08:55');add('2129','09:40');
  const day=[['68','180'],['69','182'],['70','184'],['71','142']];
  day.forEach(([id,n],i)=>{if(i)A.newPile();A.cfg('pile',id);A.stageSet('drillStart',String(8+i)+':20');A.stageSet('drillFinish',String(8+i)+':23');A.stageSet('groutFinish',String(8+i)+':30');A.pset('opCount',n)});
  render()});
 let R=await report(page);near(R.L.trucks[R.L.order[2]].used[R.L.pileOrder[2]],0.4911,'2129 on 70');near(R.L.totals.balance,0);
 // correction after the fact: pile 69 was really 172 (contractor's sheet) → every later pile and truck re-flows
 await page.evaluate(()=>{const k=orderKeys()[1];A.oldSet(k,'opCount','172');render()});
 R=await report(page);const T=R.L.trucks,P=R.L.pileOrder;
 near(T[R.L.order[1]].used[P[1]],172*CAL-2.1667,'651 on 69 after fix');near(T[R.L.order[1]].used[P[2]],9-(172*CAL-2.1667),'651 on 70 after fix');
 near(R.L.piles[P[3]].carryIn[R.L.order[2]],9-(184*CAL-(9-(172*CAL-2.1667))),'2129 carry into 71');near(R.L.totals.balance,0);
 // waste at the end of the day through End day
 await page.evaluate(()=>{A.waste(S.trucks.find(t=>t.num==='2129').id);render()});R=await report(page);
 near(R.L.trucks[R.L.order[2]].waste,27-1.1-(180+172+184+142)*CAL,'waste after fix');near(R.L.totals.balance,0);
 assert.deepEqual(page.errs,[]);assert.deepEqual(await page.appErrors(),[]);await page.context().close()});

test('Truck changes mid-pile: manual switch, empty with grout still on, sent-back truck',async()=>{
 const page=await open('sim-switch');
 await page.evaluate(()=>{const tap=n=>{for(let i=0;i<n;i++)stroke(1)};const arrive=num=>{A.arrive();const t=S.trucks[S.trucks.length-1];A.setT(t.id,'num',num);return t};
  A.cfg('pile','68');const a=arrive('688');A.sample(a.id);arrive('999');const b=arrive('651');
  truckReject(S.trucks.find(t=>t.num==='999').id,'Wrong mix','');
  A.stage('drillStart');A.stage('drillFinish');tap(150);A.empty(a.id);tap(30);A.stage('groutFinish');render()});
 const R=await report(page),T=R.L.trucks,k=R.L.pileOrder[0],byNum=n=>R.L.order.find(i=>T[i].label===n);
 near(T[byNum('688')].used[k],150*CAL,'688 to the empty tap');near(T[byNum('651')].used[k],30*CAL,'651 after the switch');
 near(T[byNum('688')].unaccounted,7.9-150*CAL,'688 leftover flagged');assert.equal(T[byNum('999')].usedTotal,0);near(R.L.totals.balance,0);
 assert.ok(R.L.warnings.some(w=>w.code==='empty-left'));assert.deepEqual(page.errs,[]);assert.deepEqual(await page.appErrors(),[]);await page.context().close()});

test('Saved data from earlier versions still opens: Nov 12 day',async()=>{
 const seed=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures','2026-11-12-day.json'),'utf8'));
 const page=await open('sim-nov12',seed);
 const R=await report(page);
 assert.equal(R.L.pileOrder.length,7);near(R.L.totals.balance,0,'balance');
 // the real problem in that day's record is shown, not hidden: truck 2 was closed with grout still on it
 assert.deepEqual(R.L.warnings.map(w=>w.code),['empty-left']);near(R.L.totals.unaccounted,0.784,'truck 2 leftover');
 // nothing in the saved record was rewritten just by opening it
 const after=await page.evaluate(()=>JSON.parse(localStorage.getItem(KEY)));
 assert.deepEqual(after.trucks.map(t=>[t.id,t.qty,t.waste,t.wastePk]),seed.trucks.map(t=>[t.id,t.qty,t.waste,t.wastePk]));
 assert.equal(after.piles.length,seed.piles.length);
 await page.evaluate(()=>{for(const k of orderKeys())showForm(k,false,false)});
 assert.deepEqual(page.errs,[]);assert.deepEqual(await page.appErrors(),[]);await page.context().close()});

test('Small round Undo button undoes the last thing done',async()=>{
 const page=await open('sim-undo');
 await page.evaluate(()=>{A.cfg('pile','68');A.arrive();const t=S.trucks[0];A.setT(t.id,'num','688');histAt=0});
 assert.equal(await page.isVisible('#undoDot'),true);
 // a small circle in the bottom bar that does not cover the pile number or any button
 const box=await page.evaluate(()=>{const b=$('undoDot').getBoundingClientRect(),t=$('tray').getBoundingClientRect(),hit=[...document.querySelectorAll('#tray button,#tp')].some(x=>{const r=x.getBoundingClientRect();return r.width&&!(r.right<=b.left||r.left>=b.right||r.bottom<=b.top||r.top>=b.bottom)});
  return{w:b.width,h:b.height,clear:b.top>=t.top&&b.bottom<=t.bottom&&!hit,r:getComputedStyle($('undoDot')).borderRadius}});
 assert.ok(box.w<=44&&box.h<=44&&box.clear&&box.r==='50%',JSON.stringify(box));
 await page.evaluate(()=>{histAt=0;A.arrive();histAt=0});
 assert.equal(await page.evaluate(()=>S.trucks.length),2);
 await page.click('#undoDot');
 assert.equal(await page.evaluate(()=>S.trucks.length),1,'second truck arrival undone');
 assert.equal(await page.evaluate(()=>S.trucks[0].num),'688','earlier work kept');
 assert.deepEqual(page.errs,[]);await page.context().close()});

// Steps forgotten or tapped late, and pump strokes typed in from a hand counter after reinforcing starts.
async function day(page,fn){return page.evaluate(fn=>{const clock={t:new Date(2026,10,24,8,0).getTime()};Date.now=()=>clock.t;const adv=m=>clock.t+=m*60000;
 const arrive=num=>{A.arrive();const t=S.trucks[S.trucks.length-1];A.setT(t.id,'num',num);return t};
 const times=k=>{const st=stages(pileRec(k)),o={};for(const x in st)o[x]=hm(st[x].t)+(st[x].est?' est':'');return o};
 return (new Function('adv','arrive','times','return ('+fn+')()'))(adv,arrive,times)},String(fn))}

test('Forgot drill start and finish: pump on is grout start, drill times filled in (est) in order',async()=>{
 const page=await open('sim-forgot-drill');
 const r=await day(page,()=>{A.cfg('pile','68');const t=arrive('688');A.sample(t.id);adv(5);A.pump();adv(7);A.stage('groutFinish');adv(1);A.stage('reinfStart');A.pset('opCount','180');return{times:times(S.pile.key),pumping:S.pumping}});
 assert.deepEqual(r.times,{groutStart:'08:05',groutFinish:'08:12',reinfStart:'08:13',drillFinish:'08:05 est',drillStart:'08:02 est',reinfFinish:'08:28 est'});
 assert.equal(r.pumping,false);assert.deepEqual(page.errs,[]);await page.context().close()});

test('Forgot grout finish: reinforce start stops the pump and grout finish = reinforce start; next pile is not pumping',async()=>{
 const page=await open('sim-forgot-gf');
 const r=await day(page,()=>{A.cfg('pile','68');const t=arrive('688');A.sample(t.id);adv(5);A.stage('drillStart');adv(3);A.stage('drillFinish');adv(9);A.stage('reinfStart');
  const a={times:times(S.pile.key),pumping:S.pumping};adv(15);A.stage('reinfFinish');A.pset('opCount','180');adv(3);A.newPile();return{...a,next:S.pumping}});
 assert.equal(r.times.groutFinish,'08:17 est');assert.equal(r.times.reinfStart,'08:17');assert.equal(r.pumping,false);assert.equal(r.next,false);
 assert.deepEqual(page.errs,[]);await page.context().close()});

test('Step tapped late is not stamped out of order',async()=>{
 const page=await open('sim-late-tap');
 const r=await day(page,()=>{A.cfg('pile','68');arrive('688');adv(5);A.pump();adv(7);A.stage('groutFinish');adv(2);A.stage('drillStart');return{real:S.pile.st.drillStart||null,times:times(S.pile.key),msg:$('msg').textContent}});
 assert.equal(r.real,null);assert.equal(r.times.drillStart,'08:02 est');assert.match(r.msg,/not stamped/);
 assert.deepEqual(page.errs,[]);await page.context().close()});

test('Hand-counter strokes typed after reinforce start, fixed after the next pile started: times untouched, yardage re-flows',async()=>{
 const page=await open('sim-hand-counter');
 const r=await day(page,()=>{const out={};A.cfg('pile','68');const t1=arrive('688');A.sample(t1.id);
  const pileDay=(id,n)=>{A.cfg('pile',id);adv(2);A.stage('drillStart');adv(3);A.stage('drillFinish');adv(7);A.stage('groutFinish');A.stage('reinfStart');adv(2);A.pset('opCount',n);adv(13);A.stage('reinfFinish')};
  pileDay('68','180');adv(2);A.newPile();arrive('651');pileDay('69','182');const k68=orderKeys()[0];out.before=times(k68);
  adv(5);A.newPile();A.cfg('pile','70');A.oldSet(k68,'opCount','178');out.after=times(k68);
  const L=LG();out.u68=L.trucks[t1.id].used[k68];out.bal=L.totals.balance;out.pumping=S.pumping;out.warn=L.warnings.length;return out});
 assert.deepEqual(r.after,r.before,'stage times not changed by typing strokes');near(r.u68,178*CAL,'688 on 68 after fix');near(r.bal,0);
 assert.equal(r.pumping,false);assert.equal(r.warn,0);assert.deepEqual(page.errs,[]);await page.context().close()});

test('Some clicker taps, then the hand-counter total typed in: the typed total wins, no double count',async()=>{
 const page=await open('sim-mixed');
 const r=await day(page,()=>{A.cfg('pile','68');const t=arrive('688');A.stage('drillStart');adv(3);A.stage('drillFinish');for(let i=0;i<40;i++)stroke(1);adv(7);A.stage('groutFinish');A.stage('reinfStart');A.pset('myCount','180');
  return{n:confStrokes(S.pile.key).n,used:LG().trucks[t.id].used[S.pile.key]}});
 assert.equal(r.n,180);near(r.used,180*CAL);assert.deepEqual(page.errs,[]);await page.context().close()});

test('Field sheet: forms feed the trucks list; waste yes/no and truck edits re-run the automatic numbers',async()=>{
 const page=await open('sim-field-sheet');
 const r=await page.evaluate(()=>{const fill=v=>{formGrid({},'');for(const k in v)$('fg-'+k).value=v[k];formApply(false);scanClose()};const o={};
  A.cfg('pile','68');fill({pdate:'2026-11-24',drillStart:'08:15',drillFinish:'08:18',groutFinish:'08:25',reinfStart:'08:25',total:'180','num-0':'688','arrived-0':'08:10','batch-0':'07:40'});
  A.newPile();A.cfg('pile','69');fill({pdate:'2026-11-24',drillStart:'08:40',drillFinish:'08:43',groutFinish:'08:50',reinfStart:'08:50',total:'182','num-0':'688','num-1':'651','arrived-1':'08:35','emptied-0':'08:45'});
  S.fullTools=false;render();o.text=$('simple-trucks').innerText;o.feed=$('app').innerText;o.stat=$('stat').innerText;o.active=tname(tk(S.active));o.fed=S.trucks.map(t=>t.num+':'+!!t.fed).join(',');
  const t651=S.trucks.find(t=>t.num==='651');[...document.querySelectorAll('#simple-trucks button')].find(b=>b.textContent==='Wasted'&&b.getAttribute('onclick').includes(t651.id)).click();
  const L=LG();o.waste=L.trucks[t651.id].waste;o.wastePile=pname(L.trucks[t651.id].closedPk);o.text2=$('simple-trucks').innerText;
  [...document.querySelectorAll('#simple-trucks button')].find(b=>b.textContent==='No waste').click();o.after=LG().trucks[t651.id].remaining;
  // edit the load: the automatic numbers follow
  A.setT(t651.id,'qty','8');o.left8=LG().trucks[t651.id].remaining;o.bal=LG().totals.balance;o.screen=S.fullTools;return o});
 assert.match(r.text,/Truck 688[\s\S]*arrived 08:10[\s\S]*Pile 68 5\.733 · Pile 69 3\.267/);assert.match(r.text,/Truck 651[\s\S]*arrived 08:35[\s\S]*Pile 69 2\.530/);
 // the pile shows which trucks fed it, and the truck still holding grout is on the pump (not "none")
 assert.match(r.feed,/Pile 69 fed by: 688 3\.267 · 651 2\.530/);assert.match(r.feed,/On the pump: truck 651/);assert.equal(r.active,'651');assert.equal(r.fed,'688:true,651:true');assert.doesNotMatch(r.stat,/none/);
 near(r.waste,9-2.5304,'651 waste');assert.equal(r.wastePile,'69');assert.match(r.text2,/Leftover wasted: 6\.470/);
 near(r.after,9-2.5304,'no waste: leftover back on the truck');near(r.left8,8-2.5304,'load edited');near(r.bal,0);assert.equal(r.screen,false);
 assert.deepEqual(page.errs,[]);assert.deepEqual(await page.appErrors(),[]);await page.context().close()});
