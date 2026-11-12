'use strict';
// DOM menus. Every button is wired through one delegated handler (data-a = action).
const UI={ov:null,back:'menu',
init(){I18N.apply();this.ov=document.getElementById('ov');
this.ov.onclick=e=>{const b=e.target.closest('button');if(b&&!b.disabled){Snd.init();Snd.play('ui');this.act(b.dataset.a,b.dataset.v)}};
this.ov.oninput=e=>{const t=e.target,k=t.dataset.s;if(k)Save.d.set[k]=t.type==='checkbox'?t.checked:+t.value;document.getElementById('tc').style.opacity=Save.d.set.opacity;if(k==='lang'){I18N.apply();Save.save();this.settings();const l=this.ov.querySelector('[data-s="lang"]');if(l)l.focus()}};
this.ov.onchange=()=>Save.save();
// While waiting for a new key, the next key press is captured here (capture phase) before the game's own key handler sees it.
document.addEventListener('keydown',e=>{const a=this.wait;if(!a)return;if(e.code==='Escape'){e.preventDefault();e.stopPropagation();this.wait=null;this.keys(a);return}
if(!KEYOK.test(e.code))return;e.preventDefault();e.stopPropagation();this.setKey(a,e.code);this.wait=null;this.keys(a)},true);
document.getElementById('pb').onclick=()=>{if(G.state==='play')this.pause()};
document.getElementById('tc').style.opacity=Save.d.set.opacity;TCE.init();this.menu()},
show(h){if(document.pointerLockElement)document.exitPointerLock();this.ov.innerHTML='<div class="pn">'+h+'</div>';this.ov.style.display='flex';document.body.classList.remove('playing');const b=this.ov.querySelector('button:not([disabled])');if(b)b.focus()},
hide(){this.ov.style.display='none';document.body.classList.add('playing')},
menu(){G.state='menu';this.back='menu';const has=Save.d.stats.runs>0||Object.keys(Save.d.best).length>0;
this.show('<h1>NEON REQUIEM</h1><p>'+TL('Vesper City never sleeps. Neither do its secrets.')+'</p><button data-a="cont"'+(has?'':' disabled')+'>'+TL('CONTINUE')+'</button><button data-a="brief" data-v="0">'+TL('NEW GAME')+'</button><button data-a="missions">'+TL('MISSION SELECT')+'</button><button data-a="settings">'+TL('SETTINGS')+'</button><button data-a="credits">'+TL('CREDITS')+'</button>')},
missions(){const n=['After Hours','Glass District','Dead Frequency','Black Archive','Last Transmission'];let h='<h2>'+TL('MISSIONS')+'</h2>';
n.forEach((m,i)=>{const ok=i<LEVELS.length&&i<Save.d.unlock,b=Save.d.best[i];h+='<button data-a="brief" data-v="'+i+'"'+(ok?'':' disabled')+'>'+(i+1)+'. '+TL(m.toUpperCase())+(i>=LEVELS.length?' ('+TL('COMING SOON')+')':b?' — '+b.rank+' / '+b.score+(G.intelTotal(i)?' · '+TL('INTEL')+' '+(b.intel||0)+'/'+G.intelTotal(i):''):'')+'</button>'});
this.show(h+'<button data-a="menu">'+TL('BACK')+'</button>')},
brief(i){i=+i;const L=LEVELS[i],kn=a=>keyName(Save.d.keys[a]),ctl=['up','left','down','right'].map(kn).join('')+' '+TL('move')+' \u00b7 '+TL('mouse aim')+' \u00b7 LMB '+TL('fire')+' \u00b7 RMB '+TL('precise')+' \u00b7 '+kn('melee')+' '+TL('melee')+' \u00b7 '+kn('dodge')+' '+TL('dodge')+' \u00b7 '+kn('reload')+' '+TL('reload')+' \u00b7 '+kn('swap')+' '+TL('swap')+' \u00b7 '+kn('use')+' '+TL('use (door / pick up)')+' \u00b7 '+kn('sand')+' '+TL('sandevistan')+' \u00b7 Esc '+TL('pause');this.cur=i;this.show('<h2>'+TL('MISSION')+' '+(i+1)+': '+TL(L.name)+'</h2><p>'+TL(L.brief)+'</p><p><i>'+TL(L.radio)+'</i></p><p>'+ctl+'</p><button data-a="chars" data-v="'+i+'">'+TL('DEPLOY')+'</button><button data-a="missions">'+TL('BACK')+'</button>')},
chars(i){this.show('<h2>'+TL('CHARACTER SELECT')+'</h2><button data-a="pick" data-v="'+i+',0">'+TL('GHOST')+' \u2014 '+TL('Sandevistan, pistol')+'</button><button data-a="pick" data-v="'+i+',1">DIO \u2014 '+TL('The World: time stop, knives (Q = gun)')+'</button><button data-a="brief" data-v="'+i+'">'+TL('BACK')+'</button>')},
settings(){const s=Save.d.set,r=(k,l)=>'<label>'+l+'<input type="range" min="0" max="1" step=".05" data-s="'+k+'" value="'+s[k]+'"></label>',rr=(k,l,a,b,t)=>'<label>'+l+'<input type="range" min="'+a+'" max="'+b+'" step="'+t+'" data-s="'+k+'" value="'+s[k]+'"></label>',sel=(k,l,o)=>'<label>'+l+'<select data-s="'+k+'">'+o.map((n,i)=>'<option value="'+i+'"'+(+s[k]===i?' selected':'')+'>'+TL(n)+'</option>').join('')+'</select></label>',c=(k,l)=>'<label>'+l+'<input type="checkbox" data-s="'+k+'"'+(s[k]?' checked':'')+'></label>';
this.show('<h2>'+TL('SETTINGS')+'</h2>'+sel('lang','Language / ภาษา',['English','ไทย'])+'<h3>'+TL('AUDIO')+'</h3>'+r('master',TL('Master volume'))+r('music',TL('Music'))+r('sfx',TL('Effects'))+'<h3>'+TL('DISPLAY & EFFECTS')+'</h3>'+r('part',TL('Particle density'))+sel('light',TL('Lighting quality'),['Off','Low','Medium','High'])+c('shake',TL('Screen shake'))+c('reduceFlash',TL('Reduce flashing'))+c('reduceMotion',TL('Reduce motion'))+'<p>'+TL('Reduce flashing: no white hit/muzzle flashes, steady lights, dimmer blast glow. Reduce motion: no screen shake, chromatic split or camera look-ahead.')+'</p>'+rr('look',TL('Camera look-ahead'),0,2,.1)+rr('chromaAmt',TL('Chromatic intensity'),0,1.5,.1)+'<h3>'+TL('CONTROLS')+'</h3><button data-a="tcedit">'+TL('TOUCH BUTTON LAYOUT')+'</button>'+r('opacity',TL('Touch control opacity'))+c('assist',TL('Touch aim assist'))+rr('aimSens',TL('Aim sensitivity (touch turn speed)'),.1,1,.05)+c('invert',TL('Invert touch aim (vertical)'))+rr('dzMove',TL('Move stick dead zone'),0,.5,.05)+rr('dzAim',TL('Aim stick dead zone'),0,.5,.05)+c('lock',TL('Mouse capture (relative aim)'))+rr('mouseSens',TL('Mouse sensitivity (capture mode)'),.2,3,.1)+'<button data-a="keys">'+TL('KEY BINDINGS')+'</button><button data-a="fs">'+TL('FULLSCREEN')+'</button><button data-a="reset">'+TL('RESET PROGRESS')+'</button><button data-a="back">'+TL('BACK')+'</button>')},
// Key bindings screen. Choosing a row arms capture; the next accepted key is bound (swapping with whichever action had it).
setKey(a,code){const K=Save.d.keys;for(const o in K)if(o!==a&&K[o]===code)K[o]=K[a];K[a]=code;Save.save()},
keys(focus){const K=Save.d.keys,N={up:TL('Move up'),down:TL('Move down'),left:TL('Move left'),right:TL('Move right'),melee:TL('Melee'),dodge:TL('Dodge'),reload:TL('Reload'),swap:TL('Swap weapon'),use:TL('Use (door / pick up)'),sand:TL('Sandevistan')};
let h='<h2>'+TL('KEY BINDINGS')+'</h2><p>'+TL('Pick an action, then press its new key. Esc cancels. If the key is taken, the two actions swap. Pause (Esc) and the mouse buttons are fixed.')+'</p>';
for(const a in N)h+='<button data-a="rebind" data-v="'+a+'">'+N[a]+' \u2014 '+(this.wait===a?TL('PRESS A KEY...'):keyName(K[a]))+'</button>';
this.show(h+'<button data-a="keyreset">'+TL('RESET KEYS')+'</button><button data-a="settings">'+TL('BACK')+'</button>');
if(focus){const b=this.ov.querySelector('[data-v="'+focus+'"]');if(b)b.focus()}},
credits(){this.show('<h2>'+TL('CREDITS')+'</h2><p>'+TL('NEON REQUIEM — original vertical slice.<br>All visuals and audio are generated procedurally in code.')+'</p><button data-a="menu">'+TL('BACK')+'</button>')},
pause(){G.state='pause';this.back='pause';Input.reset();this.show('<h2>'+TL('PAUSED')+'</h2><button data-a="resume">'+TL('RESUME')+'</button><button data-a="retry">'+TL('RESTART MISSION')+'</button><button data-a="settings">'+TL('SETTINGS')+'</button><button data-a="menu">'+TL('MAIN MENU')+'</button>')},
dead(){this.show('<h2>'+TL('YOU DIED')+'</h2><p>'+TL('Press R or tap below to retry instantly.')+'</p><button data-a="retry">'+TL('RETRY')+'</button><button data-a="menu">'+TL('MAIN MENU')+'</button>')},
results(r){const t=x=>x.toFixed(1)+'s',b=Save.d.best[G.lvlI];this.show('<h2>'+TL('MISSION COMPLETE')+'</h2><div class="rank">'+r.rank+'</div><table><tr><td>'+TL('Time')+'</td><td>'+t(r.time)+'</td></tr><tr><td>'+TL('Enemies defeated')+'</td><td>'+r.kills+'</td></tr><tr><td>'+TL('Accuracy')+'</td><td>'+Math.round(r.acc*100)+'%</td></tr><tr><td>'+TL('Damage received')+'</td><td>'+Math.round(G.dmgT)+'</td></tr><tr><td>'+TL('Combo score')+'</td><td>'+r.kscore+'</td></tr><tr><td>'+TL('Time bonus')+'</td><td>+'+r.tb+'</td></tr><tr><td>'+TL('Accuracy bonus')+'</td><td>+'+r.ab+'</td></tr><tr><td>'+TL('Damage penalty')+'</td><td>-'+r.dp+'</td></tr><tr><td>'+TL('Intel found')+'</td><td>'+r.intel+' / '+r.intelMax+'</td></tr><tr><td>'+TL('Intel bonus')+'</td><td>+'+r.ib+'</td></tr><tr><td>'+TL('TOTAL')+'</td><td>'+r.tot+'</td></tr></table><p>'+TL('Ranks: S 1800 · A 1400 · B 1000 · C 600 · D below.')+' '+TL('Best:')+' '+b.score+' ('+b.rank+')</p><button data-a="retry">'+TL('RETRY')+'</button><button data-a="next"'+(G.lvlI+1<LEVELS.length?'':' disabled')+'>'+TL('CONTINUE (NEXT MISSION)')+'</button><button data-a="missions">'+TL('MISSION SELECT')+'</button>')},
act(a,v){if(a!=='rebind')this.wait=null;switch(a){
case'keys':this.keys();break;case'rebind':this.wait=v;this.keys(v);break;case'keyreset':Save.d.keys={...KEYS0};Save.save();this.keys();break;
case'menu':this.menu();break;case'missions':this.missions();break;case'settings':this.settings();break;case'credits':this.credits();break;
case'cont':this.missions();break;case'brief':this.brief(v);break;case'start':G.start(+v);break;case'chars':this.chars(+v);break;case'pick':{const q=v.split(',');G.char=+q[1];G.start(+q[0]);break}case'retry':G.retry();break;
case'next':this.brief(G.lvlI+1);break;
case'resume':G.state='play';this.hide();Input.once={};break;
case'back':if(this.back==='pause')this.pause();else this.menu();break;
case'fs':{const d=document.documentElement;if(document.fullscreenElement)document.exitFullscreen();else if(d.requestFullscreen)d.requestFullscreen().catch(()=>{});break}
case'reset':this.show('<h2>'+TL('RESET PROGRESS?')+'</h2><p>'+TL('This erases best scores, unlocks and upgrades.')+'</p><button data-a="doreset">'+TL('YES, RESET')+'</button><button data-a="settings">'+TL('CANCEL')+'</button>');break;
case'doreset':Save.reset();this.menu();break}}};

// Touch button layout editor: drag a button to move it, pick one and use the slider to resize it. Saved per orientation in Save.d.tcl as {x,y,s} px
// (x/y = distance from the right/bottom edge, s = diameter). Buttons without a saved entry keep the default arc from style.css.
const TCE={on:false,sel:null,drag:null,bar:null,
key(){return matchMedia('(orientation:portrait)').matches?'p':'l'},
btns(){return[...document.querySelectorAll('#tc button[data-act]')]},
cur(b){const c=getComputedStyle(b);return{x:parseFloat(c.getPropertyValue('--x'))||0,y:parseFloat(c.getPropertyValue('--y'))||0,s:parseFloat(c.getPropertyValue('--s'))||56}},
fit(o){o.s=Math.max(40,Math.min(110,o.s));o.x=Math.max(0,Math.min(innerWidth-o.s,o.x));o.y=Math.max(0,Math.min(innerHeight-o.s,o.y));return o},
apply(){const L=(Save.d.tcl&&Save.d.tcl[this.key()])||{};for(const b of this.btns()){const o=L[b.dataset.act];for(const[p,k]of[['--x','x'],['--y','y'],['--s','s']]){if(o&&Number.isFinite(o[k]))b.style.setProperty(p,o[k]+'px');else b.style.removeProperty(p)}}},
put(b,o){const T=Save.d.tcl&&typeof Save.d.tcl==='object'?Save.d.tcl:(Save.d.tcl={});(T[this.key()]||(T[this.key()]={}))[b.dataset.act]=o;this.apply()},
select(b){this.sel=b;for(const x of this.btns())x.classList.toggle('tsel',x===b);const s=document.getElementById('tcs');if(s)s.value=this.cur(b).s},
init(){this.apply();addEventListener('resize',()=>{this.apply();if(this.sel)this.select(this.sel)});
for(const b of this.btns()){
b.addEventListener('pointerdown',e=>{if(!this.on)return;e.preventDefault();b.setPointerCapture(e.pointerId);this.select(b);this.drag={id:e.pointerId,px:e.clientX,py:e.clientY,o:this.cur(b)}});
b.addEventListener('pointermove',e=>{const d=this.drag;if(!this.on||!d||d.id!==e.pointerId)return;this.put(b,this.fit({s:d.o.s,x:d.o.x-(e.clientX-d.px),y:d.o.y-(e.clientY-d.py)}))});
const end=e=>{if(this.drag&&this.drag.id===e.pointerId){this.drag=null;Save.save()}};b.addEventListener('pointerup',end);b.addEventListener('pointercancel',end)}},
start(){this.on=true;document.body.classList.add('tcedit');UI.ov.style.display='none';
const t=document.createElement('div');t.id='tce';
t.innerHTML='<span>'+TL('Drag a button to move it. Tap one, then use the slider to resize.')+'</span><label>'+TL('Size')+'<input type="range" id="tcs" min="40" max="110" step="2"></label><button data-t="reset">'+TL('RESET LAYOUT')+'</button><button data-t="done">'+TL('SAVE & CLOSE')+'</button>';
document.body.appendChild(t);this.bar=t;
t.oninput=e=>{if(e.target.id==='tcs'&&this.sel){const o=this.cur(this.sel);o.s=+e.target.value;this.put(this.sel,this.fit(o))}};
t.onchange=()=>Save.save();
t.onclick=e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.t==='reset'){if(Save.d.tcl)delete Save.d.tcl[this.key()];this.apply();Save.save();if(this.sel)this.select(this.sel)}else this.stop()};
this.select(this.btns()[0])},
stop(){this.on=false;this.drag=null;this.sel=null;document.body.classList.remove('tcedit');for(const x of this.btns())x.classList.remove('tsel');if(this.bar){this.bar.remove();this.bar=null}Save.save();UI.settings()}};
