/* Seven deliberately non-blocking celebration prototypes. No dependencies. */
(() => {
  'use strict';
  const designs=[['rainbow','Rainbow ribbon','Rainbow edge, rising PRIME badge, and gently spreading stars.','Playful · colourful'],['orbit','Cosmic orbit','Two luminous orbital rings carry the energy around the tile.','Energetic · scientific'],['ripple','Prism ripple','Warm concentric ripples radiate from the answer.','Joyful · bouncy'],['quiet','Quiet sparkle','A quieter colour wash, mint badge and four delicate stars.','Subtle · focused'],['gem-glow','Golden glow · Gemini','A warm golden halo swells around the prime tile.','Gemini · gold'],['gem-flip','Smooth flip · Gemini','The prime tile rotates in 3D and returns to its original position.','Gemini · purple'],['gem-pop','Elastic pop · Gemini','The tile compresses, springs out and gently settles.','Gemini · mint']];
  const colors=['#ffe27e','#70e5ff','#ff85aa','#a7faac','#c2a1ff','#ffb16c','#c7fcff','#fff2a3'];
  const rays=[[0,-59],[55,-43],[76,-6],[65,38],[20,58],[-28,55],[-68,25],[-71,-20],[-38,-50]];
  const gallery=document.getElementById('gallery'), speed=document.getElementById('speed');
  const prefersReduced=matchMedia('(prefers-reduced-motion: reduce)');
  const running=new Map();let seconds=3.2;
  for(const [i,[kind,name,desc,tag]] of designs.entries()){
    const card=document.createElement('section');card.className='card '+kind;
    card.innerHTML=`<header><h2>${String(i+1).padStart(2,'0')} · ${name}</h2><span class="duration">3.2s</span></header><p class="desc">${desc}</p><div class="scene" aria-label="1 times 7; 7 is prime"><div class="ring one"></div><div class="ring two"></div><div class="frame"><div class="outline"></div><div class="tile">1 × 7</div></div><div class="bubble">✦ PRIME</div><div class="particles" aria-hidden="true"></div></div><footer><button class="replay" type="button" aria-label="Replay ${name}">↻ Replay</button><small>${tag}</small></footer>`;
    gallery.append(card);
    for(let j=0;j<(kind==='quiet'?4:kind==='rainbow'?9:7);j++){
      const star=document.createElement('span');star.className='star';star.textContent=j%3?'✦':'✧';
      star.style.setProperty('--color',colors[j%colors.length]);star.style.setProperty('--x',rays[j][0]+'px');star.style.setProperty('--y',rays[j][1]+'px');card.querySelector('.particles').append(star);
    }
    card.querySelector('.replay').addEventListener('click',()=>play(card));
  }
  function stop(card){clearTimeout(running.get(card));running.delete(card);card.classList.remove('playing');}
  function play(card){
    stop(card);card.style.setProperty('--duration',seconds+'s');
    card.querySelectorAll('.star').forEach((star,i)=>star.style.setProperty('--delay',seconds*(.16+i*.025)+'s'));
    void card.offsetWidth;card.classList.add('playing');
    running.set(card,setTimeout(()=>stop(card),seconds*1000+200));
  }
  function all(){document.querySelectorAll('.card').forEach(play)}
  document.getElementById('replayAll').addEventListener('click',all);
  document.getElementById('stopAll').addEventListener('click',()=>document.querySelectorAll('.card').forEach(stop));
  speed.addEventListener('change',()=>{seconds=Number(speed.value);if(![1.8,3.2,4.5].includes(seconds))seconds=3.2;document.querySelectorAll('.duration').forEach(el=>el.textContent=seconds.toFixed(1)+'s');all()});
  // One automatic demonstration on initial page load; never a distracting loop.
  window.addEventListener('load',all,{once:true});
})();
