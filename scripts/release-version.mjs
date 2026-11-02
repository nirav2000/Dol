import fs from 'node:fs';
const version=JSON.parse(fs.readFileSync('version.json','utf8')).version;
if(!/^\d+\.\d+\.\d+$/.test(version))throw Error('Invalid version');
const entries=new Map();
let html=fs.readFileSync('index.html','utf8');
html=html.replace(/(\?v=)\d+\.\d+\.\d+/g,'$1'+version);
html=html.replace(/(data-dol-version[^>]*>)(?:Dol )?v\d+\.\d+\.\d+/g,(_,start)=>start+'Dol v'+version);
entries.set('index.html',html);
// Keep the standalone animation archaeology page in step with future releases.
let archive=fs.readFileSync('animation-history.html','utf8');
archive=archive.replace(/(\?v=)\d+\.\d+\.\d+/g,'$1'+version);
archive=archive.replace(/(ANIMATION HISTORY LAB · v)\d+\.\d+\.\d+/g,'$1'+version);
archive=archive.replace(/(Animation History Lab · v)\d+\.\d+\.\d+/g,'$1'+version);
entries.set('animation-history.html',archive);
// The separate Speed Keying Lab also carries release-pinned scripts and labels.
let speedLab=fs.readFileSync('speed-keying.html','utf8');
speedLab=speedLab.replace(/(\?v=)\d+\.\d+\.\d+/g,'$1'+version);
speedLab=speedLab.replace(/(Speed Keying Lab · v)\d+\.\d+\.\d+/g,'$1'+version);
speedLab=speedLab.replace(/(<span class="version">v)\d+\.\d+\.\d+/g,'$1'+version);
entries.set('speed-keying.html',speedLab);
let worker=fs.readFileSync('service-worker.js','utf8').replace(/apps-pwa-dol-v\d+-\d+-\d+/,'apps-pwa-dol-v'+version.replaceAll('.','-')).replace(/(\?v=)\d+\.\d+\.\d+/g,'$1'+version);
entries.set('service-worker.js',worker);
const labels=[...html.matchAll(/data-dol-version[^>]*>([^<]*)/g)].map(x=>x[1]);
if(labels.length<2||labels.some(s=>s!=='Dol v'+version))throw Error('Header/footer version markers inconsistent');
if(process.argv.includes('--check')){for(const [path,value] of entries)if(fs.readFileSync(path,'utf8')!==value)throw Error('Release mismatch in '+path);if(/v2\.6\.16/.test(html))throw Error('Stale release text');}else for(const [path,value] of entries)fs.writeFileSync(path,value);
console.log('Release consistency verified: '+version);
