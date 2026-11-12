'use strict';
// New enemies and bosses. Map letters (js/levels.js): Z shield trooper, G grenadier, Q hacker, V drone, 1 heavy boss, 2 cyberpsycho boss.
// Base archetypes (E H M R O) and the FSM live in js/enemy.js and js/enemy-ai.js. A type with ET.ai runs that method (in G) while it chases and sees the player
// (ET.always: also while it cannot see you, e.g. during Sandevistan). ET.tick runs every frame. ET.gl / ET.sc = gun length / body scale in the renderer, ET.fly = drawn by drawNE.
// Z shield: bullets and thrown knives that arrive inside the front arc (NE.shield.arc each side) are stopped; melee swings, blasts and hits from the side or back land normally.
// G grenadier: lobs a grenade at you every ~cd s. It flies NE.gren.fly s (marker on the floor shows where it lands), then makes a blast ring that hurts only you (ring.pl). Time scale applies (slow in Sandevistan, frozen in time stop).
// Q hacker: keeps its distance and, with line of sight inside rng, channels NE.hack.chan s. When done, your skill (Sandevistan / time stop) is cut and locked for NE.hack.lock s (p.hk). Own cooldown NE.hack.cd s.
// V drone: flies over furniture and crates (not walls or closed doors), fires 2-shot bursts.
// 1 heavy boss: 3 phases by HP (>66%, >33%, rest). Fan spray; from phase 2 a bullet ring and (once) Rushers from the nearest doors; phase 3 faster with grenade volleys.
// 2 cyberpsycho boss: telegraphed dash strike, teleport behind you, slowing aura (NE.b2.aura px, speed x NE.b2.auraK) and, under 50% HP, harmless decoy clones that dissolve when shot or struck.
// It is only slowed to ET.sandK of normal speed (not to SAND.slow) while you use Sandevistan.
const NE={
shield:{arc:1.05},
gren:{fly:.8,lead:.35},
hack:{chan:1.2,lock:6,cd:10},
b1:{spray:[2,1.4],fan:.7,n:8,dmg:8,spd:420,ring:4,rn:12,rdmg:8,rspd:260,gren:5,gn:3,gjit:50,sm:2,fast:1.4},
b2:{aura:160,auraK:.5,dash:260,dspd:520,tele:.5,ddmg:25,dcd:3.5,tp:5,tpt:.4,behind:64,cl:2,clspd:80}};
Object.assign(ET,{
Z:{hp:90,spd:70,vis:300,fov:.9,rng:220,keep:120,cd:.8,dmg:10,react:.5,col:'#2a6f97',hair:'#111',acc:.1,aim:.2,r:12,gl:12,sc:1.1,shield:1,ai:'aiShield'},
G:{hp:45,spd:60,vis:340,fov:.9,rng:360,keep:220,cd:3.5,dmg:0,react:.5,col:'#6b8e23',hair:'#222',acc:0,aim:0,gl:8,ai:'aiGren'},
Q:{hp:35,spd:55,vis:360,fov:.9,rng:320,keep:260,cd:1,dmg:0,react:.5,col:'#00a86b',hair:'#00ffa3',acc:0,aim:0,gl:5,ai:'aiHack',tick:'hackTick'},
V:{hp:25,spd:110,vis:320,fov:1.1,rng:240,keep:160,cd:1.2,dmg:7,react:.4,col:'#4fc3f7',hair:'#fff',acc:.1,aim:.2,r:9,fly:1,ai:'aiDrone'},
'1':{hp:600,spd:45,vis:420,fov:1.2,rng:420,keep:160,cd:1,dmg:8,react:.3,col:'#8b1a1a',hair:'#111',acc:.05,aim:.25,r:17,gl:20,sc:1.6,boss:1,always:1,nm:'HEAVY UNIT',ai:'aiBoss1'},
'2':{hp:450,spd:90,vis:420,fov:1.2,rng:300,keep:110,cd:1,dmg:0,react:.3,col:'#8e1b6b',hair:'#ff2bd6',acc:0,aim:0,r:13,gl:14,sc:1.2,boss:1,always:1,sandK:.4,aura:1,nm:'CYBERPSYCHO',ai:'aiBoss2'}});
Object.assign(I18N.th,{"HEAVY UNIT":"หน่วยหนัก","HACKED":"ถูกแฮก","HACKING...":"กำลังถูกแฮก...","SKILL LOCKED":"สกิลถูกล็อก"});
// Flying units ignore furniture and crates: only walls (1) and closed doors (2) stop them.
function neSolid(x,y){if(x<0||y<0)return true;const tx=x/T|0,ty=y/T|0;if(tx>=G.mw||ty>=G.mh)return true;const v=G.grid[ty][tx];return v===1||v===2}
function neBlocked(x,y,r){return neSolid(x-r,y-r)||neSolid(x+r,y-r)||neSolid(x-r,y+r)||neSolid(x+r,y+r)}
let neGoTo=G.goTo;
Object.assign(G,{
gr:[],bcl:[],auraK:1,
exFire(e,ang){const T0=ET[e.t];this.spawnB(e.x+Math.cos(ang)*14,e.y+Math.sin(ang)*14,ang+(Math.random()-.5)*2*T0.acc,420,T0.dmg,1,700);Snd.play('efire');this.emit(e.x+Math.cos(ang)*16,e.y+Math.sin(ang)*16,2,'#ffd27a',100,.12,2)},
// Hold the preferred distance (same moves as the base gunner).
hold(e,dt,d,dx,dy,spd){const T0=ET[e.t];if(d>T0.keep+25)this.goTo(e,this.p.x,this.p.y,spd,dt,false);else if(d<T0.keep-30){this.step(e,e.x-dx,e.y-dy,spd,dt,false);if(e.bx)this.strafe(e,spd*.7,dt,dx,dy)}else this.strafe(e,spd*.5,dt,dx,dy)},
// ---- shield trooper
shieldHit(e,b){if(!b.vx&&!b.vy)return false;if(Math.abs(adiff(Math.atan2(-b.vy,-b.vx),e.a))>=NE.shield.arc)return false;e.sk=.12;this.emit(b.x,b.y,5,'#7fd6ff',120,.2,2);if(this.t>=(this.hst||0)){Snd.play('hit');this.hst=this.t}return true},
aiShield(e,dt,d,ang,dx,dy){const T0=ET[e.t],p=this.p;
if(!lof(e.x,e.y,p.x,p.y)){e.aimt=0;this.goTo(e,p.x,p.y,T0.spd,dt,false);return}
this.hold(e,dt,d,dx,dy,T0.spd);
if(d<T0.rng&&e.cd<=0){e.aimt+=dt;if(e.aimt>=T0.aim){e.aimt=0;this.exFire(e,ang);if(++e.cn>=2){e.cn=0;e.cd=T0.cd*2}else e.cd=.18}}else if(e.cd>0)e.aimt=0},
// ---- grenades (shared by the grenadier and the heavy boss)
throwGren(e,tx,ty){if(solid(tx,ty)){tx=this.p.x;ty=this.p.y}this.gr.push({x:e.x,y:e.y,sx:e.x,sy:e.y,tx,ty,t:0,T:NE.gren.fly});Snd.play('throw')},
gBoom(x,y){const p=this.p,pd=Math.hypot(p.x-x,p.y-y);Snd.play('boom');this.shake(10);if(pd<220)this.kickChroma(.5+.4*(1-pd/220));this.rings.push({x,y,t:.35,h:new Set(),pl:1});this.emit(x,y,28,'#ffb300',220,.6,3);this.emit(x,y,16,'#ff3b3b',160,.5,3)},
updGr(wdt){for(let i=this.gr.length-1;i>=0;i--){const g=this.gr[i];g.t+=wdt;const u=Math.min(1,g.t/g.T);g.x=g.sx+(g.tx-g.sx)*u;g.y=g.sy+(g.ty-g.sy)*u;if(g.t>=g.T){this.gr.splice(i,1);this.gBoom(g.tx,g.ty)}}},
aiGren(e,dt,d,ang,dx,dy){const T0=ET[e.t],p=this.p,clr=lof(e.x,e.y,p.x,p.y);
if(!clr){e.aimt=0;this.goTo(e,p.x,p.y,T0.spd,dt,false)}else this.hold(e,dt,d,dx,dy,T0.spd);
if(clr&&d<T0.rng&&d>60&&e.cd<=0){e.cd=T0.cd*(.9+Math.random()*.3);this.throwGren(e,p.x+p.vx*NE.gren.lead,p.y+p.vy*NE.gren.lead)}},
// ---- hacker
aiHack(e,dt,d,ang,dx,dy){const T0=ET[e.t],p=this.p;
if(!lof(e.x,e.y,p.x,p.y)){this.goTo(e,p.x,p.y,T0.spd,dt,false);return}
if(d<T0.keep-50){this.step(e,e.x-dx,e.y-dy,T0.spd*1.2,dt,false);if(e.bx)this.strafe(e,T0.spd,dt,dx,dy)}else if(d>T0.keep+40)this.goTo(e,p.x,p.y,T0.spd,dt,false);else this.strafe(e,T0.spd*.4,dt,dx,dy)},
// Runs every frame (also when the hacker cannot see you: a hack does not need eyes, only range and a clear line).
hackTick(e,dt){const p=this.p,T0=ET[e.t];e.hcd=Math.max(0,(e.hcd||0)-dt);
const ok=e.s==='chase'&&p.hp>0&&!p.cyp&&e.hcd<=0&&!((p.hk||0)>0)&&Math.hypot(p.x-e.x,p.y-e.y)<T0.rng&&los(e.x,e.y,p.x,p.y);
if(ok){e.hch=(e.hch||0)+dt;if(e.hch>=NE.hack.chan){e.hch=0;e.hcd=NE.hack.cd;this.hackPlayer()}}else e.hch=Math.max(0,(e.hch||0)-dt*2)},
hackPlayer(){const p=this.p;p.hk=NE.hack.lock;if(p.dio){if(p.ts>0)p.ts=0}else if(p.sd>0)p.sd=0;Snd.play('cy_burst');this.kickChroma(.8);this.shake(3);this.pop(p.x,p.y-22,TL('HACKED'),'#ff3b3b')},
// ---- drone
flyTo(e,tx,ty,spd,dt){const dx=tx-e.x,dy=ty-e.y,l=Math.hypot(dx,dy);if(l<2)return l;const k=Math.min(spd*dt,l)/l,r=(ET[e.t].r||9)-3,mx=dx*k,my=dy*k;e.bx=0;
if(!neBlocked(e.x+mx,e.y,r))e.x+=mx;else e.bx=1;if(!neBlocked(e.x,e.y+my,r))e.y+=my;else e.bx=1;
if(e.bx)neGoTo.call(this,e,tx,ty,spd,dt,false);return l},
aiDrone(e,dt,d,ang,dx,dy){const T0=ET[e.t],p=this.p,clr=lof(e.x,e.y,p.x,p.y);
if(!clr||d>T0.keep+30){this.flyTo(e,p.x,p.y,T0.spd,dt);e.aimt=0}else if(d<T0.keep-30)this.flyTo(e,e.x-dx,e.y-dy,T0.spd,dt);else{const sg=Math.sin(e.ph*.3)>0?1:-1;this.flyTo(e,e.x-dy*sg,e.y+dx*sg,T0.spd*.6,dt)}
if(clr&&d<T0.rng&&e.cd<=0){e.aimt+=dt;if(e.aimt>=T0.aim){e.aimt=0;this.exFire(e,ang);if(++e.cn>=2){e.cn=0;e.cd=T0.cd}else e.cd=.12}}else if(e.cd>0)e.aimt=0},
// ---- boss 1 (heavy)
summonRush(e,n){const p=this.p,ds=this.doors.filter(d=>Math.hypot((d.x+.5)*T-e.x,(d.y+.5)*T-e.y)<500).sort((a,b)=>Math.hypot((a.x+.5)*T-e.x,(a.y+.5)*T-e.y)-Math.hypot((b.x+.5)*T-e.x,(b.y+.5)*T-e.y));
for(let i=0;i<n;i++){const d=ds[i];let x=e.x+(i?36:-36),y=e.y;if(d){x=(d.x+.5)*T;y=(d.y+.5)*T;if(!d.open)this.toggleDoor(d,false)}const r=this.mkE('R',x,y);r.s='chase';r.lx=p.x;r.ly=p.y;this.en.push(r);this.emit(x,y,10,'#e84393',120,.4,2)}},
aiBoss1(e,dt,d,ang,dx,dy){const T0=ET[e.t],p=this.p,B=NE.b1,f=e.hp/T0.hp,ph=f>.66?1:f>.33?2:3,spd=T0.spd*(ph===3?B.fast:1),clr=lof(e.x,e.y,p.x,p.y);
if(e.t1===undefined){e.t1=1.2;e.t2=3;e.t3=4}
if(!clr)this.goTo(e,p.x,p.y,spd,dt,false);else this.hold(e,dt,d,dx,dy,spd);
e.t1-=dt;e.t2-=dt;e.t3-=dt;
if(ph>=2&&!e.sm){e.sm=1;this.summonRush(e,B.sm)}
if(clr&&e.t1<=0&&d<T0.rng){e.t1=ph===3?B.spray[1]:B.spray[0];for(let i=0;i<B.n;i++)this.spawnB(e.x+Math.cos(ang)*22,e.y+Math.sin(ang)*22,ang+(i/(B.n-1)-.5)*B.fan,B.spd,B.dmg,1,700);Snd.play('efire');this.shake(2)}
if(ph>=2&&e.t2<=0){e.t2=B.ring;const o=Math.random()*TAU;for(let i=0;i<B.rn;i++)this.spawnB(e.x,e.y,o+i/B.rn*TAU,B.rspd,B.rdmg,1,500);Snd.play('efire')}
if(ph===3&&clr&&e.t3<=0){e.t3=B.gren;for(let i=0;i<B.gn;i++)this.throwGren(e,p.x+(Math.random()-.5)*2*B.gjit,p.y+(Math.random()-.5)*2*B.gjit)}},
// ---- boss 2 (cyberpsycho)
bossTeleport(e){const p=this.p,B=NE.b2;this.emit(e.x,e.y,16,'#00e5ff',140,.5,2);this.emit(e.x,e.y,10,'#ff2bd6',120,.5,2);
for(let k=0;k<14;k++){const a=p.a+Math.PI+(k%2?1:-1)*Math.ceil(k/2)*.4,x=p.x+Math.cos(a)*B.behind,y=p.y+Math.sin(a)*B.behind;if(!blocked(x,y,10)&&lof(p.x,p.y,x,y)){e.x=x;e.y=y;break}}
e.path=null;Snd.play('cy_burst');this.emit(e.x,e.y,16,'#00e5ff',140,.5,2)},
spawnClones(e){for(let i=0;i<NE.b2.cl;i++){const a=Math.random()*TAU;let x=e.x+Math.cos(a)*50,y=e.y+Math.sin(a)*50;if(solid(x,y)){x=e.x;y=e.y}this.bcl.push({x,y,a:0,ph:Math.random()*6,t:0,fd:0});this.emit(x,y,10,'#00e5ff',100,.4,2)}},
aiBoss2(e,dt,d,ang,dx,dy){const T0=ET[e.t],p=this.p,B=NE.b2,clr=lof(e.x,e.y,p.x,p.y);
e.tpc=(e.tpc===undefined?3:e.tpc)-dt;e.dsc=(e.dsc===undefined?1.5:e.dsc)-dt;
if(e.hp/T0.hp<.5&&!e.cl){e.cl=1;this.spawnClones(e)}
const bs=e.bs||'';
if(bs==='tele'){e.bt-=dt;e.a=e.bang;if(e.bt<=0){e.bs='dash';e.bt=B.dash/B.dspd;e.dh=0;Snd.play('dash')}}
else if(bs==='dash'){e.bt-=dt;const v=B.dspd*dt;e.bx=0;mv(e,Math.cos(e.bang)*v,Math.sin(e.bang)*v,T0.r-3);e.a=e.bang;
if(!e.dh&&p.hp>0&&Math.hypot(p.x-e.x,p.y-e.y)<26){e.dh=1;if(p.inv<=0){this.hurt(B.ddmg);this.emit(p.x,p.y,8,'#ff2bd6',120,.3,2)}}
if(e.bx||e.bt<=0){e.bs='rec';e.bt=.6;e.dsc=B.dcd}}
else if(bs==='rec'){e.bt-=dt;if(e.bt<=0)e.bs=''}
else if(bs==='tp'){e.bt-=dt;if(e.bt<=0){this.bossTeleport(e);e.bs='';e.tpc=B.tp;e.dsc=Math.min(e.dsc,.4)}}
else{
if(e.tpc<=0){e.bs='tp';e.bt=B.tpt;Snd.play('cy_burst')}
else if(e.dsc<=0&&d<240&&clr){e.bs='tele';e.bt=B.tele;e.bang=ang}
else if(!clr||d>T0.keep+20)this.goTo(e,p.x,p.y,T0.spd,dt,false);else if(d<T0.keep-40)this.step(e,e.x-dx,e.y-dy,T0.spd,dt,false);else this.strafe(e,T0.spd*.6,dt,dx,dy)}},
// Clones: harmless, walk at you, dissolve when shot or struck (or when the boss is gone).
updBcl(wdt){const p=this.p,boss=this.en.some(e=>!e.dead&&ET[e.t].aura);for(let i=this.bcl.length-1;i>=0;i--){const h=this.bcl[i];h.t+=wdt;
if(h.fd){h.fd-=wdt;if(h.fd<=0)this.bcl.splice(i,1);continue}
if(!boss){h.fd=.3;continue}
const dx=p.x-h.x,dy=p.y-h.y,d=Math.hypot(dx,dy)||1;h.a=Math.atan2(dy,dx);
if(d>45){const nx=h.x+dx/d*NE.b2.clspd*wdt,ny=h.y+dy/d*NE.b2.clspd*wdt;if(!solid(nx,h.y))h.x=nx;if(!solid(h.x,ny))h.y=ny}}},
bclKill(h){h.fd=.3;this.emit(h.x,h.y,14,'#00e5ff',130,.5,2);this.emit(h.x,h.y,8,'#ff2bd6',110,.5,2);Snd.play('cy_burst_end')},
hitBc(b){for(const h of this.bcl)if(!h.fd&&Math.hypot(h.x-b.x,h.y-b.y)<ET['2'].r){this.bclKill(h);b.on=0;return true}return false},
// ---- drawing
drawGrenades(){const c=this.cx;for(const g of this.gr){const u=Math.min(1,g.t/g.T),h=Math.sin(Math.PI*u)*36;c.save();
c.fillStyle='rgba(255,100,0,'+.07*u+')';c.strokeStyle='rgba(255,179,0,'+(.3+.4*u)+')';c.lineWidth=2;c.setLineDash([6,4]);c.beginPath();c.arc(g.tx,g.ty,96,0,TAU);c.fill();c.stroke();c.setLineDash([]);
c.fillStyle='rgba(0,0,0,.35)';c.beginPath();c.ellipse(g.x,g.y,4,2.5,0,0,TAU);c.fill();c.fillStyle='#9acd32';c.beginPath();c.arc(g.x,g.y-h,4,0,TAU);c.fill();c.strokeStyle='#2f3d0a';c.lineWidth=1.5;c.stroke();c.restore()}},
drawNE(){const c=this.cx,p=this.p,B=NE.b2;
for(const e of this.en){if(e.dead)continue;const T0=ET[e.t];
if(T0.fly){c.save();c.translate(e.x,e.y);c.fillStyle='rgba(0,0,0,.3)';c.beginPath();c.ellipse(2,10,8,4,0,0,TAU);c.fill();
c.fillStyle=e.fl>0?'#fff':T0.col;c.beginPath();c.arc(0,0,7,0,TAU);c.fill();c.strokeStyle='#0b3a52';c.lineWidth=2;c.stroke();
const r=this.wt*30;c.strokeStyle='rgba(220,240,255,.7)';c.lineWidth=1.5;for(let i=0;i<4;i++){const a=i*Math.PI/2+Math.PI/4,x=Math.cos(a)*10,y=Math.sin(a)*10;c.beginPath();c.arc(x,y,4,r+i,r+i+4);c.stroke();c.beginPath();c.moveTo(Math.cos(a)*7,Math.sin(a)*7);c.lineTo(x,y);c.stroke()}
c.fillStyle='#ff3b3b';c.beginPath();c.arc(Math.cos(e.a)*4,Math.sin(e.a)*4,2,0,TAU);c.fill();c.restore()}
if(T0.shield){c.save();c.strokeStyle=e.sk>0?'#fff':'#7fd6ff';c.lineWidth=4;c.shadowColor='#7fd6ff';c.shadowBlur=8;c.beginPath();c.arc(e.x,e.y,17,e.a-NE.shield.arc,e.a+NE.shield.arc);c.stroke();c.restore()}
if(e.hch>0&&p.hp>0){const u=Math.min(1,e.hch/NE.hack.chan);c.save();c.strokeStyle='rgba(0,255,163,'+(.25+.5*u)+')';c.lineWidth=2;c.setLineDash([4,4]);c.beginPath();c.moveTo(e.x,e.y);c.lineTo(p.x,p.y);c.stroke();c.setLineDash([]);c.lineWidth=3;c.beginPath();c.arc(p.x,p.y,20,-Math.PI/2,-Math.PI/2+u*TAU);c.stroke();c.restore()}
if(T0.aura){c.save();c.fillStyle='rgba(0,229,255,.05)';c.strokeStyle='rgba(0,229,255,.35)';c.lineWidth=2;c.setLineDash([8,6]);c.beginPath();c.arc(e.x,e.y,B.aura,0,TAU);c.fill();c.stroke();c.setLineDash([]);
if(e.bs==='tele'){c.strokeStyle='rgba(255,59,59,'+(.45+.4*Math.sin(this.t*40))+')';c.lineWidth=6;c.beginPath();c.moveTo(e.x,e.y);c.lineTo(e.x+Math.cos(e.bang)*B.dash,e.y+Math.sin(e.bang)*B.dash);c.stroke()}
if(e.bs==='tp'){c.fillStyle='rgba(255,255,255,'+(.3+.4*Math.sin(this.t*50))+')';c.beginPath();c.arc(e.x,e.y,22,0,TAU);c.fill()}c.restore()}}
if(this.bcl.length){const rf=Save.d.set.reduceFlash,gk=Math.floor(this.t*18),T0=ET['2'];for(let i=0;i<this.bcl.length;i++){const h=this.bcl[i],al=(h.fd?h.fd/.3:Math.min(1,h.t*4))*(rf?.7:.6+.25*cyR(gk*2+i));c.save();c.globalAlpha=al;this.drawChar(h.x,h.y,h.a,T0.col,h.ph+h.t*3,true,T0.gl,0,false,T0.hair,T0.sc);this.cySlices(h.x,h.y,h.a,T0.gl,3,gk+i*3,h.ph,true);c.restore()}}},
});
// ---- hooks into the existing methods (wrappers, so the base files stay as they were)
// Drones fly in every state (patrol, search, chase) instead of using the ground path finder; walls and closed doors still stop them (then the path finder takes over).
G.goTo=function(e,tx,ty,spd,dt,face){if(ET[e.t].fly){const r=this.flyTo(e,tx,ty,spd,dt);if(face&&r>2)e.a=lerpA(e.a,Math.atan2(ty-e.y,tx-e.x),dt*8);return r}return neGoTo.call(this,e,tx,ty,spd,dt,face)};
{const base=G.updEn;G.updEn=function(e,dt){const T0=ET[e.t];
if(!e.dead&&T0.sandK&&this.p&&this.p.sd>0){const ks=this.tsc();if(ks>0&&ks<1)dt=dt/ks*T0.sandK}
if(e.sk>0)e.sk-=dt;base.call(this,e,dt);if(!e.dead&&T0.tick)this[T0.tick](e,dt)}}
{const base=G.updWorld;G.updWorld=function(dt){base.call(this,dt);const wdt=dt*this.tsc();this.updGr(wdt);this.updBcl(wdt)}}
{const base=G.load;G.load=function(i){base.call(this,i);this.gr=[];this.bcl=[];this.auraK=1;if(this.p)this.p.hk=0}}
// Skill lock (hacked) and the boss slowing aura, decided before the player's frame runs.
{const base=G.updPlayer;G.updPlayer=function(dt){const p=this.p;let k=1;
for(const e of this.en)if(!e.dead&&ET[e.t].aura&&Math.hypot(e.x-p.x,e.y-p.y)<NE.b2.aura)k=NE.b2.auraK;this.auraK=k*(this.fxSpd||1);
if((p.hk||0)>0){p.hk=Math.max(0,p.hk-dt);const c=Save.d.keys.sand;if(Input.once[c]){delete Input.once[c];this.pop(p.x,p.y-22,TL('HACKED'),'#ff3b3b')}}
base.call(this,dt)}}
{const base=G.hitPh;G.hitPh=function(b){return this.hitBc(b)||base.call(this,b)}}
{const base=G.meleePh;G.meleePh=function(M){const p=this.p;for(const h of this.bcl)if(!h.fd&&Math.hypot(h.x-p.x,h.y-p.y)<M.reach&&Math.abs(adiff(Math.atan2(h.y-p.y,h.x-p.x),p.a))<M.arc)this.bclKill(h);base.call(this,M)}}
{const base=G.drawWorld;G.drawWorld=function(){base.call(this);this.drawGrenades()}}
{const base=G.drawPh;G.drawPh=function(){base.call(this);this.drawNE()}}
// HUD: boss health bar (while a boss is hunting you), hack warning and skill-lock timer.
{const base=G.hud;G.hud=function(){base.call(this);const c=this.cx,cv=this.cv,p=this.p,u=this.hudU(),por=cv.width<cv.height,rm=Math.max(por?0:70*u,56*this.d),pad=12*u;c.save();
const bo=this.en.find(e=>!e.dead&&ET[e.t].boss&&e.s!=='patrol');
if(bo){const T0=ET[bo.t],w=Math.min(cv.width*.7,300*u),x=(cv.width-w)/2,y=pad+(por?124:58)*u;c.textAlign='center';c.font='bold '+12*u+'px monospace';c.fillStyle='#ff3b3b';c.fillText(TL(T0.nm),cv.width/2,y-4*u);c.fillStyle='#000a';c.fillRect(x,y,w,8*u);c.fillStyle='#ff3b3b';c.fillRect(x,y,w*Math.max(0,bo.hp/T0.hp),8*u);c.strokeStyle='#ff3b3b';c.lineWidth=1;c.strokeRect(x,y,w,8*u)}
if(this.en.some(e=>!e.dead&&e.hch>0)){c.textAlign='center';c.font='bold '+14*u+'px monospace';c.fillStyle='#00ffa3';c.fillText(TL('HACKING...'),cv.width/2,cv.height-pad-40*u)}
if((p.hk||0)>0){const bw=120*u,bh=8*u;c.textAlign='right';c.font='bold '+14*u+'px monospace';c.fillStyle='#ff3b3b';c.fillText(TL('SKILL LOCKED')+' '+p.hk.toFixed(1)+'s',cv.width-rm-pad,cv.height-pad-bh-26*u)}
c.restore()}}
