// App-local scope adapter for the shared Apps PWA worker.
self.APPS_PWA_CONFIG={cacheName:'apps-pwa-dol-v2-4-1',cachePrefix:'apps-pwa-dol-',precache:['./','./index.html','./styles.css','./logic.mjs','./adaptive.mjs','./learning-app.mjs','./learning-insights.mjs','./round-tools.mjs','./round-model.mjs','./visual-tools.mjs','./round-tools.css','./focus-mode.css','./mobile-entry.css','./mobile-entry.mjs','./app.webmanifest'],defaultStrategy:'cache-first',networkFirstPaths:['/Dol/']};
importScripts('https://nirav2000.github.io/Apps/pwa/v1/service-worker.js');
