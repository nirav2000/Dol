// App-local scope adapter for the shared Apps PWA worker.
self.APPS_PWA_CONFIG={cacheName:'apps-pwa-dol-v2',cachePrefix:'apps-pwa-dol-',precache:['./','./index.html','./styles.css','./logic.mjs','./adaptive.mjs','./learning-app.mjs','./app.webmanifest'],defaultStrategy:'cache-first',networkFirstPaths:['/Dol/index.html','/Dol/']};
importScripts('https://nirav2000.github.io/Apps/pwa/v1/service-worker.js');
