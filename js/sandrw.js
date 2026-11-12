'use strict';
// Sandevistan rewind (tunables: RW below). When Sandevistan is switched off, the world you ran through is rewound and replayed together with your blue run (js/sandfx.js).
// While it is on (js/game.js updSand calls rwStart / rwTick) the world is sampled every RW.step s of your own time: your pose and weapon, every enemy that was alive when it began
// (position, facing, flash, state, hp, dead), every live bullet, doors, crates and barrels, floor pickups, blast rings, and the gunshot / hit sounds (RW.snd) that were made.
// On close (rwBegin) the world is frozen, enemies are put back where they stood when you switched it on, walk their old paths again and die again at the moments they died,
// bullets fly again, doors open and shut again, crates and barrels break and blow again, pickups are lying there again until you pass, the sounds play again,
// and you are carried along the recorded run at the speed of the streak (G.sdd) with the controls locked. Nobody reacts to you: AI, damage, noise, score and kills are off.
// When the replay ends everything is put back exactly as it was at the end of the run (kills, score, combo, hp and ammo were already counted once and are not counted again).
// Not rewound: hp, ammo, score. Not replayed: other sounds (doors, explosions, pickups, kills, footsteps). Reduce motion skips the rewind.
// G.rwOn() is true while it plays: G.tsc() returns 0 then (world frozen) and G.update skips updPlayer.
const RW={step:1/30,max:3600,pk:['x','y','vx','vy','a','fl','mel','mid','ph','inv','ws','wi'],snd:new Set(['pistol','smg','rifle','shotgun','efire','hit'])};
Object.assign(G,{
rw:null,rwR:null,rwGo:0,
rwOn(){return!!(this.rw&&this.rw.p===this.p)},
// One sample (R = recorder or playback object with fr, the frames, and al, which enemies were alive at the start).
rwSnap(R,t){const p=this.p,w=p.ws[p.wi],b=[];for(const q of this.bl)if(q.on)b.push([q.x,q.y,q.vx,q.vy,q.th,q.own,q.sp,q.ang]);
R.fr.push({t,e:this.en.map((o,i)=>R.al[i]?[o.x,o.y,o.a,o.ph,o.fl,o.sw,o.dead?1:0,o.s,o.hp]:null),b,pf:p.fl,pm:p.mel,pi:p.mid,wid:w.id,vx:p.vx,vy:p.vy,ph:p.ph,
d:this.doors.map(o=>o.open),q:this.props.map(o=>[o.hp,o.fl]),k:this.pk.map(o=>o.on),i:this.intel.map(o=>o.on),r:this.rings.map(o=>[o.x,o.y,o.t])})},
// Sandevistan switched on: start recording.
rwStart(){if(this.rw)this.rwFinish(true);const R={fr:[],al:this.en.map(e=>!e.dead),lt:0,bad:0,sn:[]};this.rwR=R;this.rwSnap(R,0)},
// Sandevistan switched off (rwGo is set only when a replay of the run was started): begin the rewind. The closing frame still runs normally (arm); the world is taken over from the next tick.
rwBegin(){const go=this.rwGo,R=this.rwR;this.rwGo=0;this.rwR=null;if(!go||!R||R.bad||R.fr.length<2||this.spr.length<2||Save.d.set.reduceMotion)return;this.rw={p:this.p,fr:R.fr,al:R.al,sn:R.sn,si:0,fin:null,arm:1}},
rwTick(dt,on){const R=this.rwR;
if(on&&R&&!R.bad&&this.sdt-R.lt>=RW.step-1e-6){R.lt=this.sdt;if(R.fr.length>=RW.max)R.bad=1;else this.rwSnap(R,this.sdt)}
if(this.rw){if(this.rw.arm)this.rw.arm=0;else this.rwApply(dt)}},
// Hits seen between frame k-1 and k (hp went down) play their blood effect again; no sound, score or damage.
// Crates and barrels that lost hp or broke show their sparks, debris and fireball again (no shake, noise or damage).
rwEv(F,k){const a=F[k-1].e,b=F[k].e;for(let i=0;i<b.length;i++){const s=b[i],o=a[i];if(s&&o&&s[8]<o[8])this.emit(s[0],s[1],6,'#b01030',110,.5,2)}
const qa=F[k-1].q,qb=F[k].q;for(let i=0;i<qb.length;i++)if(qb[i][0]<qa[i][0]){const q=this.props[i],x=(q.x+.5)*T,y=(q.y+.5)*T;
if(qb[i][0]>0)this.emit(x,y,3,q.k==='c'?'#c8a15a':'#ff8844',90,.25,2);else if(q.k==='c')this.emit(x,y,14,'#a7793d',140,.5,2);else{this.emit(x,y,28,'#ffb300',220,.6,3);this.emit(x,y,16,'#ff3b3b',160,.5,3)}}},
// Sounds logged up to run time t play again, one per kind per frame (a burst of shots at 20x would otherwise be hundreds of plays).
rwSn(R,t){const s=new Set();while(R.si<R.sn.length&&R.sn[R.si].t<=t)s.add(R.sn[R.si++].n);for(const n of s)Snd.play(n)},
rwApply(dt){const R=this.rw,p=this.p,F=R.fr,P=this.spr;
if(this.state!=='play'||!P||P.length<2){this.rwFinish(true);return}
if(!R.fin){const f={en:this.en.map(e=>({...e})),bl:this.bl.map(b=>({...b})),p:{},d:this.doors.map(o=>[o.open,o.a]),q:this.props.map(o=>[o.hp,o.fl]),k:this.pk.map(o=>o.on),i:this.intel.map(o=>o.on),r:this.rings,g:this.doors.concat(this.props).map(o=>this.grid[o.y][o.x])};for(const k of RW.pk)f.p[k]=p[k];R.fin=f;this.rwSnap(R,Math.max(F[F.length-1].t,this.sdt));R.fi=0}
const el=this.sdl-this.sde,hd=Math.min(1,el/Math.max(.01,this.sdd));
if(el>=this.sdd||this.sde<=0){this.rwFinish();return}
const fi=t=>{let i=0;while(i<F.length-2&&F[i+1].t<=t)i++;return i};
// you: carried along the recorded run (same point as the head of the blue streak)
const n=P.length,tq=P[0].t+hd*(P[n-1].t-P[0].t);let j=0;while(j<n-2&&P[j+1].t<=tq)j++;
const A=P[j],B=P[j+1],dp=B.t-A.t,fr=dp>0?Math.min(1,Math.max(0,(tq-A.t)/dp)):1,g=F[fi(tq)],pws=R.fin.p.ws;
p.x=A.x+(B.x-A.x)*fr;p.y=A.y+(B.y-A.y)*fr;p.a=lerpA(A.a,B.a,fr);p.vx=g.vx;p.vy=g.vy;p.ph=g.ph;p.fl=g.pf;p.mel=g.pm;p.mid=g.pi;p.inv=0;
const wi=pws.findIndex(q=>q.id===g.wid);if(wi>=0){p.ws=pws;p.wi=wi}else{p.ws=[{id:g.wid,mag:0,res:0}];p.wi=0}
// the world: enemies and bullets at the same point of the run
const tw=F[0].t+hd*(F[F.length-1].t-F[0].t),i=fi(tw),a=F[i],b=F[i+1],du=b.t-a.t,u=du>0?Math.min(1,Math.max(0,(tw-a.t)/du)):1;
for(let k=0;k<this.en.length;k++){const s=a.e[k],q=b.e[k];if(!s||!q)continue;const e=this.en[k];e.x=s[0]+(q[0]-s[0])*u;e.y=s[1]+(q[1]-s[1])*u;e.a=lerpA(s[2],q[2],u);e.ph=s[3]+(q[3]-s[3])*u;e.fl=s[4];e.sw=s[5];e.dead=s[6];e.s=s[7];e.hp=s[8];e.fk=0}
let m=0;for(const q of this.bl){const s=a.b[m++];if(s)Object.assign(q,{on:1,x:s[0],y:s[1],vx:s[2],vy:s[3],th:s[4],own:s[5],sp:s[6],ang:s[7],hv:0});else q.on=0}
for(let k=0;k<this.doors.length;k++){const d=this.doors[k];d.open=a.d[k];this.grid[d.y][d.x]=d.open?0:2}
for(let k=0;k<this.props.length;k++){const q=this.props[k],o=a.q[k];q.hp=o[0];q.fl=o[1];this.grid[q.y][q.x]=o[0]>0?(q.k==='c'?5:6):0}
for(let k=0;k<this.pk.length;k++)this.pk[k].on=a.k[k];for(let k=0;k<this.intel.length;k++)this.intel[k].on=a.i[k];
this.rings=a.r.map(o=>({x:o[0],y:o[1],t:o[2],h:new Set()}));
for(;R.fi<i;)this.rwEv(F,++R.fi);this.rwSn(R,tw);
this.updParticles(dt)},
// End: remaining hit effects, then everything goes back to how it was at the end of the run.
rwFinish(quiet){const R=this.rw;this.rw=null;if(!R||!R.fin)return;const f=R.fin,F=R.fr;
if(!quiet){for(;R.fi<F.length-1;)this.rwEv(F,++R.fi);this.rwSn(R,1e9)}
if(f.en.length===this.en.length)for(let k=0;k<f.en.length;k++)Object.assign(this.en[k],f.en[k]);
for(let k=0;k<f.bl.length;k++)Object.assign(this.bl[k],f.bl[k]);
for(let k=0;k<this.doors.length;k++){const d=this.doors[k];d.open=f.d[k][0];d.a=f.d[k][1]}
for(let k=0;k<this.props.length;k++){const q=this.props[k];q.hp=f.q[k][0];q.fl=f.q[k][1]}
this.doors.concat(this.props).forEach((o,k)=>{this.grid[o.y][o.x]=f.g[k]});
for(let k=0;k<this.pk.length;k++)this.pk[k].on=f.k[k];for(let k=0;k<this.intel.length;k++)this.intel[k].on=f.i[k];
this.rings=f.r;Object.assign(this.p,f.p)},
});
// Gunshot and hit sounds made while Sandevistan is on are logged (kind + run time) for the replay.
{const play=Snd.play;Snd.play=function(n){const R=G.rwR;if(R&&!R.bad&&G.state==='play'&&RW.snd.has(n))R.sn.push({t:G.sdt,n});return play.apply(this,arguments)}}
