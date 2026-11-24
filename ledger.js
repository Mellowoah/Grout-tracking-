// Grout Tracker ledger engine (v179).
// The ONE place truck yardage is worked out. It reads a plain snapshot of the day and never touches the app,
// the screen or saved records, so the same input always gives the same answer and it can be tested on its own.
//
// Rules (README "Yardage rules"):
//  - A pile's yardage = its confirmed strokes (agreed total, else contractor count, else my count) x pump output.
//  - Each truck holds its load minus the samples recorded on it.
//  - Trucks feed in the order they arrived (then truck #). The truck on the pump at the end of a pile keeps
//    feeding the next pile first. A truck that arrived after a pile's grout finish can't feed that pile.
//  - Yardage typed on a truck for a pile ("used") is taken as is, before anything else.
//  - A recorded truck switch with a stroke count ("at") is evidence of where one truck stopped and the next
//    began. The difference between the phone count and the confirmed count goes on the truck that was
//    feeding at the end. Switches the app guessed (estimated / rebuilt from a typed count) are not evidence.
//  - A truck closes on the pile where it was marked Empty or its leftover was wasted. Leftover on a wasted
//    truck is the waste. Leftover on a truck marked Empty is shown as "unaccounted" so it can be checked.
//  - Sent-back trucks feed nothing and come off the totals.
//  - Nothing is rounded here. Screens and forms round when they show a number.
(function(root){
'use strict';
const EPS=1e-9;
// Typed or older saved yardage is to 0.001, so differences this small are rounding, not a problem worth a warning.
const TOL=0.002;
const n=v=>v===undefined||v===null||v===''||!Number.isFinite(Number(v))?null:Number(v);

function orderTrucks(trucks){
 // Arrival time where it is known. A truck with no arrival time sits right after the truck with the
 // next-lower truck # that has one (trucks are numbered in the order they were added).
 const bySeq=[...trucks].sort((a,b)=>(a.seq||0)-(b.seq||0));
 let lastT=-Infinity;const key=new Map();
 bySeq.forEach((t,i)=>{const a=n(t.arrived);if(a!==null){lastT=a;key.set(t.id,[a,0,t.seq||0,i])}else key.set(t.id,[lastT,1,t.seq||0,i])});
 return [...trucks].sort((a,b)=>{const x=key.get(a.id),y=key.get(b.id);for(let i=0;i<4;i++){if(x[i]!==y[i])return x[i]<y[i]?-1:1}return 0});
}

/**
 * @param {object} day
 *  cal: yd³ per stroke
 *  piles: [{key,id,strokes,phone,groutFinish}] in the order worked. strokes = confirmed count (null if none);
 *         phone = the phone's own count on that pile (for switch evidence); groutFinish = ms (real times only).
 *  trucks: [{id,label,seq,qty,sample,arrived,rejected,used:{pk:yd},close:{pk,type:'empty'|'waste',recorded}}]
 *  switches: {pk:[{to,from,at}]} real switch evidence only.
 */
function computeLedger(day){
 const cal=n(day.cal),calOk=cal!==null&&cal>0;
 const piles=(day.piles||[]).map(p=>({...p}));
 const pIdx=new Map(piles.map((p,i)=>[p.key,i]));
 const warnings=[];
 const T=new Map();
 for(const t of day.trucks||[]){
  const qty=n(t.qty),sample=Math.max(0,n(t.sample)||0);
  const close=t.close&&pIdx.has(t.close.pk)?t.close:null;
  T.set(t.id,{id:t.id,label:t.label||t.id,seq:t.seq||0,qty,sample,arrived:n(t.arrived),rejected:!!t.rejected,
   typed:t.used||{},close,closeIdx:close?pIdx.get(close.pk):Infinity,
   rem:qty===null?0:qty-sample,started:false,firstPk:null,closed:false,
   used:{},left:{},before:{},waste:0,overdrawn:0,unaccounted:0,closeType:null,closedPk:null,lastPk:null});
  if(qty===null&&!t.rejected)warnings.push({code:'no-load',truck:t.id,text:'Truck '+(t.label||'?')+': no load (yd³) entered'});
 }
 const order=orderTrucks([...T.values()]).map(t=>t.id);
 const rank=new Map(order.map((id,i)=>[id,i]));
 const out={cal,calOk,order,piles:{},trucks:{},pileOrder:piles.map(p=>p.key),warnings};
 let feeder=null;

 piles.forEach((p,i)=>{
  const P={key:p.key,id:p.id,strokes:n(p.strokes),demand:0,alloc:{},feed:[],arrived:{},carryIn:{},carryOut:{},samples:{},waste:{},unaccounted:{},gap:0,gapStrokes:0,feederIn:feeder,feederOut:null};
  out.piles[p.key]=P;
  const open=id=>{const t=T.get(id);return t&&!t.rejected&&!t.closed&&t.qty!==null};
  // what each truck held coming into this pile
  for(const id of order){const t=T.get(id);t.before[p.key]=t.rejected||t.closed||t.qty===null?0:t.rem;
   if(t.started&&open(id)&&t.rem>EPS)P.carryIn[id]=t.rem}
  if(P.strokes===null){if(!calOk)P.demand=null}
  else if(!calOk){P.demand=null;warnings.push({code:'no-cal',pile:p.key,text:'Pump output per stroke is not set'})}
  else P.demand=P.strokes*cal;
  const give=(t,yd)=>{if(!(yd>0))return;t.rem-=yd;P.alloc[t.id]=(P.alloc[t.id]||0)+yd;t.used[p.key]=(t.used[p.key]||0)+yd;
   if(!t.started){t.started=true;t.firstPk=p.key;P.arrived[t.id]=t.qty;P.samples[t.id]=t.sample}
   t.lastPk=p.key;if(!P.feed.includes(t.id))P.feed.push(t.id)};
  let need=P.demand===null?0:P.demand;
  // 1. typed yardage
  for(const id of order){const t=T.get(id),v=n(t.typed[p.key]);if(v===null||t.rejected)continue;
   if(t.closed){warnings.push({code:'typed-closed',truck:id,pile:p.key,text:'Truck '+t.label+' was already closed but has yardage typed on pile '+p.id});}
   if(v>0){give(t,v);need-=v}}
  need=Math.max(0,need);
  // 2. who can feed this pile, in feeding order
  const gf=n(p.groutFinish),ev=((day.switches||{})[p.key]||[]).filter(s=>T.has(s.to));
  const forced=new Set(ev.map(s=>s.to));
  const can=id=>{const t=T.get(id);if(!open(id)||n(t.typed[p.key])!==null)return false;if(t.rem<=EPS)return false;
   if(!forced.has(id)&&gf!==null&&t.arrived!==null&&t.arrived>gf)return false;return true};
  let queue=order.filter(can);
  if(feeder&&queue.includes(feeder))queue=[feeder,...queue.filter(id=>id!==feeder)];
  const take=(id,yd)=>{const t=T.get(id);const g=Math.min(Math.max(0,yd),Math.max(0,t.rem));give(t,g);return g};
  const fifo=(from,yd)=>{let i=Math.max(0,queue.indexOf(from));if(from&&queue.indexOf(from)<0)i=0;
   for(;i<queue.length&&yd>EPS;i++){yd-=take(queue[i],yd)}return yd};
  const timed=ev.filter(s=>n(s.at)!==null).sort((a,b)=>n(a.at)-n(b.at));
  if(need>EPS&&calOk&&timed.length){
   // 3a. split at the recorded switch points
   const phone=Math.max(n(p.phone)||0,n(timed[timed.length-1].at)||0);
   const segs=[];let cur=timed[0].from&&T.has(timed[0].from)?timed[0].from:(queue[0]||null),at0=0;
   for(const s of timed){const a=n(s.at);if(a>at0&&cur)segs.push({id:cur,st:a-at0});if(a>=at0)at0=a;cur=s.to}
   segs.push({id:cur,st:Math.max(0,phone-at0)});
   // confirmed vs phone: the difference goes on the truck feeding at the end (too few come off the end first)
   let diff=(P.strokes||0)-(segs.reduce((a,s)=>a+s.st,0)+(P.demand-need)/cal);
   if(diff>=0)segs[segs.length-1].st+=diff;else{for(let k=segs.length-1;k>=0&&diff<0;k--){const c=Math.min(segs[k].st,-diff);segs[k].st-=c;diff+=c}}
   let carry=0,lastId=null;
   for(const s of segs){let yd=s.st*cal+carry;carry=0;if(!s.id||!open(s.id)){carry=yd;continue}
    if(!queue.includes(s.id))queue.push(s.id);const got=take(s.id,yd);carry=yd-got;lastId=s.id;
    // a truck that ran out before the recorded switch hands the rest to the next truck in line
    if(carry>EPS){const nx=queue.filter(id=>id!==s.id&&T.get(id).rem>EPS&&!segs.slice(segs.indexOf(s)+1).some(z=>z.id===id))[0];if(nx){carry-=take(nx,carry)}}}
   need=carry>EPS?fifo(lastId,carry):0;
  } else if(need>EPS){
   // 3b. first in, first out
   need=fifo(null,need);
  }
  if(need>EPS&&P.demand!==null){P.gap=need;P.gapStrokes=calOk?need/cal:null;
   if(!(calOk&&need<cal/2)&&need>TOL)
   warnings.push({code:'gap',pile:p.key,text:'Pile '+(p.id||'?')+': '+(calOk?Math.round(need/cal)+' strokes ('+need.toFixed(3)+' yd³)':need.toFixed(3)+' yd³')+' more than the trucks here had'})}
  // 4. who is on the pump at the end of this pile
  const fed=P.feed.filter(id=>open(id));
  const last=P.feed.length?P.feed[P.feed.length-1]:null;
  feeder=last&&open(last)?last:(feeder&&open(feeder)?feeder:null);
  // 5. trucks closed on this pile
  for(const id of order){const t=T.get(id);if(t.rejected||t.closed||t.closeIdx!==i)continue;
   const left=t.rem;t.closed=true;t.closedPk=p.key;t.closeType=t.close.type;
   if(t.close.type==='waste'){t.waste=Math.max(0,left);P.waste[id]=t.waste;
    const rec=n(t.close.recorded);if(rec!==null&&Math.abs(rec-t.waste)>0.01)warnings.push({code:'waste-diff',truck:id,pile:p.key,text:'Truck '+t.label+': waste recorded '+rec.toFixed(3)+' yd³, ledger leftover '+Math.max(0,left).toFixed(3)+' yd³'})}
   else if(left>0){t.unaccounted=left;P.unaccounted[id]=left;if(left>TOL)warnings.push({code:'empty-left',truck:id,pile:p.key,text:'Truck '+t.label+' marked empty on pile '+(p.id||'?')+' but the strokes leave '+left.toFixed(3)+' yd³ on it'})}
   if(left<0){t.overdrawn=-left;if(-left>TOL)warnings.push({code:'overdraw',truck:id,pile:p.key,text:'Truck '+t.label+' overdrawn by '+(-left).toFixed(3)+' yd³'})}
   t.rem=0;if(feeder===id)feeder=null}
  for(const id of order){const t=T.get(id);t.left[p.key]=t.rejected?0:(t.qty===null?null:t.rem);
   if(t.started&&!t.closed&&!t.rejected&&t.rem>EPS)P.carryOut[id]=t.rem;
   if(!t.closed&&t.rem<-TOL&&t.lastPk===p.key)warnings.push({code:'overdraw',truck:id,pile:p.key,text:'Truck '+t.label+' overdrawn by '+(-t.rem).toFixed(3)+' yd³'})}
  P.feederOut=feeder;
 });
 // closes that point at a pile not in the list (deleted pile) → closed at the end
 let delivered=0,samples=0,placed=0,waste=0,unacc=0,remaining=0,sentBack=0,unused=0,over=0;
 for(const id of order){const t=T.get(id);
  if(t.rejected){sentBack+=t.qty||0;out.trucks[id]=pub(t);continue}
  if(t.qty===null){out.trucks[id]=pub(t);continue}
  delivered+=t.qty;samples+=t.sample;
  const u=Object.values(t.used).reduce((a,b)=>a+b,0);placed+=u;waste+=t.waste;unacc+=t.unaccounted;over+=t.overdrawn;
  if(!t.closed){remaining+=t.rem;if(!t.started)unused+=t.rem}
  out.trucks[id]=pub(t)}
 const gap=Object.values(out.piles).reduce((a,P)=>a+(P.gap||0),0);
 out.totals={delivered,sentBack,samples,placed,waste,unaccounted:unacc,overdrawn:over,remaining,unused,gap,
  balance:delivered-samples-placed-waste-unacc-remaining+over,tolerance:TOL};
 out.feeder=feeder;
 return out;
 function pub(t){return{id:t.id,label:t.label,qty:t.qty,sample:t.sample,rejected:t.rejected,started:t.started,firstPk:t.firstPk,lastPk:t.lastPk,
  closed:t.closed,closedPk:t.closedPk,closeType:t.closeType,used:t.used,left:t.left,before:t.before,
  usedTotal:Object.values(t.used).reduce((a,b)=>a+b,0),waste:t.waste,unaccounted:t.unaccounted,overdrawn:t.overdrawn,remaining:t.closed||t.rejected?0:t.rem}}
}

const api={computeLedger,orderTrucks,version:'179'};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.GroutLedger=api;
})(typeof window!=='undefined'?window:globalThis);
