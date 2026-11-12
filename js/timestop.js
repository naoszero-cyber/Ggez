'use strict';
// DIO: THE WORLD (time stop). The knives volley lives in js/player.js (G.knives); projectiles that hang during the stop are in js/projectiles.js (HV).
// Time scale (G.tsc): 0 while time is stopped (enemies, bullets, particles, blast rings and every world animation freeze), SAND.slow in Sandevistan (0 while the Sandevistan rewind plays, js/sandrw.js), otherwise 1.
// DIO himself always runs in real time. Enemies cannot detect him while time is stopped: their AI does not run, noise is ignored, and an enemy that is hit
// but survives only becomes alert when time resumes. An enemy killed during the stop stays standing (e.fk) until time resumes, like Sandevistan.
// The meter p.tm (0..TSC.max) drains in real time while stopped (but not during the activation effect, when DIO is also held still) and refills while time runs. F again cancels at once and keeps what is left.
// Smoothstep 0..1 between a and b (activation effect timing).
const tsSm=(a,b,x)=>{x=Math.max(0,Math.min(1,(x-a)/(b-a)));return x*x*(3-2*x)};
// THE WORLD tunables (seconds). max = meter size and the longest single stop, regen = meter gained per second while time is running,
// min = meter needed to start a stop, fx = length of the activation effect.
const TSC={max:5,regen:.6,min:1,fx:1.5};
// DIO's throwing knives are limited: p.kn knives in stock (max = starting and highest stock), a batch of 3 knives grows back every sec seconds in real time (also while time is stopped; the timer only runs while the stock is below max and starts over when it is full). A volley throws 3 knives, or whatever is left (1 or 2).
const KN={max:6,batch:3,sec:4.5};
// Activation colour stages (u = where the stage starts): [u, 'colour'-blend tint, its alpha, 'overlay' tint, its alpha]. Uneven lengths and hard cuts like the anime cut:
// lavender-blue, a very short pink pop, long violet, green, yellow; the last stage is the glowing sphere that collapses into DIO.
const TSN=[[.04,'#7a6cff',.7,'#3a2cff',.5],[.21,'#ff3fa0',.85,'#ff2a6a',.6],[.24,'#a46bff',.7,'#5a1cc8',.55],[.49,'#f0ff70',.6,'#00c840',.6],[.6,'#f4e45a',.7,'#b89a00',.4],[.79,'#ffe650',.8,'#ffd23c',.4]];
Object.assign(G,{
wt:0,tsOn:false,tsv:0,tsi:0,tst:0,tsax:0,tsay:0,
tsc(){const p=this.p;return!p?1:((p.ts>0||this.rwOn())&&this.state==='play')?0:p.sd>0?SAND.slow:1},
// Per-frame meter logic (player update, real dt).
updTs(dt){const p=this.p;if(!p.dio)return;if(p.kn<KN.max){p.knt=(p.knt||0)+dt;if(p.knt>=KN.sec){p.knt=0;p.kn=Math.min(KN.max,p.kn+KN.batch)}}else p.knt=0;if(p.ts>0){if(this.tsOn&&this.tsi<=0)p.tm-=dt;if(p.tm<=0){p.tm=0;p.ts=0}}else p.tm=Math.min(TSC.max,p.tm+dt*TSC.regen)},
// F pressed: cancel if stopped, otherwise start when the meter allows.
tsKey(){const p=this.p;if(p.ts>0)p.ts=0;else if(p.tm>=TSC.min)p.ts=1},
// Barrels destroyed while time was stopped (q.pend) explode as soon as time runs again.
tsBoom(){if(this.tsc()===0)return;for(const q of this.props)if(q.pend){q.pend=0;this.grid[q.y][q.x]=0;this.boom((q.x+.5)*T,(q.y+.5)*T)}},
// Edges and screen effect state (real dt). Start: flash + shockwave ring + sound. End: dead-but-standing enemies drop, enemies hit during the stop turn alert.
updTsFx(dt){const p=this.p,on=!!(p&&p.dio&&p.ts>0&&this.state==='play');
if(on&&!this.tsOn){this.tsi=TSC.fx;this.tst=0;this.tsax=p.x;this.tsay=p.y;Snd.play('ts_on');Snd.loop('ts_clock',true)}
if(!on&&this.tsOn){this.tsi=0;Snd.play('ts_off');Snd.loop('ts_clock',false);for(const e of this.en){e.fk=0;if(e.pd>0){const d=e.pd;e.pd=0;if(!e.dead)this.hurtE(e,d)}if(e.hts){e.hts=0;if(!e.dead&&(e.s==='patrol'||e.s==='search'))this.setChase(e)}}}
if(!on)this.tsBoom();
this.tsOn=on;if(this.tsi>0)this.tsi=Math.max(0,this.tsi-dt);if(on)this.tst+=dt;
this.tsv+=((on?1:0)-this.tsv)*Math.min(1,dt*(on?14:8));if(this.tsv<.01)this.tsv=0},
// The player (body, psycho slices, melee arc). Split out so DIO can be drawn after the time-stop grey-out and stay in colour.
drawPlayer(){const c=this.cx,p=this.p;
if(this.state!=='dead'||this.dead<.2){this.drawChar(p.x,p.y,p.a,p.inv>0&&p.dash<=0&&!Save.d.set.reduceFlash?'#fff':p.dio?'#e6c200':'#00bcd4',p.ph,Math.hypot(p.vx,p.vy)>20,WEAP[p.ws[p.wi].id].gl,p.fl,false,p.dio?'#ffe97a':'#111',1,true)}
if(this.cgOn&&this.state==='play')this.cySlices(p.x,p.y,p.a,WEAP[p.ws[p.wi].id].gl,3,Math.floor(this.t*18),p.ph,Math.hypot(p.vx,p.vy)>20,true);
if(p.mel>0){const M=WEAP[p.mid]||WEAP.fist;c.save();c.globalAlpha=Math.min(1,p.mel/M.sw*.9);c.strokeStyle=M.col;c.lineWidth=3;c.beginPath();c.arc(p.x,p.y,M.reach*.65,p.a-M.arc+.1,p.a+M.arc-.1);c.stroke();c.restore()}},
// Time stop: colourless world (everything drawn so far). Called before DIO is redrawn on top.
// The grey-out is held back while the activation effect runs (tsGk) so the colour-inverted flicker is seen first, then the world drains to grey.
tsGk(){const k=Math.min(1,this.tsv);return this.tsi>0&&this.tsOn?k*tsSm(.55,.9,1-this.tsi/TSC.fx):k},
tsGray(){const c=this.cx,cv=this.cv,k=this.tsGk();c.save();c.setTransform(1,0,0,1,0,0);c.globalCompositeOperation='saturation';c.globalAlpha=k*.95;c.fillStyle='#808080';c.fillRect(0,0,cv.width,cv.height);
// Dim the greyed world (multiply) so it reads as dark and still; DIO is drawn again on top, so he stays bright.
c.globalCompositeOperation='multiply';c.globalAlpha=k;c.fillStyle='#7f86a4';c.fillRect(0,0,cv.width,cv.height);c.restore()},
// Outline of an irregular, spinning blob (the shockwave is NOT a circle in the anime cut: it is lopsided, off-centre, lumpy and turns as it goes): radius at angle t for mean radius r.
// ph = spin phase, k = how lumpy (0 = circle). The same outline is used for the ring and for the edge of the region where the negative shows.
tsBlob(t,r,ph,k){return r*(1+k*(.1*Math.sin(t+ph*.9+1)+.09*Math.sin(2*t-ph*1.3)+.06*Math.sin(3*t+ph*1.7+2)+.03*Math.sin(5*t-ph*2.3+4)))},
// Shockwave band (screen space) around (x,y) along the tsBlob outline. wd = mean half width; the band is thick on one side and thin on the other, with a soft glowing edge
// (stacked wider/fainter layers), a lavender haze just inside and a dark violet band outside that is heaviest on the thick side. a = alpha, ph/k as in tsBlob.
tsRing(x,y,r,wd,a,ph,k){if(a<=.01||r<2)return;if(k==null)k=1;const c=this.cx,n=96,th=t=>.45+1.1*(.5+.5*Math.sin(t-ph*.7+3)),
fl=(o1,o2,col,al)=>{c.beginPath();for(let i=0;i<=n;i++){const t=i/n*TAU,q=this.tsBlob(t,r,ph,k)+wd*th(t)*o2;i?c.lineTo(x+Math.cos(t)*q,y+Math.sin(t)*q):c.moveTo(x+Math.cos(t)*q,y+Math.sin(t)*q)}
for(let i=n;i>=0;i--){const t=i/n*TAU,q=Math.max(1,this.tsBlob(t,r,ph,k)+wd*th(t)*o1);c.lineTo(x+Math.cos(t)*q,y+Math.sin(t)*q)}c.closePath();c.globalAlpha=a*al;c.fillStyle=col;c.fill()};
c.save();c.globalCompositeOperation='source-over';
fl(.5,3.4,'rgb(30,10,70)',.5);fl(-3.4,-.2,'rgb(185,175,255)',.24);
[[2.8,.06],[2.2,.08],[1.7,.11],[1.3,.16],[1.0,.24],[.75,.38],[.55,.6],[.38,1]].forEach(([w,al])=>fl(-w,w,'rgb(255,255,255)',al));
c.restore()},
// Jagged white-gold starburst (the flash on DIO). sd changes the spike lengths every few frames so it crackles instead of glowing smoothly.
tsBurst(x,y,r,a,sd){const c=this.cx,n=16,g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,'rgba(255,253,235,1)');g.addColorStop(.5,'rgba(255,236,140,.85)');g.addColorStop(1,'rgba(255,205,70,0)');
c.beginPath();for(let i=0;i<n;i++){const t=(i+.5*cyR(sd+i*1.3))/n*TAU,L=r*(.35+.65*cyR(sd*3.1+i*2.7)),v=(i+.8)/n*TAU;c.lineTo(x+Math.cos(t)*L,y+Math.sin(t)*L);c.lineTo(x+Math.cos(v)*r*.22,y+Math.sin(v)*r*.22)}
c.closePath();c.globalAlpha=a;c.fillStyle=g;c.fill();c.globalAlpha=1},
// Spin + zoom smear around (sx,sy), strength s 0..1. The frame is copied to a half-size canvas and N rotated/zoomed copies are averaged exactly (copy i is drawn at alpha 1/(i+1)),
// so it is a real blur and not ghosting. A radial mask keeps the middle (DIO) fairly sharp and lets the blur grow towards the edges; the result is drawn over the live frame.
tsSwirl(sx,sy,s){const c=this.cx,cv=this.cv,w=cv.width,h=cv.height,k=.5,ww=Math.ceil(w*k),hh=Math.ceil(h*k);
if(!this.sw)this.sw=[document.createElement('canvas'),document.createElement('canvas')];
const A=this.sw[0],B=this.sw[1];if(A.width!==ww||A.height!==hh){A.width=B.width=ww;A.height=B.height=hh}
const a=A.getContext('2d'),b=B.getContext('2d'),x=sx*k,y=sy*k,N=w*h>2.2e6?7:10;
a.setTransform(1,0,0,1,0,0);a.globalCompositeOperation='source-over';a.globalAlpha=1;a.drawImage(cv,0,0,ww,hh);
b.setTransform(1,0,0,1,0,0);b.globalCompositeOperation='source-over';b.globalAlpha=1;b.clearRect(0,0,ww,hh);
for(let i=0;i<N;i++){const f=i/(N-1),z=1+s*.4*f;b.setTransform(1,0,0,1,0,0);b.translate(x,y);b.rotate(s*.62*(f-.5));b.scale(z,z);b.translate(-x,-y);b.globalAlpha=1/(i+1);b.drawImage(A,0,0)}
b.setTransform(1,0,0,1,0,0);b.globalCompositeOperation='destination-in';b.globalAlpha=1;const g=b.createRadialGradient(x,y,hh*.05,x,y,hh*.55);g.addColorStop(0,'rgba(0,0,0,.2)');g.addColorStop(1,'rgba(0,0,0,1)');b.fillStyle=g;b.fillRect(0,0,ww,hh);b.globalCompositeOperation='source-over';
c.globalCompositeOperation='source-over';c.globalAlpha=1;c.drawImage(B,0,0,w,h)},
// White spiral wisps (the anime's energy streaks) curling out of DIO: a = strength, t = u. Each streak has its own radius, length, speed and thickness and tapers at both ends.
tsWisp(x,y,R,a,t){const c=this.cx;c.save();c.lineCap='round';c.globalCompositeOperation='source-over';
for(let i=0;i<16;i++){const r0=R*(.06+.34*cyR(i*3.7+1)),len=1+cyR(i*9.1+4)*2.2,a0=cyR(i*7.1+3)*TAU+t*(3+4*cyR(i*2.2)),al=a*(.6+.4*cyR(i*1.9+5)),lw=(2+5*cyR(i*4.4+6))*this.d,n=20;
let px=0,py=0;for(let j=0;j<=n;j++){const f=j/n,an=a0+f*len,rr=r0*(1+f*.9),qx=x+Math.cos(an)*rr,qy=y+Math.sin(an)*rr;if(j){c.strokeStyle='rgba(245,240,255,'+al*Math.sin(Math.PI*(j-.5)/n)+')';c.lineWidth=lw;c.beginPath();c.moveTo(px,py);c.lineTo(qx,qy);c.stroke()}px=qx;py=qy}}
c.restore()},
// Activation effect (u = 0..1 over TSC.fx), modelled frame by frame on the anime cut:
// 0-.14 white-gold burst on DIO (a small orb, then a jagged starburst and a whiteout). .04-.24 a thick white shockwave front sweeps out; everything inside it is a spun, smeared colour NEGATIVE, the rest is still the normal picture.
// .24-.79 the whole frame stays negative and hard-cuts between colour stages of uneven length (TSN: lavender-blue, a short pink pop, long violet, green, yellow), with a smear pulse on some cuts.
// .79-1 the negative collapses into DIO as a shrinking glowing sphere (white rim, spiral smear) while the world drains to grey behind it (tsGk), ending in a small glow on DIO.
// Reduce motion drops the smear; Reduce flashing drops the negative, pops and flicker (one soft steady tint instead) and softens the rings and flashes.
tsAct(u,sx,sy){const c=this.cx,w=this.cv.width,h=this.cv.height,S=Save.d.set,rf=S.reduceFlash,rm=S.reduceMotion,R=Math.hypot(w,h),sm=tsSm,bp=(a,b,e)=>sm(a,b,u)*(1-sm(b,e,u)),fq=rf?.3:1,
e1=Math.min(1,Math.max(0,(u-.04)/.2)),r1=(1-Math.pow(1-e1,2.2))*R*1.05,ec=Math.min(1,Math.max(0,(u-.79)/.2)),rc=Math.pow(1-ec,1.35)*R*.62,rN=u<.24?r1:u<.79?R:rc,ra=rf?.4:1;
// Inside the shockwave front / the collapsing sphere: smear, negative, colour stage, dark corners, sphere glow.
if(rN>1){c.save();if(rN<R){const pz=u<.5?u*14:u*12+5;c.beginPath();for(let i=0;i<=96;i++){const t=i/96*TAU,q=this.tsBlob(t,rN,pz,1);i?c.lineTo(sx+Math.cos(t)*q,sy+Math.sin(t)*q):c.moveTo(sx+Math.cos(t)*q,sy+Math.sin(t)*q)}c.closePath();c.clip()}
let s=0;if(!rm){s=Math.max(bp(.04,.1,.34),.12*sm(.08,.16,u)*(1-sm(.74,.8,u)),.4*bp(.2,.21,.26),.3*bp(.235,.245,.29),.45*bp(.49,.5,.55),bp(.78,.87,.99));if(s>.02)this.tsSwirl(sx,sy,s)}
if(!rf){const a=.92*(.92+.08*cyR(Math.floor(this.tst*24)*1.7));let i=0;for(let j=0;j<TSN.length;j++)if(u>=TSN[j][0])i=j;
const f=Math.min(1,Math.max(0,(u-TSN[i][0])/.015)),pp=i?1-Math.min(1,Math.max(0,(u-TSN[i][0])/.035)):0,L=(g,m)=>{c.globalCompositeOperation='color';c.globalAlpha=a*g[2]*m;c.fillStyle=g[1];c.fillRect(0,0,w,h);c.globalCompositeOperation='overlay';c.globalAlpha=a*g[4]*m;c.fillStyle=g[3];c.fillRect(0,0,w,h)};
c.globalCompositeOperation='difference';c.globalAlpha=a;c.fillStyle='#fff';c.fillRect(0,0,w,h);
c.globalCompositeOperation='multiply';c.globalAlpha=a;c.fillStyle='#9a9ac4';c.fillRect(0,0,w,h);c.globalCompositeOperation='overlay';c.globalAlpha=.8*a;c.drawImage(this.cv,0,0);
if(i&&f<1)L(TSN[i-1],1-f);L(TSN[i],f);
c.globalCompositeOperation='source-over';if(pp>0){c.globalAlpha=.2*pp;c.fillStyle='#fff';c.fillRect(0,0,w,h)}
const vg=c.createRadialGradient(sx,sy,h*.25,sx,sy,R*.7);vg.addColorStop(0,'rgba(0,0,30,0)');vg.addColorStop(1,'rgba(0,0,30,.75)');c.globalAlpha=a;c.fillStyle=vg;c.fillRect(0,0,w,h);if(s>.1)this.tsWisp(sx,sy,R,Math.min(1,s*1.2),u)}
else if(u<.5){c.globalAlpha=.25*(1-u/.5);c.fillStyle='#6a5cff';c.fillRect(0,0,w,h)}
if(u>.79){const g=c.createRadialGradient(sx,sy,0,sx,sy,Math.max(1,rc));g.addColorStop(0,'rgba(255,246,190,.05)');g.addColorStop(.7,'rgba(255,240,160,.16)');g.addColorStop(1,'rgba(255,255,255,.6)');c.globalCompositeOperation='source-over';c.globalAlpha=Math.min(1,ec*6)*(rf?.3:.7);c.fillStyle=g;c.fillRect(0,0,w,h)}
c.restore()}
// Shockwave front and the rim of the collapsing sphere.
if(e1>0&&e1<1){const a1=Math.min(1,e1*8)*(1-e1*e1)*ra,wd=h*(.03+.02*(1-e1));this.tsRing(sx,sy,r1,wd,a1,u*14);this.tsRing(sx,sy,r1*.8,wd*.35,a1*.5,u*14+2,1.3)}
if(ec>0&&ec<1)this.tsRing(sx,sy,rc,h*(.014+.034*Math.sqrt(rc/R)),Math.min(1,ec*8)*(1-sm(.9,1,ec))*ra,u*12+5);
// Start burst: hard attack, fast decay.
const bf=u<.02?u/.02:Math.pow(Math.max(0,1-(u-.02)/.12),2);
if(bf>.01){c.globalCompositeOperation='source-over';c.globalAlpha=.55*bf*fq;c.fillStyle='rgb(255,244,205)';c.fillRect(0,0,w,h);const br=R*(.03+.2*sm(0,.08,u));this.tsBurst(sx,sy,br,bf*fq,Math.floor(u*45));
const cg=c.createRadialGradient(sx,sy,0,sx,sy,br*.5);cg.addColorStop(0,'rgba(255,255,255,1)');cg.addColorStop(1,'rgba(255,240,170,0)');c.globalAlpha=bf*fq;c.fillStyle=cg;c.fillRect(sx-br,sy-br,br*2,br*2)}
// Small glow on DIO as the sphere closes.
const eg=bp(.86,.94,1);if(eg>.01){const er=R*.05,g=c.createRadialGradient(sx,sy,0,sx,sy,er);g.addColorStop(0,'rgba(255,250,215,1)');g.addColorStop(.5,'rgba(255,230,120,.7)');g.addColorStop(1,'rgba(255,210,80,0)');c.globalAlpha=eg*fq;c.fillStyle=g;c.fillRect(sx-er,sy-er,er*2,er*2)}
c.globalAlpha=1;c.globalCompositeOperation='source-over'},
// Screen-space time-stop treatment. Activation: see tsAct. Stopped: dark cool vignette, thin white energy ribbons and sparkles fixed in the world where the stop began.
tsFx(){const c=this.cx,cv=this.cv,w=cv.width,h=cv.height,d=this.d,p=this.p,k=this.tsGk(),sx=(p.x-this.cam.x)*this.s+w/2,sy=(p.y-this.cam.y)*this.s+h/2,on=this.tsi>0,u=on?1-this.tsi/TSC.fx:1,ax=(this.tsax-this.cam.x)*this.s+w/2,ay=(this.tsay-this.cam.y)*this.s+h/2;c.save();
if(on)this.tsAct(u,sx,sy);
if(k>0){
// Stopped world: cool dark vignette, white ribbons and sparkles. The ribbons and sparkles are fixed in the world where the stop began (they do not follow DIO) and do not animate.
const g=c.createRadialGradient(w/2,h/2,h*.2,w/2,h/2,h*.9);g.addColorStop(0,'rgba(20,24,70,0)');g.addColorStop(1,'rgba(8,10,40,'+.38*k+')');c.fillStyle=g;c.fillRect(0,0,w,h);
c.lineCap='round';
for(let i=0;i<9;i++){const ra=h*(.34+.42*cyR(i*2.3+1)),rb=ra*(.45+.4*cyR(i*3.9+2)),rot=cyR(i*5.1+3)*Math.PI,a0=i*TAU/9,len=.7+cyR(i*7.7+4)*1.1,n=14;
for(let j=0;j<n;j++){const sn=Math.sin(Math.PI*(j+.5)/n);c.strokeStyle='rgba(235,240,255,'+(.5*sn*k)+')';c.lineWidth=(.8+1.8*sn)*d;c.beginPath();c.ellipse(ax,ay,ra,rb,rot,a0+len*j/n,a0+len*(j+1)/n+.02);c.stroke()}}
for(let i=0;i<60;i++){const x=ax+(cyR(i*3.1+1)-.5)*1.8*w,y=ay+(cyR(i*5.7+2)-.5)*1.8*h,r=(2+cyR(i*7.3+3)*4)*d,tw=.75;
c.fillStyle='rgba(235,245,255,'+(.85*tw*k)+')';c.fillRect(x-r,y-d*.5,r*2,d);c.fillRect(x-d*.5,y-r,d,r*2);c.fillRect(x-d,y-d,d*2,d*2)}}
c.restore()},
});
