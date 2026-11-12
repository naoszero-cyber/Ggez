'use strict';
// Sandevistan screen effects, modelled on the Edgerunners / Cyberpunk cut as recreated in the reference clip (tunables: SDX in js/game.js).
// Activation (SDX.in s): a burst of RGB glitch blocks over the scene, then a white flash and a green flash that fall into the active look.
// Active: the whole frame is tinted to one hue that ages with the Sandevistan gauge (p.cy): teal -> green -> olive -> orange -> red. The player and the afterimage chain are redrawn on top so they keep their own colours.
// Closing: the blue surge is a REPLAY of the run you just made, played back at 1/SAND.slow speed (20x) as a blue streak with blue afterimages, the way everyone moving at normal speed saw you.
// The path is recorded while the skill is on (G.sp) and handed to G.spr when it ends (js/game.js).
// Reduce flashing drops the glitch and the white/green flashes and uses softer alphas; Reduce motion drops the glitch and shows the replayed path as a still fading streak.
const SD_TONE=[[0,25,235,205],[.25,40,225,70],[.55,200,210,50],[.8,240,130,40],[1,225,55,45]];
function sdTone(u){u=Math.max(0,Math.min(1,u));for(let i=1;i<SD_TONE.length;i++){const a=SD_TONE[i-1],b=SD_TONE[i];if(u<=b[0]){const f=(u-a[0])/(b[0]-a[0]);return[1,2,3].map(j=>Math.round(a[j]+(b[j]-a[j])*f))}}return SD_TONE[4].slice(1)}
Object.assign(G,{
// One silhouette of the player (g = {x,y,a,gun,gl,sw}) in colour col ('r,g,b') at alpha al; glow > 0 adds an additive halo.
sdFig(g,col,al,glow){const c=this.cx;c.save();c.translate(g.x,g.y);c.rotate(g.a);c.fillStyle='rgb('+col+')';c.globalAlpha=al;
c.fillRect(-4+g.sw,-8,8,4);c.fillRect(-4-g.sw,4,8,4);c.beginPath();c.ellipse(0,0,7,11,0,0,TAU);c.fill();c.fillRect(4,2,g.gl,3.5);c.fillRect(2,-6,8,3);c.beginPath();c.arc(1,0,5.5,0,TAU);c.fill();
c.globalAlpha=al*.75;c.strokeStyle='rgb('+col+')';c.lineWidth=1.5;c.beginPath();c.ellipse(0,0,7,11,0,0,TAU);c.stroke();
if(glow>0){c.globalCompositeOperation='lighter';c.globalAlpha=glow;c.beginPath();c.ellipse(0,0,10,14,0,0,TAU);c.fill()}c.restore()},
// Afterimage chain: flat silhouettes of the player left behind as it moves. Newest is cyan-white and brightest, then blue -> violet -> olive -> maroon (sandCol); the newest few also glow.
drawGhosts(){const n=this.gh.length;for(let i=0;i<n;i++){const u=n>1?1-i/(n-1):0,nw=n-1-i;this.sdFig(this.gh[i],sandCol(u).join(','),.74-.2*u,nw<8?.28*(1-nw/8):0)}},
// RGB glitch burst at the very start of the activation (u = 0..1 over the burst); the blocks change every ~30 ms.
sdGlitch(u){const c=this.cx,w=this.cv.width,h=this.cv.height,f=Math.floor(this.t*30),cols=['#ff2a2a','#2aff4a','#2a6aff','#ffffff','#ff2aff','#2affff','#ffee2a'];c.globalAlpha=1-.5*u;
for(let i=0;i<46;i++){const r=f*17+i*3.3,x=cyR(r)*w,y=cyR(r+1)*h,bw=(.02+cyR(r+2)*.22)*w,bh=(.004+cyR(r+3)*.03)*h;c.fillStyle=cols[Math.floor(cyR(r+4)*7)];c.fillRect(x,y,bw,bh)}
c.fillStyle='#fff';c.globalAlpha=.8*(1-u);c.fillRect(w*(.4+cyR(f)*.2),0,w*.02,h);c.globalAlpha=1},
// Closing surge (world transform must be set): the recorded run (G.spr, oldest first, timed) is replayed at 1/SAND.slow speed, the way everyone at normal speed saw it (G.sdd = replay length in s, el = s since it began).
// A blue streak with a bright head runs along the path with thin speed lines beside it and blue silhouettes of the player trailing behind the head. a = overall alpha.
sdReplay(el,a){const P=this.spr,n=P.length;if(n<2||a<=.01)return;const c=this.cx,hd=Save.d.set.reduceMotion?1:Math.min(1,el/Math.max(.01,this.sdd)),tq=P[0].t+hd*(P[n-1].t-P[0].t);
let j=0;while(j<n-2&&P[j+1].t<=tq)j++;const dt=P[j+1].t-P[j].t,fr=dt>0?Math.min(1,Math.max(0,(tq-P[j].t)/dt)):1,hi=j+fr,tl=Math.max(2,.45*(n-1)),i0=Math.max(0,Math.floor(hi-tl)),i1=Math.floor(hi),st=Math.max(1,Math.ceil((i1-i0)/180)),
lp=(p,q,t)=>p+(q-p)*t,col=t=>[lp(25,95,t),lp(80,195,t),255].map(Math.round).join(',');
c.save();c.globalCompositeOperation='lighter';c.lineCap='round';c.lineJoin='round';
for(let pass=0;pass<5;pass++)for(let i=i0;i+st<=i1;i+=st){const f=1-(hi-i)/tl,al=Math.pow(Math.max(0,f),1.5)*a;if(al<=.01)continue;const A=P[i],B=P[Math.min(n-1,i+st)];let ox=0,oy=0;
if(pass>2){const l=Math.hypot(B.x-A.x,B.y-A.y)||1,o=(pass===3?-1:1)*(7+9*f);ox=-(B.y-A.y)/l*o;oy=(B.x-A.x)/l*o}
c.strokeStyle='rgb('+(pass===2?'160,220,255':col(f))+')';c.globalAlpha=al*(pass===0?.25:pass===1?.9:pass===2?.8:.55);c.lineWidth=pass>2?1+1.5*f:(1.5+8.5*f)*(pass===0?2.6:pass===1?1:.35);c.beginPath();c.moveTo(A.x+ox,A.y+oy);c.lineTo(B.x+ox,B.y+oy);c.stroke()}
c.globalCompositeOperation='source-over';
for(let k=0;k<7;k++){const g=P[Math.min(n-1,Math.round(Math.max(0,hi-k*.04*(n-1))))];this.sdFig(g,col(1-k/7),a*(.8-k*.1),k<3?.2*a:0)}
const A=P[j],B=P[Math.min(n-1,j+1)],H={x:A.x+(B.x-A.x)*fr,y:A.y+(B.y-A.y)*fr},gr=c.createRadialGradient(H.x,H.y,0,H.x,H.y,46);gr.addColorStop(0,'rgba(120,200,255,.5)');gr.addColorStop(1,'rgba(30,110,255,0)');
c.globalCompositeOperation='lighter';c.globalAlpha=a;c.fillStyle=gr;c.fillRect(H.x-46,H.y-46,92,92);c.restore()},
sandFx(){const c=this.cx,cv=this.cv,w=cv.width,h=cv.height,d=this.d,S=Save.d.set,p=this.p,rf=S.reduceFlash,rm=S.reduceMotion,sm=tsSm;c.save();
// ---- Active look: one hue over the whole frame, ageing with the gauge; player and afterimages redrawn on top.
if(this.sdv>0){const k=Math.min(1,this.sdv,Math.max(0,p.sd)/.3),tn=sdTone(p.cy||0),rgb=tn.join(',');
c.globalCompositeOperation='color';c.globalAlpha=.62*k;c.fillStyle='rgb('+rgb+')';c.fillRect(0,0,w,h);c.globalCompositeOperation='overlay';c.globalAlpha=.3*k;c.fillRect(0,0,w,h);c.globalCompositeOperation='screen';c.globalAlpha=(rf?.1:.2)*k;c.fillRect(0,0,w,h);c.globalCompositeOperation='source-over';
{const s=this.s;c.setTransform(s,0,0,s,w/2-this.cam.x*s+(this.sox||0),h/2-this.cam.y*s+(this.soy||0));c.globalAlpha=1;this.drawGhosts();this.drawPlayer();c.setTransform(1,0,0,1,0,0)}
const vg=c.createRadialGradient(w/2,h/2,h*.3,w/2,h/2,h*.85);vg.addColorStop(0,'rgba(0,10,8,0)');vg.addColorStop(1,'rgba('+tn.map(v=>v*.06|0).join(',')+','+.62*k+')');c.fillStyle=vg;c.fillRect(0,0,w,h);
c.fillStyle='rgba(0,0,0,'+.12*k+')';for(let y=0;y<h;y+=4*d)c.fillRect(0,y,w,d);
if(!rm&&this.sdt<.55){const f=1-this.sdt/.55,q=Math.floor(this.t*30);for(let i=0;i<9;i++){const y=((i*197+q*53)%1000)/1000*h,bh=(6+(i*37)%26)*d,x=(((i*113+q*71)%400)-100)*d;c.fillStyle='rgba('+rgb+','+.22*f+')';c.fillRect(x,y,w,bh)}}}
// ---- Activation: glitch burst, white flash, green flash.
if(this.sdi>0){const u=1-this.sdi/SDX.in;c.globalCompositeOperation='source-over';
if(u<.3&&!rf&&!rm)this.sdGlitch(u/.3);
if(!rf){const wf=Math.sin(Math.PI*Math.min(1,Math.max(0,(u-.25)/.3)));if(wf>.01){c.globalAlpha=wf*.9;c.fillStyle='#fff';c.fillRect(0,0,w,h)}
const gf=(1-sm(.5,1,u))*sm(.4,.55,u);if(gf>.01){c.globalAlpha=gf*.45;c.fillStyle='#28ff5a';c.fillRect(0,0,w,h)}}
else{c.globalAlpha=.18*(1-u);c.fillStyle='#28ff5a';c.fillRect(0,0,w,h)}c.globalAlpha=1}
// ---- Closing: a cool blue cast over the world and the replay of the run on top of it.
if(this.sde>0){const L=this.sdl||1,el=L-this.sde,u=el/L;
c.globalCompositeOperation='color';c.globalAlpha=(rf?.2:.4)*(1-sm(0,.8,u));c.fillStyle='#1e9bff';c.fillRect(0,0,w,h);c.globalCompositeOperation='screen';c.globalAlpha=(rf?.05:.14)*(1-sm(0,.6,u));c.fillStyle='#2aa8ff';c.fillRect(0,0,w,h);c.globalCompositeOperation='source-over';
{const s=this.s;c.setTransform(s,0,0,s,w/2-this.cam.x*s+(this.sox||0),h/2-this.cam.y*s+(this.soy||0));this.sdReplay(el,(1-sm(this.sdd,L,el))*(rf?.65:1));c.setTransform(1,0,0,1,0,0)}c.globalAlpha=1}
c.restore()},
});
