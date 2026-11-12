'use strict';
// Skill tree, points and starting loadout.
// Points (Save.d.cr) are earned when a mission is completed: the full total the first time a mission is cleared, 30% of it on any later clear.
// Nodes (Save.d.sk[id]=1) are bought once and kept. Branches are a diamond: node I, then two nodes of tier II, then node III which needs ONE of the two (any:1), so tier II is a real choice.
// Costs follow the strength of each node. The old per-weapon WEAPON UPGRADES screen is gone: weapon stats (damage, magazine, handling, piercing, reach, swing speed) are now group nodes in this tree
// (SHORT GUNS, LONG GUNS, HEAVY GUNS, MELEE and the launcher nodes of EXPLOSIVES). WGRP below lists which weapons each group changes.
// Save.d.skv marks the tree layout: below 2 every skill point is refunded once (see skEnsure) because nodes were removed and re-priced; below 3 the old per-weapon upgrade levels (Save.d.sw) are deleted with no refund.
// Effects are applied at every mission load by G.applyUp(): it restores the base values (WEAP0, CY0, SAND0, TSC0) and scales them, so nothing stacks between runs.
// Branch ch: 0 = the node only does something for GHOST, 1 = only for DIO, missing = both.
const SKILLS=[
{id:'body',n:'BODY',nodes:[
{id:'b1',n:'REINFORCED',d:'Max HP +20',c:300,req:[]},
{id:'b2a',n:'FLEET',d:'Move speed +8%',c:500,req:['b1']},
{id:'b2b',n:'QUICK DODGE',d:'Dodge cooldown -20%',c:500,req:['b1']},
{id:'b3',n:'SUBDERMAL ARMOR',d:'Damage taken -15%',c:1200,req:['b2a','b2b'],any:1}]},
{id:'cmb',n:'COMBAT',nodes:[
{id:'g1',n:'STEADY HANDS',d:'Gun spread -20%',c:300,req:[]},
{id:'g3',n:'AMMO CACHE',d:'Reserve ammo +40%',c:600,req:['g1']},
{id:'m3',n:'SILENT STEPS',d:'Melee noise -50%',c:400,req:['g1']}]},
{id:'sg',n:'SHORT GUNS',sub:'Pistol \u00b7 Revolver \u00b7 SMG',nodes:[
{id:'sg1',n:'HOLLOW POINT',d:'Short guns damage +20%',c:500,req:[]},
{id:'sg2a',n:'EXTENDED CLIPS',d:'Short guns magazine +40%',c:500,req:['sg1']},
{id:'sg2b',n:'FAST DRAW',d:'Short guns: shots 15% faster, reload 20% faster',c:600,req:['sg1']},
{id:'sg3',n:'PENETRATOR',d:'Short gun bullets pass through +1 enemy',c:900,req:['sg2a','sg2b'],any:1}]},
{id:'lg',n:'LONG GUNS',sub:'Shotgun \u00b7 Assault Rifle \u00b7 Sniper',nodes:[
{id:'lg1',n:'AP ROUNDS',d:'Long guns damage +20%',c:500,req:[]},
{id:'lg2a',n:'DRUM MAGS',d:'Long guns magazine +40%',c:500,req:['lg1']},
{id:'lg2b',n:'TUNED ACTION',d:'Long guns: shots 15% faster, reload 20% faster',c:600,req:['lg1']},
{id:'lg3',n:'DEEP PIERCE',d:'Long gun bullets pass through +1 enemy',c:900,req:['lg2a','lg2b'],any:1}]},
{id:'hv',n:'HEAVY GUNS',sub:'Heavy MG \u00b7 Railgun',nodes:[
{id:'hv1',n:'HEAVY LOAD',d:'Heavy guns damage +20%',c:500,req:[]},
{id:'hv2a',n:'BELT FEED',d:'Heavy guns magazine +40%',c:500,req:['hv1']},
{id:'hv2b',n:'COOLED BARREL',d:'Heavy guns: shots 15% faster, reload 20% faster',c:600,req:['hv1']},
{id:'hv3',n:'OVERPENETRATION',d:'Heavy MG bullets pass through +1 enemy (Railgun already passes all)',c:700,req:['hv2a','hv2b'],any:1}]},
{id:'ml',n:'MELEE',sub:'Fists \u00b7 Club \u00b7 Pipe \u00b7 Knife \u00b7 Katana \u00b7 Hammer \u00b7 Knives',nodes:[
{id:'ml1',n:'EDGE',d:'Melee and knives damage +20%',c:400,req:[]},
{id:'ml2a',n:'QUICK SWING',d:'Melee swing and knife volley 15% faster',c:500,req:['ml1']},
{id:'ml2b',n:'EXTENDED GRIP',d:'Melee reach +12%',c:500,req:['ml1']}]},
{id:'exp',n:'EXPLOSIVES',nodes:[
{id:'e1',n:'BIGGER CHARGE',d:'Blast radius +15%',c:300,req:[]},
{id:'e2a',n:'PAYLOAD',d:'Blast damage +20%',c:600,req:['e1']},
{id:'e2b',n:'BANDOLIER',d:'+2 grenades per pickup, +2 rocket reserve',c:500,req:['e1']},
{id:'e3',n:'SAFE DISTANCE',d:'Own blasts hurt you 50% less',c:600,req:['e2a','e2b'],any:1},
{id:'e4a',n:'LAUNCHER MAGS',d:'Grenade Launcher magazine +30%',c:500,req:['e3']},
{id:'e4b',n:'LAUNCHER LOADER',d:'Grenade Launcher: shots 15% faster, reload 20% faster',c:500,req:['e3']}]},
{id:'gho',n:'GHOST SKILL',ch:0,nodes:[
{id:'s1',n:'HEAT SINK',d:'Cyberpsycho builds 20% slower',c:300,req:[]},
{id:'s2a',n:'COOLANT',d:'Cyberpsycho drains faster (15s to 10s)',c:600,req:['s1']},
{id:'s2b',n:'OVERCLOCK',d:'Sandevistan run speed x1.5 to x1.65',c:600,req:['s1']},
{id:'s3',n:'STASIS',d:'World slows to 3% in Sandevistan (was 5%)',c:800,req:['s2a','s2b'],any:1}]},
{id:'dio',n:'DIO SKILL',ch:1,nodes:[
{id:'d1',n:'CAPACITOR',d:'Time stop energy 10s to 12s',c:300,req:[]},
{id:'d2a',n:'REGEN',d:'Energy regen +30%',c:500,req:['d1']},
{id:'d2b',n:'QUICK START',d:'Time stop needs 0.5s of energy (was 1s)',c:400,req:['d1']},
{id:'d3',n:'STAND POWER',d:'Knife damage +20%',c:1000,req:['d2a','d2b'],any:1}]}];
// Weapons you can take along into a mission: id, mission that must be cleared first (0-based).
const LOADOUT=[{id:'revolver',lv:0},{id:'sniper',lv:1},{id:'hammer',lv:1},{id:'hmg',lv:1},{id:'katana',lv:2},{id:'grenade',lv:2},{id:'rail',lv:2},{id:'gren',lv:2},{id:'rocket',lv:3}];
const CY0={...CY},SAND0={...SAND},TSC0={...TSC};
const skNode=id=>{for(const b of SKILLS)for(const n of b.nodes)if(n.id===id)return n;return null};
const skOwn=id=>!!(Save.d.sk&&typeof Save.d.sk==='object'&&Save.d.sk[id]===1);
// A node can be bought when its prerequisites are owned: all of them, or at least one when the node has any:1.
const skOpen=n=>!n.req.length||(n.any?n.req.some(skOwn):n.req.every(skOwn));
// Prices before the rebalance (by tier), used only to refund old saves once.
const SK_OLD=id=>/^[a-z]1$/.test(id)?300:/^[a-z]2[ab]$/.test(id)?600:/^[a-z]3$/.test(id)?1000:0;
const skEnsure=()=>{if(!Save.d.sk||typeof Save.d.sk!=='object')Save.d.sk={};Save.d.cr=Math.max(0,Math.floor(+Save.d.cr||0));
if(!(Save.d.skv>=2)){let r=0;for(const id in Save.d.sk)if(Save.d.sk[id]===1)r+=SK_OLD(id);Save.d.sk={};Save.d.cr+=r;Save.d.skv=2;Save.save()}
if(Save.d.skv<3){delete Save.d.sw;Save.d.skv=3;Save.save()}};
const loOpen=w=>!!Save.d.best[w.lv];

// Weapon groups changed by the group nodes (ids from WEAP). Knives (DIO) are in the melee group. Gun nodes: <prefix>1 damage, <prefix>2a magazine, <prefix>2b handling, <prefix>3 piercing.
const WGRP={sg:['pistol','revolver','smg'],lg:['shotgun','rifle','sniper'],hv:['hmg','rail'],ml:['fist','club','pipe','knife','katana','hammer','knives']};
const grpApply=o=>{
for(const p of['sg','lg','hv'])for(const id of WGRP[p]){const W=WEAP[id];
if(o(p+'1'))W.dmg=Math.round(W.dmg*1.2);
if(o(p+'2a'))W.mag=Math.max(W.mag,Math.round(W.mag*1.4));
if(o(p+'2b')){W.rate*=.85;W.rl*=.8}
// pr is the number of enemies a bullet can hit in total (engine meaning); the Railgun (pf) already passes all of them.
if(o(p+'3')&&!W.pf)W.pr=(W.pr>1?W.pr:1)+1}
for(const id of WGRP.ml){const W=WEAP[id];
if(o('ml1'))W.dmg=Math.round(W.dmg*1.2);
if(o('ml2a')){if(W.kn)W.rate*=.85;else W.cd*=.85}
if(o('ml2b')&&!W.kn)W.reach=Math.round(W.reach*1.12)}
const L=WEAP.gren;if(o('e4a'))L.mag=Math.max(L.mag,Math.round(L.mag*1.3));if(o('e4b')){L.rate*=.85;L.rl*=.8}};

Object.assign(G,{
fxSpd:1,fxDcd:1,fxTaken:1,
applyUp(){skEnsure();const o=skOwn,p=this.p,ch=this.char;
for(const k in WEAP0){const W=WEAP[k];for(const q in W)if(!(q in WEAP0[k]))delete W[q];Object.assign(W,WEAP0[k])}Object.assign(CY,CY0);Object.assign(SAND,SAND0);Object.assign(TSC,TSC0);
for(const id in WEAP){const W=WEAP[id];
if(W.kn){if(ch===1&&o('d3'))W.dmg=Math.round(W.dmg*1.2)}
else if(W.melee){if(o('m3'))W.nz=Math.round(W.nz*.5)}
else if(W.gr){if(o('e2b'))W.mag+=2}
else if(W.rk){if(o('e2b'))W.res+=2}
else{if(o('g1'))W.sp*=.8;if(o('g3'))W.res=Math.round(W.res*1.4)}}
grpApply(o);
if(ch===0){if(o('s1'))CY.fill=12;if(o('s2a'))CY.drain=10;if(o('s2b'))SAND.haste=1.65;if(o('s3'))SAND.slow=.03}
if(ch===1){if(o('d1'))TSC.max=12;if(o('d2a'))TSC.regen=.65;if(o('d2b'))TSC.min=.5}
this.fxSpd=o('b2a')?1.08:1;this.fxDcd=o('b2b')?.8:1;this.fxTaken=o('b3')?.85:1;
this.exFx={R:Math.round(96*(o('e1')?1.15:1)),dm:o('e2a')?1.2:1,sf:o('e3')?.5:1};
p.mhp=100+(o('b1')?20:0);p.hp=p.mhp;p.tm=TSC.max;
const lo=LOADOUT.find(w=>w.id===Save.d.lo);if(lo&&loOpen(lo)&&!p.ws.some(q=>q.id===lo.id)){const W=WEAP[lo.id];p.ws.push({id:lo.id,mag:0,res:0})}
for(const q of p.ws){const W=WEAP[q.id];if(!W.melee&&!W.kn){q.mag=W.mag;q.res=W.res}}}});
// ---- hooks
{const base=G.load;G.load=function(i){base.call(this,i);this.applyUp()}}
{const base=G.hurt;G.hurt=function(d){return base.call(this,d*(this.fxTaken||1))}}
{const base=G.updPlayer;G.updPlayer=function(dt){const p=this.p,d0=p.dcd;base.call(this,dt);if(this.fxDcd!==1&&p.dcd>d0+.3&&p.dcd<1)p.dcd*=this.fxDcd}}
{const base=G.complete;G.complete=function(){this._had=!!Save.d.best[this.lvlI];base.call(this)}}
// ---- screens
// Node details (name, effect, cost) shown under the tree while a node is hovered or focused.
{const skTxt=n=>{let t=TL(n.n)+' \u2014 '+TL(n.d)+' \u00b7 '+(skOwn(n.id)?TL('OWNED'):n.c+' '+TL('PTS'));if(!skOwn(n.id)&&!skOpen(n)){const q=n.any?n.req:n.req.filter(r=>!skOwn(r));t+=' \u00b7 '+TL('LOCKED')+': '+q.map(r=>TL(skNode(r).n)).join(n.any?' / ':' + ')}return t};
const sd=e=>{const b=e.target.closest&&e.target.closest('.sn'),d=document.getElementById('skd');if(!b||!d)return;const n=skNode(b.dataset.v);if(n)d.textContent=skTxt(n)};const o=document.getElementById('ov');o.addEventListener('mouseover',sd);o.addEventListener('focusin',sd)}
Object.assign(UI,{
skBack(){const b=this.skb||'m';if(b[0]==='b')this.brief(+b.slice(1));else if(b==='r')this.missions();else this.menu()},
tree(){skEnsure();const w0=this.ov.querySelector('.skw'),sc=this.skSc||(w0?[w0.scrollLeft,w0.scrollTop]:null);this.skSc=null;
// Radial graph: one hub in the middle, each branch is an arm (node I on the arm, II-a / II-b on either side, III at the end). Same nodes, costs and unlock rules as before.
const COL={body:'#3dff7a',cmb:'#ffd23d',sg:'#ff5d73',lg:'#6f9bff',hv:'#b07cff',ml:'#f2f2f2',exp:'#ff8a2b',gho:'#00e5ff',dio:'#ff2bd6'},ANG=SKILLS.map((b,i)=>-90+i*360/SKILLS.length),SP=122,W=2200,H=2200,CX=W/2,CY=H/2;
// Node position on its arm: u along the arm by depth (prerequisite chain length), v sideways when several nodes share a depth (II-a / II-b).
const depth={},dep=(b,n)=>depth[n.id]!=null?depth[n.id]:(depth[n.id]=n.req.length?1+Math.max(...n.req.map(r=>dep(b,b.nodes.find(x=>x.id===r)))):0);
let ln='',nd='',lb='';
SKILLS.forEach((b,bi)=>{const a=ANG[bi%ANG.length]*Math.PI/180,ca=Math.cos(a),sa=Math.sin(a),col=COL[b.id]||'#00e5ff';
const pt=(u,v)=>[CX+(u*ca-v*sa)*SP,CY+(u*sa+v*ca)*SP],D=b.nodes.map(n=>dep(b,n)),P=b.nodes.map((n,i)=>{const sib=b.nodes.filter((x,k)=>D[k]===D[i]),k=sib.indexOf(n);return pt(2.2+1.6*D[i],(k-(sib.length-1)/2)*1.2)}),top=Math.max(...D);
const seg=(p,q,on)=>{ln+='<line x1="'+p[0].toFixed(1)+'" y1="'+p[1].toFixed(1)+'" x2="'+q[0].toFixed(1)+'" y2="'+q[1].toFixed(1)+'" stroke="'+(on?col:'#3a3f55')+'" stroke-width="'+(on?4:2.5)+'"'+(on?' style="filter:drop-shadow(0 0 4px '+col+')"':'')+'/>'};
seg([CX,CY],P[0],skOwn(b.nodes[0].id));
b.nodes.forEach((n,i)=>{for(const r of n.req){const j=b.nodes.findIndex(x=>x.id===r);if(j>=0)seg(P[j],P[i],skOwn(n.id)&&skOwn(r))}});
b.nodes.forEach((n,i)=>{const own=skOwn(n.id),open=skOpen(n),can=!own&&open&&Save.d.cr>=n.c,tier=['I','II','III','IV'][D[i]],cls='sn'+(own?' own':open?(can?' can':' open'):' lock');
nd+='<button class="'+cls+'" data-a="'+(can?'buy':'skinfo')+'" data-v="'+n.id+'" style="left:'+(P[i][0]/W*100).toFixed(2)+'%;top:'+(P[i][1]/H*100).toFixed(2)+'%;--c:'+col+'">'+(own?'\u2713':tier)+'<span>'+TL(n.n)+'<br>'+(own?TL('OWNED'):n.c)+'</span></button>'});
const L=pt(2.2+1.6*top+1.7,0);lb+='<div class="skl" style="left:'+(L[0]/W*100).toFixed(2)+'%;top:'+(L[1]/H*100).toFixed(2)+'%;color:'+col+'">'+TL(b.n)+(b.ch!==undefined?'<small>'+(b.ch===0?'Sandevistan':'THE WORLD')+'</small>':b.sub?'<small>'+b.sub+'</small>':'')+'</div>'});
const h='<h2>'+TL('SKILL TREE')+'</h2><div class="skh"><span>'+TL('POINTS')+': <b>'+Save.d.cr+'</b></span><span><button class="zb" data-a="skz" data-v="-1" aria-label="'+TL('Zoom out')+'">\u2212</button><button class="zb" data-a="skz" data-v="1" aria-label="'+TL('Zoom in')+'">+</button></span></div><div class="skw"><div class="skg"><svg viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none">'+ln+'<circle cx="'+CX+'" cy="'+CY+'" r="16" fill="#0a0a16" stroke="#8896b8" stroke-width="3"/></svg>'+lb+nd+'</div></div><div class="skd" id="skd">'+TL('Tap or hover a node for details')+'</div><button data-a="skback">'+TL('BACK')+'</button>';
this.show(h);const pn=this.ov.firstChild;pn.classList.add('sk','skx');const g=pn.querySelector('.skg'),w=pn.querySelector('.skw');g.style.setProperty('--z',this.skZ||1);if(sc){w.scrollLeft=sc[0];w.scrollTop=sc[1]}else{w.scrollLeft=(w.scrollWidth-w.clientWidth)/2;w.scrollTop=(w.scrollHeight-w.clientHeight)/2}},
// Purchase confirmation: shows what is bought and the points before and after. Nothing is spent until BUY.
cfm(id){skEnsure();let nm,ds,cost;
{const n=skNode(id);if(!n||skOwn(n.id)||!skOpen(n)||Save.d.cr<n.c){this.tree();return}nm=n.n;ds=n.d;cost=n.c}
{const w=this.ov.querySelector('.skw');this.skSc=w?[w.scrollLeft,w.scrollTop]:null}
const v=id;
this.show('<h2>'+TL('CONFIRM PURCHASE')+'</h2><p><b>'+TL(nm)+'</b>'+'</p><p>'+TL(ds)+'</p><table><tr><td>'+TL('Cost')+'</td><td>'+cost+' '+TL('PTS')+'</td></tr><tr><td>'+TL('POINTS')+'</td><td>'+Save.d.cr+' \u2192 '+(Save.d.cr-cost)+'</td></tr></table><button data-a="cbuy" data-v="'+v+'">'+TL('BUY')+'</button><button data-a="ccancel" data-v="'+v+'">'+TL('CANCEL')+'</button>');
const bb=this.ov.querySelector('[data-a="ccancel"]');if(bb)bb.focus()},
loadout(){let h='<h2>'+TL('LOADOUT')+'</h2><p>'+TL('Pick one extra weapon to start missions with.')+'</p><button data-a="lo" data-v="">'+(Save.d.lo?'':'\u25b6 ')+TL('NONE')+'</button>';
for(const w of LOADOUT){const ok=loOpen(w),W=WEAP[w.id];h+='<button data-a="lo" data-v="'+w.id+'"'+(ok?'':' disabled')+'>'+(Save.d.lo===w.id?'\u25b6 ':'')+W.n+(ok?'':'<small>'+TL('Clear mission')+' '+(w.lv+1)+'</small>')+'</button>'}
h+='<button data-a="skback">'+TL('BACK')+'</button>';this.show(h);this.ov.firstChild.classList.add('sk')}});
{const base=UI.menu;UI.menu=function(){base.call(this);const s=this.ov.querySelector('[data-a="settings"]');if(s)s.insertAdjacentHTML('beforebegin','<button data-a="tree" data-v="m">'+TL('SKILL TREE')+'</button><button data-a="lopen" data-v="m">'+TL('LOADOUT')+'</button>')}}
{const base=UI.brief;UI.brief=function(i){base.call(this,i);const bs=this.ov.querySelectorAll('.pn button'),last=bs[bs.length-1];if(last)last.insertAdjacentHTML('beforebegin','<button data-a="lopen" data-v="b'+(+i)+'">'+TL('LOADOUT')+'</button><button data-a="tree" data-v="b'+(+i)+'">'+TL('SKILL TREE')+'</button>')}}
{const base=UI.results;UI.results=function(r){skEnsure();const gain=G._had?Math.round(r.tot*.3):r.tot;Save.d.cr+=gain;Save.save();base.call(this,r);
const bs=this.ov.querySelectorAll('.pn button');if(bs[0])bs[0].insertAdjacentHTML('beforebegin','<p>'+TL('POINTS')+' +'+gain+(G._had?' ('+TL('repeat clear: 30%')+')':'')+' \u2192 '+Save.d.cr+'</p>');
const last=this.ov.querySelectorAll('.pn button');if(last.length)last[last.length-1].insertAdjacentHTML('afterend','<button data-a="tree" data-v="r">'+TL('SKILL TREE')+'</button>')}}
{const base=UI.act;UI.act=function(a,v){
if(a==='tree'){this.wait=null;if(v)this.skb=v;this.tree();return}
if(a==='lopen'){this.wait=null;if(v)this.skb=v;this.loadout();return}
if(a==='lo'){this.wait=null;Save.d.lo=LOADOUT.some(w=>w.id===v)?v:null;Save.save();this.loadout();return}
if(a==='skinfo'){this.wait=null;const d=document.getElementById('skd'),n=skNode(v);if(d&&n)d.textContent=skTxt(n);return}
if(a==='buy'){this.wait=null;this.cfm(v);return}
if(a==='cbuy'){this.wait=null;skEnsure();const n=skNode(String(v));if(n&&!skOwn(n.id)&&skOpen(n)&&Save.d.cr>=n.c){Save.d.cr-=n.c;Save.d.sk[n.id]=1;Save.save()}this.tree();return}
if(a==='ccancel'){this.wait=null;this.tree();return}
if(a==='tcedit'){TCE.start();return}
if(a==='skz'){this.wait=null;const w=document.querySelector('.skw'),g=document.querySelector('.skg');if(!w||!g)return;const cx=(w.scrollLeft+w.clientWidth/2)/w.scrollWidth,cy=(w.scrollTop+w.clientHeight/2)/w.scrollHeight;this.skZ=Math.max(.6,Math.min(2,Math.round(((this.skZ||1)+(+v>0?.2:-.2))*10)/10));g.style.setProperty('--z',this.skZ);w.scrollLeft=cx*w.scrollWidth-w.clientWidth/2;w.scrollTop=cy*w.scrollHeight-w.clientHeight/2;return}
if(a==='skback'){this.wait=null;this.skBack();return}
base.call(this,a,v)}}
Object.assign(I18N.th,{"SKILL TREE":"ต้นไม้ทักษะ","LOADOUT":"อาวุธติดตัว","POINTS":"แต้ม","PTS":"แต้ม","OWNED":"ซื้อแล้ว","NONE":"ไม่มี","Clear mission":"ผ่านด่าน","repeat clear: 30%":"เล่นซ้ำ: 30%","Pick one extra weapon to start missions with.":"เลือกอาวุธเพิ่ม 1 ชิ้นเพื่อเริ่มด่าน",
"BODY":"ร่างกาย","GUNS":"ปืน","MELEE":"ระยะประชิด","EXPLOSIVES":"ระเบิด","GHOST SKILL":"สกิล GHOST","DIO SKILL":"สกิล DIO",
"REINFORCED":"เสริมกำลัง","Max HP +20":"HP สูงสุด +20","FLEET":"ว่องไว","Move speed +8%":"เดินเร็ว +8%","QUICK DODGE":"หลบไว","Dodge cooldown -20%":"พุ่งหลบรีเซ็ตเร็วขึ้น 20%","SUBDERMAL ARMOR":"เกราะใต้ผิว","Damage taken -15%":"ลดดาเมจที่โดน 15%",
"STEADY HANDS":"มือนิ่ง","Gun spread -20%":"กระสุนกระจายน้อยลง 20%","HEAVY ROUNDS":"กระสุนหนัก","Gun damage +12%":"ดาเมจปืน +12%","EXTENDED MAGS":"ซองกระสุนใหญ่","Magazine size +25%":"ซองกระสุน +25%","AMMO CACHE":"คลังกระสุน","Reserve ammo +40%":"กระสุนสำรอง +40%",
"SHARPENED":"ลับคม","Melee damage +15%":"ดาเมจประชิด +15%","LONG REACH":"เอื้อมไกล","Melee reach +15%":"ระยะประชิด +15%","FAST HANDS":"มือไว","Melee cooldown -20%":"ฟันเร็วขึ้น 20%","SILENT STEPS":"ย่องเงียบ","Melee noise -50%":"เสียงประชิดเบาลง 50%",
"BIGGER CHARGE":"ประจุใหญ่ขึ้น","Blast radius +15%":"รัศมีระเบิด +15%","PAYLOAD":"หัวรบ","Blast damage +20%":"ดาเมจระเบิด +20%","BANDOLIER":"สายคาดกระสุน","+2 grenades per pickup, +2 rocket reserve":"ระเบิดมือ +2 ลูกต่อที่เก็บ จรวดสำรอง +2","SAFE DISTANCE":"ระยะปลอดภัย","Own blasts hurt you 50% less":"ระเบิดของตัวเองทำร้ายน้อยลง 50%",
"HEAT SINK":"ตัวระบายความร้อน","Cyberpsycho builds 20% slower":"ไซเบอร์ไซโคสะสมช้าลง 20%","COOLANT":"สารหล่อเย็น","Cyberpsycho drains faster (15s to 10s)":"ไซเบอร์ไซโคลดเร็วขึ้น (15 เหลือ 10 วิ)","OVERCLOCK":"โอเวอร์คล็อก","Sandevistan run speed x1.5 to x1.65":"วิ่งตอนใช้ Sandevistan x1.5 เป็น x1.65","STASIS":"หยุดนิ่ง","World slows to 3% in Sandevistan (was 5%)":"โลกช้าลงเหลือ 3% ใน Sandevistan (เดิม 5%)",
"CAPACITOR":"ตัวเก็บประจุ","Time stop energy 10s to 12s":"พลังหยุดเวลา 10 เป็น 12 วิ","REGEN":"ฟื้นพลัง","Energy regen +30%":"ฟื้นพลังเร็ว +30%","QUICK START":"เริ่มไว","Time stop needs 0.5s of energy (was 1s)":"หยุดเวลาได้ที่พลัง 0.5 วิ (เดิม 1 วิ)","STAND POWER":"พลังสแตนด์","Knife damage +20%":"ดาเมจมีดปา +20%"});
// Strings for the weapon group nodes and the reset warning.
Object.assign(I18N.th,{"SHORT GUNS":"ปืนสั้น","LONG GUNS":"ปืนยาว","HEAVY GUNS":"ปืนหนัก","LOCKED":"ล็อก","This erases best scores, unlocks and upgrades.":"จะลบคะแนนสูงสุด ภารกิจที่ปลดล็อก และการอัพเกรดทั้งหมด",
"HOLLOW POINT":"หัวกระสุนแตก","Short guns damage +20%":"ดาเมจปืนสั้น +20%","EXTENDED CLIPS":"ซองต่อขยาย","Short guns magazine +40%":"ซองกระสุนปืนสั้น +40%","FAST DRAW":"ชักไว","Short guns: shots 15% faster, reload 20% faster":"ปืนสั้นยิงถี่ขึ้น 15% รีโหลดเร็วขึ้น 20%","PENETRATOR":"ทะลวง","Short gun bullets pass through +1 enemy":"กระสุนปืนสั้นทะลุศัตรูเพิ่ม 1 ตัว",
"AP ROUNDS":"กระสุนเจาะเกราะ","Long guns damage +20%":"ดาเมจปืนยาว +20%","DRUM MAGS":"ซองดรัม","Long guns magazine +40%":"ซองกระสุนปืนยาว +40%","TUNED ACTION":"กลไกจูนแล้ว","Long guns: shots 15% faster, reload 20% faster":"ปืนยาวยิงถี่ขึ้น 15% รีโหลดเร็วขึ้น 20%","DEEP PIERCE":"ทะลุลึก","Long gun bullets pass through +1 enemy":"กระสุนปืนยาวทะลุศัตรูเพิ่ม 1 ตัว",
"HEAVY LOAD":"กระสุนหนักพิเศษ","Heavy guns damage +20%":"ดาเมจปืนหนัก +20%","BELT FEED":"สายพานกระสุน","Heavy guns magazine +40%":"ซองกระสุนปืนหนัก +40%","COOLED BARREL":"ลำกล้องระบายความร้อน","Heavy guns: shots 15% faster, reload 20% faster":"ปืนหนักยิงถี่ขึ้น 15% รีโหลดเร็วขึ้น 20%","OVERPENETRATION":"ทะลุทะลวง","Heavy MG bullets pass through +1 enemy (Railgun already passes all)":"กระสุน Heavy MG ทะลุศัตรูเพิ่ม 1 ตัว (Railgun ทะลุทุกตัวอยู่แล้ว)",
"EDGE":"คมกริบ","Melee and knives damage +20%":"ดาเมจประชิดและมีดปา +20%","QUICK SWING":"ฟันไว","Melee swing and knife volley 15% faster":"ฟันประชิดและปามีดถี่ขึ้น 15%","EXTENDED GRIP":"ด้ามยาว","Melee reach +12%":"ระยะประชิด +12%",
"LAUNCHER MAGS":"ซองเครื่องยิงระเบิด","Grenade Launcher magazine +30%":"ซองกระสุน Grenade Launcher +30%","LAUNCHER LOADER":"ตัวบรรจุไว","Grenade Launcher: shots 15% faster, reload 20% faster":"Grenade Launcher ยิงถี่ขึ้น 15% รีโหลดเร็วขึ้น 20%"});
Object.assign(I18N.th,{"COMBAT":"การต่อสู้","CONFIRM PURCHASE":"ยืนยันการซื้อ","BUY":"ซื้อ","Cost":"ราคา"});
Object.assign(I18N.th,{"AUDIO":"เสียง","DISPLAY & EFFECTS":"การแสดงผลและเอฟเฟกต์","CONTROLS":"การควบคุม","Tap or hover a node for details":"แตะหรือเลื่อนเมาส์ไปที่โหนดเพื่อดูรายละเอียด","Zoom in":"ขยาย","Zoom out":"ย่อ"});
Object.assign(I18N.th,{"TOUCH BUTTON LAYOUT":"ปรับตำแหน่ง/ขนาดปุ่มทัช","Drag a button to move it. Tap one, then use the slider to resize.":"ลากปุ่มเพื่อย้าย แตะเลือกปุ่มแล้วใช้แถบเลื่อนปรับขนาด","Size":"ขนาด","RESET LAYOUT":"คืนค่าเดิม","SAVE & CLOSE":"บันทึกและปิด"});
