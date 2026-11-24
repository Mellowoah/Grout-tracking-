// Unit tests for the ledger engine. Run: node --test test/
const test=require('node:test');const assert=require('node:assert/strict');
const {computeLedger}=require('../ledger.js');
const CAL=0.86/27;const near=(a,b,m)=>assert.ok(Math.abs(a-b)<0.0005,(m||'')+' expected '+b.toFixed(4)+' got '+(a==null?a:a.toFixed(4)));
const H=(h,m)=>new Date(2026,10,23,h,m).getTime();
const pile=(key,strokes,gf,extra)=>({key,id:key,strokes,groutFinish:gf,...extra});
const truck=(id,seq,arr,extra)=>({id,label:id,seq,qty:9,sample:0,arrived:arr,...extra});

// Nov 23: piles 68-71 = 180/182/184/142 strokes, trucks 688, 651, 2129 (one 1.1 sample on 688), leftover on 2129 wasted
function nov23(over={}){return computeLedger({cal:CAL,
 piles:[pile('68',180,H(10,30)),pile('69',182,H(11,10)),pile('70',184,H(12,10)),pile('71',142,H(12,50))],
 trucks:[truck('688',1,H(10,0),{sample:1.1}),truck('651',2,H(10,50)),truck('2129',3,H(11,55),{close:{pk:'71',type:'waste'}})],
 switches:{},...over})}

test('Nov 23: FIFO split, carryover, waste and balance',()=>{const L=nov23(),u=(t,p)=>L.trucks[t].used[p]||0;
 near(u('688','68'),5.7333);near(u('688','69'),2.1667);near(u('651','69'),3.6304);near(u('651','70'),5.3696);
 near(u('2129','70'),0.4911);near(u('2129','71'),4.5230);
 near(L.trucks['2129'].waste,3.9859,'waste');near(L.totals.balance,0,'balance');
 near(L.piles['69'].carryIn['688'],2.1667);near(L.piles['68'].carryOut['688'],2.1667);
 near(L.piles['70'].carryIn['651'],5.3696);assert.equal(L.piles['70'].carryOut['651'],undefined,'651 ran out on 70');
 near(L.piles['71'].carryIn['2129'],8.5089);assert.deepEqual(Object.keys(L.piles['71'].carryOut),[]);
 assert.deepEqual(L.piles['68'].arrived,{'688':9});assert.deepEqual(L.piles['70'].arrived,{'2129':9});
 near(L.totals.placed,21.9141);assert.equal(L.warnings.length,0,JSON.stringify(L.warnings))});

test('Nov 23 with recorded switch on pile 70 at 168 strokes (651 empty 12:02, 2129 from 12:03)',()=>{
 const L=nov23({switches:{'70':[{from:'651',to:'2129',at:168}]},piles:[pile('68',180),pile('69',182),pile('70',184,null,{phone:184}),pile('71',142)]});
 // 651 had 5.3696 = 168.6 strokes; the switch at 168 puts 168 strokes on 651 and 16 on 2129
 near(L.trucks['651'].used['70'],168*CAL);near(L.trucks['2129'].used['70'],16*CAL);
 near(L.trucks['651'].left['70'],5.3696-168*CAL);near(L.totals.balance,0)});

test('Retrospective entry: strokes typed after the fact re-flow every later pile',()=>{
 const a=nov23(),b=computeLedger({cal:CAL,piles:[pile('68',170),pile('69',182),pile('70',184),pile('71',142)],trucks:[truck('688',1,1,{sample:1.1}),truck('651',2,2),truck('2129',3,3,{close:{pk:'71',type:'waste'}})]});
 near(b.trucks['688'].used['69'],7.9-170*CAL);near(b.trucks['2129'].waste,a.trucks['2129'].waste+10*CAL);near(b.totals.balance,0)});

test('Contractor count higher than phone count goes on the truck feeding at the end',()=>{
 const L=computeLedger({cal:CAL,piles:[pile('1',200,null,{phone:190})],trucks:[truck('A',1,1),truck('B',2,2)],switches:{'1':[{from:'A',to:'B',at:100}]}});
 near(L.trucks.A.used['1'],100*CAL);near(L.trucks.B.used['1'],100*CAL)});

test('Only one sample per 50 yd³: a truck with no recorded sample keeps its full 9',()=>{
 const L=computeLedger({cal:CAL,piles:[pile('1',182),pile('2',182)],trucks:[truck('1',1,1,{sample:1.1}),truck('2',2,2)]});
 near(L.trucks['1'].used['1'],5.7970);near(L.trucks['1'].used['2'],2.1030);near(L.trucks['2'].used['2'],3.6940);near(L.trucks['2'].remaining,5.306)});

test('Typed yardage on a truck wins and the rest of the pile comes from the next truck',()=>{
 const L=computeLedger({cal:CAL,piles:[pile('1',180),pile('2',180)],trucks:[truck('A',1,1,{used:{'2':1}}),truck('B',2,2)]});
 near(L.trucks.A.used['1'],5.7333);near(L.trucks.A.used['2'],1);near(L.trucks.B.used['2'],4.7333)});

test('Truck marked empty early: leftover is flagged, next pile comes from the next truck',()=>{
 const L=computeLedger({cal:CAL,piles:[pile('1',100),pile('2',100)],trucks:[truck('A',1,1,{close:{pk:'1',type:'empty'}}),truck('B',2,2)]});
 near(L.trucks.A.unaccounted,9-100*CAL);near(L.trucks.B.used['2'],100*CAL);assert.ok(L.warnings.some(w=>w.code==='empty-left'));near(L.totals.balance,0)});

test('Sent-back truck feeds nothing and is off the totals',()=>{
 const L=computeLedger({cal:CAL,piles:[pile('1',300)],trucks:[truck('A',1,1),truck('X',2,2,{rejected:true}),truck('B',3,3)]});
 assert.equal(L.trucks.X.usedTotal,0);near(L.trucks.B.used['1'],300*CAL-9);near(L.totals.sentBack,9);near(L.totals.balance,0)});

test('Truck arriving after a pile finished does not feed it; strokes that do not fit show as a gap',()=>{
 const L=computeLedger({cal:CAL,piles:[pile('1',300,H(10,0)),pile('2',10,H(11,0))],trucks:[truck('A',1,H(9,0)),truck('B',2,H(10,30))]});
 assert.equal(L.trucks.B.used['1'],undefined);near(L.piles['1'].gap,300*CAL-9);near(L.trucks.B.used['2'],10*CAL)});

test('Keyed-in truck with no arrival time keeps its place by truck #',()=>{
 const L=computeLedger({cal:CAL,piles:[pile('1',400)],trucks:[truck('A',1,1),truck('B',2,null),truck('C',3,5)]});
 assert.deepEqual(L.piles['1'].feed,['A','B']);near(L.trucks.B.used['1'],400*CAL-9)});

test('Truck on the pump keeps feeding the next pile even if an earlier truck still has grout',()=>{
 const L=computeLedger({cal:CAL,piles:[pile('1',200,null,{phone:200}),pile('2',50)],trucks:[truck('A',1,1),truck('B',2,2)],switches:{'1':[{from:'A',to:'B',at:150}]}});
 near(L.trucks.A.used['1'],150*CAL);near(L.trucks.B.used['2'],50*CAL);assert.equal(L.trucks.A.used['2'],undefined)});

test('Waste recorded with 2-decimal rounding: ledger keeps the true leftover and warns only past 0.01',()=>{
 const L=computeLedger({cal:CAL,piles:[pile('1',140)],trucks:[truck('A',1,1,{qty:6.533,close:{pk:'1',type:'waste',recorded:'2.07'}})]});
 near(L.trucks.A.waste,6.533-140*CAL);assert.equal(L.warnings.length,0)});

test('Missing pump output: no invented yardage',()=>{const L=computeLedger({cal:0,piles:[pile('1',180)],trucks:[truck('A',1,1)]});
 assert.equal(L.piles['1'].demand,null);assert.equal(L.trucks.A.usedTotal,0)});
