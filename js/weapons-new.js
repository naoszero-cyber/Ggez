'use strict';
// New weapons. Pickup map letters (js/levels.js): U revolver, Y sniper rifle, L katana, F grenades, J rocket launcher,
// h heavy MG, r railgun, g grenade launcher, b sledgehammer (these four come from the weapons-upgrades build).
// All of them go through the existing weapon code (ammo, reload, swap, recoil, melee swing); the extras live here as hooks:
// sniper: bullets pierce up to W.pr enemies (each hit costs 30% of the damage), the shot is loud (W.nzf noise radius).
// rocket: the bullet carries no damage of its own; wherever it stops (enemy, shield, wall, end of range) it makes a blast ring.
// grenades: W.mag is the number of grenades held (no reload). A throw lands where you aim (up to W.mxr px, stops before walls) and blows up W.fuse s after the throw.
// katana: melee weapon that cannot be thrown (no thd).
// hmg: plain gun, but walking while it is held is slower (mv = walk speed factor, read in js/player.js).
// rail: pr 99 = the slug goes through every enemy in line (shields still stop it) and pf 1 = no damage loss per enemy passed.
// gren (grenade launcher): rk like the rocket (the shell blows up wherever it stops, js/weapons-new.js hooks) but it also deals its own dmg on a direct hit.
// hammer: heavy melee weapon, slash only (no throw).
// The skill tree (js/skilltree.js) scales these values per run; WEAP0 keeps the untouched originals.
Object.assign(WEAP,{
revolver:{n:'REVOLVER',dmg:70,rate:.55,mag:6,res:30,rl:1.6,sp:.012,spd:800,pel:1,rng:700,snd:'pistol',gl:12,rc:.2},
sniper:{n:'SNIPER RIFLE',dmg:120,rate:1.3,mag:5,res:20,rl:2.2,sp:.004,spd:1400,pel:1,rng:1200,snd:'rifle',gl:22,rc:.35,pr:3,nzf:560},
katana:{n:'KATANA',melee:1,dmg:90,cd:.35,sw:.15,reach:56,arc:1.3,nz:60,col:'#e0e0ff',gl:18,mag:0,res:0},
grenade:{n:'GRENADES',gr:1,dmg:0,rate:.6,mag:3,res:0,rl:9,sp:0,spd:0,pel:0,rng:0,snd:'throw',gl:6,fuse:1,mxr:320},
rocket:{n:'ROCKET LAUNCHER',rk:1,dmg:0,rate:.8,mag:1,res:4,rl:1.8,sp:.01,spd:420,pel:1,rng:900,snd:'shotgun',gl:22,rc:.3},
hmg:{n:'HEAVY MG',dmg:20,rate:.07,mag:100,res:200,rl:3.2,sp:.1,spd:800,pel:1,rng:620,snd:'hmg',gl:22,rc:.04,mv:.8},
rail:{n:'RAILGUN',dmg:85,rate:1.3,mag:3,res:12,rl:2.4,sp:0,spd:2000,pel:1,rng:1400,snd:'rail',gl:22,rc:.3,pr:99,pf:1},
gren:{n:'GRENADE LAUNCHER',rk:1,dmg:40,rate:.9,mag:4,res:12,rl:2.2,sp:.02,spd:380,pel:1,rng:520,snd:'gren',gl:18,rc:.2,mv:.9},
hammer:{n:'SLEDGEHAMMER',melee:1,dmg:200,cd:1,sw:.3,reach:58,arc:1.3,nz:220,col:'#ffa94d',gl:18,mag:0,res:0}});
Object.assign(PK,{U:'revolver',Y:'sniper',L:'katana',F:'grenade',J:'rocket',h:'hmg',r:'rail',g:'gren',b:'hammer'});
const WEAP0=JSON.parse(JSON.stringify(WEAP));
Object.assign(G,{
pg:[],exFx:{R:96,dm:1,sf:1},
throwGrenade(w){const p=this.p,I=Input,W=WEAP[w.id];let fx,fy;
if(I.touch||I.aim()||p.cyp){fx=p.x+Math.cos(p.a)*260;fy=p.y+Math.sin(p.a)*260}else{fx=(I.mx-this.cv.width/2)/this.s+this.cam.x;fy=(I.my-this.cv.height/2)/this.s+this.cam.y}
let dx=fx-p.x,dy=fy-p.y,d=Math.hypot(dx,dy)||1;if(d>W.mxr)d=W.mxr;const ux=dx/(Math.hypot(dx,dy)||1),uy=dy/(Math.hypot(dx,dy)||1);let L=d;
for(let s=12;s<=d;s+=6)if(solid(p.x+ux*s,p.y+uy*s)){L=Math.max(0,s-10);break}
this.pg.push({sx:p.x,sy:p.y,tx:p.x+ux*L,ty:p.y+uy*L,x:p.x,y:p.y,t:0,T:Math.min(.7,L/450+.15),F:W.fuse})},
updPg(wdt){for(let i=this.pg.length-1;i>=0;i--){const g=this.pg[i];g.t+=wdt;const u=Math.min(1,g.t/g.T);g.x=g.sx+(g.tx-g.sx)*u;g.y=g.sy+(g.ty-g.sy)*u;if(g.t>=g.F){this.pg.splice(i,1);this.boom(g.x,g.y,this.exFx)}}},
// A rocket that stopped: step back from the wall so the blast ring is not inside a solid tile.
rocketBoom(b){const s=Math.hypot(b.vx,b.vy)||1;let x=b.x-b.vx/s*10,y=b.y-b.vy/s*10;if(solid(x,y)){x=b.x-b.vx/s*20;y=b.y-b.vy/s*20}if(solid(x,y)){x=this.p.x;y=this.p.y}this.boom(x,y,this.exFx)},
drawPg(){const c=this.cx;for(const g of this.pg){const u=Math.min(1,g.t/g.T),h=Math.sin(Math.PI*u)*30,blink=g.F-g.t<.4&&Math.floor(g.t*14)%2;c.save();
c.fillStyle='rgba(0,0,0,.35)';c.beginPath();c.ellipse(g.x,g.y,4,2.5,0,0,TAU);c.fill();c.fillStyle=blink?'#fff':'#9acd32';c.beginPath();c.arc(g.x,g.y-h,4,0,TAU);c.fill();c.strokeStyle='#2f3d0a';c.lineWidth=1.5;c.stroke();c.restore()}}});
// ---- hooks
{const base=G.spawnB;G.spawnB=function(x,y,a,spd,dmg,own,rng){const b=base.call(this,x,y,a,spd,dmg,own,rng);
if(b){b.rk=0;b.pr=0;b.pf=0;b.hs=null;if(own===0&&this.p&&this.p.hp>0){const w=this.p.ws[this.p.wi],W=w&&WEAP[w.id];if(W){if(W.rk)b.rk=1;if(W.pr)b.pr=W.pr;if(W.pf)b.pf=1;if(W.nzf)this.noise(this.p.x,this.p.y,W.nzf,true)}}}return b}}
{const base=G.updB;G.updB=function(b,dt){const was=b.on&&b.rk;base.call(this,b,dt);if(was&&!b.on)this.rocketBoom(b)}}
{const base=G.boom;G.boom=function(x,y,o){base.call(this,x,y);if(o){const r=this.rings[this.rings.length-1];if(r)Object.assign(r,{R:o.R,dm:o.dm,sf:o.sf})}}}
{const base=G.takePk;G.takePk=function(k){const W=WEAP[k.id];
if(W.gr){const p=this.p,ex=p.ws.find(q=>q.id===k.id);k.on=0;if(ex)ex.mag=Math.min(9,ex.mag+W.mag);else{p.ws.push({id:k.id,mag:W.mag,res:0});p.wi=p.ws.length-1;p.rlt=0}Snd.play('pickup');this.pop(k.x,k.y,W.n,'#ffb300');return}
base.call(this,k)}}
{const base=G.updPlayer;G.updPlayer=function(dt){const p=this.p,w=p.ws[p.wi],W=w&&WEAP[w.id],m0=w?w.mag:0;base.call(this,dt);
if(W&&W.gr&&w.mag<m0&&this.state==='play')this.throwGrenade(w);
for(let i=p.ws.length-1;i>=0;i--){const q=p.ws[i];if(WEAP[q.id].gr){if(q.res>0){q.mag=Math.min(9,q.mag+q.res);q.res=0}if(q.mag<=0){p.ws.splice(i,1);if(p.wi>i)p.wi--;else if(p.wi===i)p.wi=Math.max(0,i-1);p.rlt=0}}}}}
{const base=G.updWorld;G.updWorld=function(dt){base.call(this,dt);this.updPg(dt*this.tsc())}}
{const base=G.load;G.load=function(i){base.call(this,i);this.pg=[]}}
{const base=G.drawWorld;G.drawWorld=function(){base.call(this);this.drawPg();
// Aim line while a knife throw is being aimed (hold fire, release to throw).
const p=this.p,w=p&&p.ws[p.wi],W=w&&WEAP[w.id];if(p&&p.tk&&!p.tkx&&W&&W.thd&&this.state==='play'){const c=this.cx,ca=Math.cos(p.a),sa=Math.sin(p.a);c.save();c.strokeStyle='rgba(255,255,255,.55)';c.lineWidth=1.5;c.setLineDash([6,6]);c.beginPath();c.moveTo(p.x+ca*18,p.y+sa*18);c.lineTo(p.x+ca*W.thr,p.y+sa*W.thr);c.stroke();c.restore()}}}
