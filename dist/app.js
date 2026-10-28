(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const canvas = $('game'), ctx = canvas.getContext('2d');
  const catalog = {
    snake: {name:'Snake',number:'01',color:'#c4e69c',mark:'▟',tagline:'A little hungry. A little reckless.\nHow long can you go?',instructions:'Chase the snacks. Avoid the walls\nand your ever-growing tail.',keys:['↑','←','↓','→'],keyText:'or <b>W A S D</b> to move',touch:'On your phone? Use the D-pad or swipe the screen.',help:'Collect the orange snacks to grow and earn points. Every few snacks make you faster. Avoid the walls and your own tail. You cannot turn directly back on yourself.',move:'Arrow keys / WASD / D-pad / swipe'},
    pong: {name:'Pong',number:'02',color:'#e6c281',mark:'▪ ┆ ▪',tagline:'Old-school rivalry. Fresh reflexes.\nBeat the CPU. First to five.',instructions:'Guard your side. Find the angle.\nScore five points to beat the CPU.',keys:['↑','↓'],keyText:'or <b>W S</b> to move',touch:'On your phone? Drag on the screen or use the D-pad.',help:'Move the left paddle to return the ball. The CPU guards the right side. Hit near a paddle edge to change the angle. A missed return gives your opponent a point. First to five wins.',move:'↑ ↓ / W S / D-pad / drag vertically'},
    breakout: {name:'Breakout',number:'03',color:'#c0bae9',mark:'▤ ▤ ▤',tagline:'A wall of possibilities.\nMake every bounce count.',instructions:'Keep the ball bouncing. Clear the wall.\nThree lives. Forty little bricks.',keys:['←','→'],keyText:'or <b>A D</b> to move',touch:'On your phone? Drag on the screen or use the D-pad.',help:'Move the paddle to keep the ball in play and clear all 40 bricks. Hit near the edge of the paddle to aim your next bounce. You have three lives. The ball launches automatically after each short countdown.',move:'← → / A D / D-pad / drag horizontally'}
  };
  const read = (key,fallback) => {try {const v=JSON.parse(localStorage.getItem('pocket-arcade-'+key));return v===null?fallback:v;}catch{return fallback;}};
  const save = (key,value) => {try{localStorage.setItem('pocket-arcade-'+key,JSON.stringify(value));}catch{}};
  let bests=read('bests',{}); if(!bests || typeof bests!=='object' || Array.isArray(bests)) bests={};
  for(const id in catalog) if(!Number.isFinite(bests[id]) || bests[id]<0)bests[id]=0;
  let soundOn=read('sound',true)===true, crtOn=read('crt',true)!==false;
  let active='snake', game, phase='ready', currentScore=0, dirty=true, last=0, audioContext;
  let held=new Set(), pointerHeld=new Set(), touchStart=null;
  const format=n=>String(Math.floor(n)).padStart(4,'0');
  function announce(message){$('announcement').textContent=message;}
  function unlockAudio(){if(!soundOn)return;try{audioContext ||= new (window.AudioContext||window.webkitAudioContext)();if(audioContext.state==='suspended')audioContext.resume().catch(()=>{});}catch{}}
  function beep(freq=440,duration=.08,type='square'){
    if(!soundOn||!audioContext)return;
    try{const osc=audioContext.createOscillator(),gain=audioContext.createGain(),now=audioContext.currentTime;osc.type=['sine','square','sawtooth','triangle'].includes(type)?type:'square';osc.frequency.setValueAtTime(freq,now);gain.gain.setValueAtTime(.025,now);gain.gain.exponentialRampToValueAtTime(.001,now+duration);osc.connect(gain);gain.connect(audioContext.destination);osc.start(now);osc.stop(now+duration+.01);}catch{}
  }
  function score(value){currentScore=value;$('score').textContent=format(value);if(value>bests[active]){bests[active]=value;save('bests',bests);}$('best').textContent=format(bests[active]);}
  function setPhase(value){phase=value;held.clear();pointerHeld.clear();document.querySelectorAll('[data-dir]').forEach(b=>b.classList.remove('held'));$('overlay').hidden=value==='running';$('pause').disabled=value==='ready'||value==='over';$('pause').setAttribute('aria-label',value==='paused'?'Resume game':'Pause game');$('pause-label').textContent=value==='paused'?'RESUME':'PAUSE';$('pause').querySelector('use').setAttribute('href',value==='paused'?'#i-play':'#i-pause');$('state-label').textContent={ready:'READY WHEN YOU ARE',running:'A LITTLE ESCAPE IN PROGRESS',paused:'TAKE A BREATHER',over:'THERE’S ALWAYS ONE MORE GAME'}[value];canvas.dataset.phase=value;dirty=true;last=performance.now();}
  function overlay(kicker,title,copy,label,hint){$('overlay-kicker').textContent=kicker;$('overlay-title').textContent=title;$('overlay-copy').textContent=copy;$('overlay-copy').style.whiteSpace='pre-line';$('start').querySelector('span').textContent=label;$('start-hint').textContent=hint;}
  function finish(won,message){setPhase('over');overlay(won?'A LITTLE VICTORY / WELL PLAYED':'THAT WAS A GOOD RUN',won?'NICE WORK!':'GAME OVER',message+'\nFinal score: '+currentScore,'Play again','OR PRESS ENTER');announce((won?'You won! ':'Game over. ')+message+' Score '+currentScore);}
  function select(id){active=id;const item=catalog[id];document.documentElement.style.setProperty('--accent',item.color);$('game-name').textContent=item.name.toUpperCase();$('pixel-mark').textContent=item.mark;$('game-instructions').textContent=item.instructions;$('game-instructions').style.whiteSpace='pre-line';$('control-hint').innerHTML='<span class="key-cluster">'+item.keys.map(k=>'<kbd>'+k+'</kbd>').join('')+'</span><span>'+item.keyText+'</span>';document.querySelector('.touch-hint').textContent=item.touch;canvas.setAttribute('aria-label',item.name+' game. '+item.move+'.');document.querySelectorAll('[data-game]').forEach(b=>{b.classList.toggle('selected',b.dataset.game===id);b.setAttribute('aria-pressed',String(b.dataset.game===id));});game=window.RetroGames[id].create({score,status:text=>$('game-status').textContent=text,finish,beep});game.reset();setPhase('ready');overlay('CARTRIDGE '+item.number+' / READY TO PLAY',item.name.toUpperCase(),item.tagline,"Let's play",'OR PRESS ENTER');announce(item.name+' selected. Press Enter to start.');}
  function start(){unlockAudio();if(phase!=='paused')game.reset();setPhase('running');beep(520,.07);canvas.focus({preventScroll:true});}
  function pause(){if(phase!=='running')return;setPhase('paused');overlay('NO RUSH / YOUR GAME IS SAFE','PAUSED','Take your time.\nYour pixels can wait.','Keep playing','OR PRESS ENTER / SPACE');announce('Game paused.');}
  function toggle(){phase==='running'?pause():start();}
  function restart(){unlockAudio();game.reset();setPhase('running');canvas.focus({preventScroll:true});beep(330,.08);announce('New '+catalog[active].name+' game.');}
  function renderSettings(){$('sound').setAttribute('aria-pressed',String(soundOn));$('sound').querySelector('span').textContent='Sound '+(soundOn?'on':'off');$('sound').querySelector('use').setAttribute('href',soundOn?'#i-sound':'#i-muted');$('crt').setAttribute('aria-pressed',String(crtOn));$('crt').querySelector('b').textContent=crtOn?'ON':'OFF';document.querySelector('.scanlines').classList.toggle('off',!crtOn);}
  document.querySelectorAll('[data-game]').forEach(button=>button.addEventListener('click',()=>{select(button.dataset.game);canvas.focus({preventScroll:true});}));
  $('start').addEventListener('click',start);$('action').addEventListener('click',toggle);$('restart').addEventListener('click',restart);$('pause').addEventListener('click',toggle);
  $('sound').addEventListener('click',()=>{soundOn=!soundOn;save('sound',soundOn);renderSettings();unlockAudio();beep(660,.1);});
  $('crt').addEventListener('click',()=>{crtOn=!crtOn;save('crt',crtOn);renderSettings();});
  const keyMap={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right',w:'up',s:'down',a:'left',d:'right'};
  const keysDown=new Set();
  document.addEventListener('keydown',event=>{
    if(event.ctrlKey||event.metaKey||event.altKey||$('help-dialog').open)return;
    const key=event.key.length===1?event.key.toLowerCase():event.key,dir=keyMap[key];
    if(dir){event.preventDefault();keysDown.add(key);held.add(dir);if(phase==='running'&&!event.repeat)game.direction?.(dir);return;}
    if(event.repeat)return;
    if(key==='Enter'){if(event.target.closest('button,a'))return;event.preventDefault();if(phase!=='running')start();}
    else if(key===' '||key==='p'){if(key===' '&&event.target.closest('button,a'))return;event.preventDefault();if(phase==='running')pause();else if(phase==='paused')start();else if(key===' ')start();}
    else if(key==='Escape'){if(phase==='running'){event.preventDefault();pause();}}
    else if(key==='r'){event.preventDefault();restart();}
  });
  document.addEventListener('keyup',event=>{const key=event.key.length===1?event.key.toLowerCase():event.key;keysDown.delete(key);const dir=keyMap[key];if(dir&&!Array.from(keysDown).some(k=>keyMap[k]===dir))held.delete(dir);});
  document.querySelectorAll('[data-dir]').forEach(button=>{
    const dir=button.dataset.dir;
    button.addEventListener('pointerdown',event=>{event.preventDefault();button.setPointerCapture(event.pointerId);pointerHeld.add(dir);button.classList.add('held');if(phase==='running')game.direction?.(dir);});
    const release=()=>{pointerHeld.delete(dir);button.classList.remove('held');};button.addEventListener('pointerup',release);button.addEventListener('pointercancel',release);button.addEventListener('lostpointercapture',release);
    button.addEventListener('click',event=>{if(event.detail===0&&phase==='running')game.direction?.(dir);});
  });
  function point(event){const rect=canvas.getBoundingClientRect();return{x:(event.clientX-rect.left)*720/rect.width,y:(event.clientY-rect.top)*450/rect.height};}
  canvas.addEventListener('pointerdown',event=>{if(phase!=='running')return;event.preventDefault();canvas.setPointerCapture(event.pointerId);touchStart={x:event.clientX,y:event.clientY};if(active!=='snake'){const p=point(event);game.pointer?.(p.x,p.y);}});
  canvas.addEventListener('pointermove',event=>{if(phase!=='running')return;if(active==='snake'&&touchStart){const dx=event.clientX-touchStart.x,dy=event.clientY-touchStart.y;if(Math.max(Math.abs(dx),Math.abs(dy))>18){game.direction?.(Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up'));touchStart={x:event.clientX,y:event.clientY};}}else if(active!=='snake'&&(touchStart||event.pointerType==='mouse')){const p=point(event);game.pointer?.(p.x,p.y);}});
  canvas.addEventListener('pointerup',()=>touchStart=null);canvas.addEventListener('pointercancel',()=>touchStart=null);
  const clearInput=()=>{keysDown.clear();held.clear();pointerHeld.clear();touchStart=null;if(phase==='running')pause();};
  window.addEventListener('blur',clearInput);document.addEventListener('visibilitychange',()=>{if(document.hidden)clearInput();});
  $('help').addEventListener('click',()=>{if(phase==='running')pause();const item=catalog[active];$('help-title').textContent='How to play '+item.name;$('help-copy').textContent=item.help;$('help-move').textContent=item.move;$('help-dialog').showModal();});
  $('close-help').addEventListener('click',()=>$('help-dialog').close());$('help-done').addEventListener('click',()=>$('help-dialog').close());
  $('help-dialog').addEventListener('click',event=>{if(event.target===$('help-dialog')){const r=event.target.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)event.target.close();}});
  const fullscreenButton=$('fullscreen');
  $('display-toolbar').hidden=!document.fullscreenEnabled;
  function syncFullscreen(){
    const expanded=document.fullscreenElement===$('display');
    fullscreenButton.querySelector('span').textContent=expanded?'Exit full screen':'Full screen';
    fullscreenButton.querySelector('use').setAttribute('href',expanded?'#i-collapse':'#i-expand');
    fullscreenButton.title=expanded?'Return to the console':'Play in full screen';
    $('fullscreen-hint').textContent=expanded?'Your arcade, expanded':'More room to play';
  }
  document.addEventListener('fullscreenchange',syncFullscreen);
  syncFullscreen();
  fullscreenButton.addEventListener('click',async()=>{try{if(document.fullscreenElement===$('display'))await document.exitFullscreen();else await $('display').requestFullscreen();if(phase==='running')canvas.focus({preventScroll:true});}catch{announce('Fullscreen is unavailable in this preview. You can keep playing here.');}});
  function frame(time){const dt=Math.min(.04,Math.max(0,(time-last)/1000));last=time;if(phase==='running'){const input=new Set([...held,...pointerHeld]);game.update(dt,input);dirty=true;}if(dirty){ctx.clearRect(0,0,720,450);game.draw(ctx);dirty=false;}requestAnimationFrame(frame);}
  renderSettings();select('snake');requestAnimationFrame(frame);
})();
