'use strict';
Object.assign(G,{
shake(v){if(Save.d.set.shake&&!Save.d.set.reduceMotion)this.sh=Math.max(this.sh,v)},
// Chromatic aberration strength 0..1 (damage, nearby blast). Decays quickly; ignored while Reduce motion is on.
chroma:0,
hv:0,hurtT:0,
kickChroma(v){if(!Save.d.set.reduceMotion&&Save.d.set.chromaAmt>0)this.chroma=Math.max(this.chroma,v)},
updCam(dt,st){const p=this.p;let lx=0,ly=0;if(st==='play'){const la=Save.d.set.reduceMotion?0:50*Save.d.set.look;lx=Math.cos(p.a)*la;ly=Math.sin(p.a)*la}
// Sandevistan rewind: while it plays (controls locked) the camera centres on the whole recorded run (G.spr) and zooms out until the run fits the screen (never zooms in), then eases back to the player. G.s0 = normal scale (set in resize).
let tx=p.x+lx,ty=p.y+ly,tz=1;const s0=this.s0||this.s;
if(st==='play'&&this.rwOn()&&this.spr.length>1){let B=this.sbb;if(!B||B.src!==this.spr){let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;for(const q of this.spr){if(q.x<x0)x0=q.x;if(q.x>x1)x1=q.x;if(q.y<y0)y0=q.y;if(q.y>y1)y1=q.y}B=this.sbb={src:this.spr,x0,y0,x1,y1}}
tx=(B.x0+B.x1)/2;ty=(B.y0+B.y1)/2;tz=Math.min(1,Math.min(this.cv.width/(B.x1-B.x0+160),this.cv.height/(B.y1-B.y0+160))/s0)}
const k=1-Math.exp(-dt*(tz<1?18:7));this.cam.x+=(tx-this.cam.x)*k;this.cam.y+=(ty-this.cam.y)*k;
let zm=this.zm==null?1:this.zm;zm+=(tz-zm)*k;if(tz===1&&zm>.998)zm=1;this.zm=zm;this.s=s0*zm;this.sh*=Math.exp(-dt*9);this.chroma*=Math.exp(-dt*7);if(this.chroma<.02)this.chroma=0;
// Steady damage cue for Reduce flashing: smooth red screen edge after a hit, and a constant faint one at low health. No blinking.
this.hurtT=Math.max(0,this.hurtT-dt);{const tg=(this.hurtT>0?.3:0)+(p.hp>0&&p.hp<=35?.18:0);this.hv+=(tg-this.hv)*Math.min(1,dt*8)}},
});
