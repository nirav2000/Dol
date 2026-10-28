// Dol PWA adapter: keep the shared Apps caching strategy, with a resilient install.
// Cache warming is intentionally tolerant: one HTTP 503 must not block a whole update.
const CACHE_NAME='apps-pwa-dol-v2-12-9';
const ASSETS=["./challenge-controls.mjs","./mobile-redesign.css","./difficulty-profile.mjs","./mobile-learning.css","./version.json","./teaching-model.mjs","./board-aware-help.mjs","./teaching-question.mjs","./teaching-coach.mjs","./square-workshop.mjs","./square-learning-model.mjs","./square-learning-studio.mjs","./square-fluency.mjs","./square-learning-studio.css","./square-fluency.css","./teaching.css","./improvement/journey.mjs","./improvement/model.mjs","./improvement/store.mjs","./improvement/check.mjs","./improvement/clock.mjs","./improvement/index.mjs","./improvement/ui.mjs","./device-profile.mjs","./diagnostics.mjs","./ui/pairboard-phone.css","./ui/pairboard-tablet.css","./ui/pairboard-desktop.css","./","./index.html","./styles.css","./logic.mjs","./adaptive.mjs","./learning-app.mjs","./dol-account.mjs","./learning-insights.mjs","./confidence-model.mjs","./round-tools.mjs","./round-model.mjs","./round-ledger.mjs","./visual-tools.mjs","./round-tools.css","./focus-mode.css","./mobile-entry.css","./mobile-entry.mjs","./strategy-model.mjs","./strategy-coach.mjs","./strategy-coach.css","./factor-patterns.mjs","./factor-patterns.css","./tablet-keypad.mjs","./tablet-keypad.css","./layout-options.mjs","./layout-options.css","./prime-animation-lab.html","./prime-animation-lab.css","./prime-animation-lab.js","./app.webmanifest"];
self.APPS_PWA_CONFIG={
  cacheName:CACHE_NAME,cachePrefix:'apps-pwa-dol-',precache:[],
  // Navigations already use network-first. All assets use cached-first to survive 503s.
  defaultStrategy:'cache-first',networkFirstPaths:[]
};
importScripts('https://nirav2000.github.io/Apps/pwa/v1/service-worker.js');
self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE_NAME);
    // Four concurrent requests avoids hammering GitHub Pages with 56 downloads at once.
    for(let i=0;i<ASSETS.length;i+=4){
      await Promise.allSettled(ASSETS.slice(i,i+4).map(async path=>{
        const url=new URL(path,self.registration.scope).href;
        const response=await fetch(url,{cache:'reload'});
        if(response.ok){
          await cache.put(url,response.clone());
          // The HTML references ?v=2.12.9 assets; cache that exact request URL too.
          // This aliases the same bytes without making a second network request.
          if(/\.(?:css|js|mjs)$/.test(new URL(url).pathname))await cache.put(url+'?v=2.12.9',response.clone());
        }
      }));
    }
  })());
});
