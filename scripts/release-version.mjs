import fs from 'node:fs';
const version=JSON.parse(fs.readFileSync('version.json','utf8')).version;
if(!/^\d+\.\d+\.\d+$/.test(version))throw Error('Invalid release version');
const files=new Map();
const html=fs.readFileSync('index.html','utf8').replace(/\?v=\d+\.\d+\.\d+/g,'?v='+version).replace(/(data-dol-version[^>]*>)(?:Dol )?v\d+\.\d+\.\d+/g,(_m,p)=>p+'Dol v'+version);
if((html.match(/data-dol-version/g)||[]).length<3)throw Error('Header, footer and settings must have version labels');
files.set('index.html',html);
files.set('release.mjs',`// Generated from version.json.\nexport const VERSION='${version}';\n`);
files.set('service-worker.js',fs.readFileSync('service-worker.js','utf8').replace(/apps-pwa-dol-v\d+-\d+-\d+/g,'apps-pwa-dol-v'+version.replaceAll('.','-')));
const stale=[];for(const [path,content] of files){if(process.argv.includes('--check')){if(!fs.existsSync(path)||fs.readFileSync(path,'utf8')!==content)stale.push(path);}else fs.writeFileSync(path,content);}
if(stale.length)throw Error('Release mismatch: '+stale.join(', '));
console.log('Release '+version+' consistent.');
