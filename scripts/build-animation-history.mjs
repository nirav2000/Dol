#!/usr/bin/env node
/** Read every reachable Git commit and archive its actual celebration CSS and
 * handler source. Historical code runs only in a sandboxed comparison frame.
 * No archived app or account/auth code is executed. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
const root=process.cwd(),output=path.join(root,'animation-history-data'),effectRoot=path.join(output,'effects');
const sources=['version.json','learning-app.mjs','styles.css','round-tools.css','focus-mode.css','mobile-entry.css','strategy-coach.css','factor-patterns.css','tablet-keypad.css','layout-options.css','ui/pairboard-phone.css','ui/pairboard-tablet.css','ui/pairboard-desktop.css','mobile-learning.css','mobile-redesign.css','focus-celebrations.css','focus-learning.css','prime-animation-lab.css','prime-animation-lab.js'];
const cssFiles=sources.filter(x=>x.endsWith('.css'));
const names=['celebratePrimeResult','celebrateNumberResult','celebrateTile','showSpecialAchievement','showFactorTargetAnimation','animateDiscoveredPair'];
const sha=txt=>crypto.createHash('sha256').update(txt).digest('hex');
const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',maxBuffer:20*1024*1024,stdio:['ignore','pipe','pipe']});
const blobCache=new Map();
function readBlob(id){if(!id)return '';if(!blobCache.has(id))blobCache.set(id,git('cat-file','blob',id));return blobCache.get(id);}
function treeFiles(commit){
 const data=git('ls-tree','-r',commit,'--',...sources),files={};
 for(const line of data.trim().split('\n')){const m=line.match(/^100644 blob ([0-9a-f]{40})\t(.+)$/);if(m)files[m[2]]=m[1];}
 return files;
}
function functionSource(source,name){
 const found=new RegExp('\\bfunction\\s+'+name+'\\s*\\(').exec(source);
 if(!found)return '';
 const opening=source.indexOf('{',found.index+found[0].length);if(opening<0)return '';
 let depth=0,quote='',comment='',escaped=false;
 for(let i=opening;i<source.length;i++){
  const ch=source[i],next=source[i+1];
  if(comment==='line'){if(ch==='\n')comment='';continue;}
  if(comment==='block'){if(ch==='*'&&next==='/'){comment='';i++;}continue;}
  if(quote){if(escaped){escaped=false;continue;}if(ch==='\\'){escaped=true;continue;}if(ch===quote)quote='';continue;}
  if(ch==='/'&&next==='/'){comment='line';i++;continue;}
  if(ch==='/'&&next==='*'){comment='block';i++;continue;}
  if(ch==='"'||ch==="'"||ch==='\x60'){quote=ch;continue;}
  if(ch==='{')depth++;
  else if(ch==='}'){depth--;if(depth===0)return source.slice(found.index,i+1);}
 }
 throw Error('Unclosed function '+name);
}
function matchingAnimationCSS(css){
 return css.split('\n').filter(x=>/@keyframes|animation:|animation-duration:|prime-ribbon|prime-bubble|prime-star|prime-rainbow|celebrat|factor-target-burst|factor-dock-burst|pair-discovery|square-bloom|coach-motion|\.card\.(?:rainbow|orbit|ripple|quiet|gem-)/i.test(x)).join('\n');
}
function kind(script,lab){
 if(script.showFactorTargetAnimation)return 'target-and-tile';
 if(script.celebrateNumberResult)return 'number-type';
 if(script.celebratePrimeResult)return 'original-prime-ribbon';
 if(lab)return 'prime-lab-only';
 return 'no-special-effect';
}
const labels={'target-and-tile':'Target + factor-card celebrations','number-type':'Number-type factor-card celebrations','original-prime-ribbon':'Original Rainbow Ribbon','prime-lab-only':'Prime Lab prototypes (not yet in the game)','no-special-effect':'No special result animation'};
if(!fs.existsSync(path.join(root,'.git')))throw Error('Run in a full Git checkout');
const history=git('log','--reverse','--format=%H%x1f%cI%x1f%s','HEAD').trim().split('\n').filter(Boolean).map(line=>{
 const [commit,date,message]=line.split('\x1f');
 if(!/^[0-9a-f]{40}$/.test(commit))throw Error('Unexpected history entry '+line);
 return {commit,date,message:message||''};
});
fs.mkdirSync(effectRoot,{recursive:true});
for(const file of fs.readdirSync(effectRoot))if(file.endsWith('.json'))fs.unlinkSync(path.join(effectRoot,file));
const commits=[],snapshots=new Map();let previous='';
for(const item of history){
 const blobs=treeFiles(item.commit),read=p=>readBlob(blobs[p]);
 let version='unversioned';
 try{version=String(JSON.parse(read('version.json')||'{}').version||'unversioned').replace(/^v/,'');}catch{}
 const script={};for(const name of names)script[name]=functionSource(read('learning-app.mjs'),name);
 const effectKind=kind(script,read('prime-animation-lab.css'));
 const original={
  css:Object.fromEntries(cssFiles.map(p=>[p,read(p)]).filter(([,content])=>!!content)),
  functions:Object.fromEntries(Object.entries(script).filter(([,content])=>!!content)),
  labSource:read('prime-animation-lab.js'),kind:effectKind
 };
 const renderId=sha(JSON.stringify(original)).slice(0,20);
 const variantId=sha(JSON.stringify({kind:effectKind,script,
  css:cssFiles.map(p=>matchingAnimationCSS(read(p))),labSource:read('prime-animation-lab.js')})).slice(0,16);
 const changed=variantId!==previous;
 if(!snapshots.has(renderId)){
  fs.writeFileSync(path.join(effectRoot,renderId+'.json'),JSON.stringify(original));
  snapshots.set(renderId,true);
 }
 commits.push({sha:item.commit,version,date:item.date,message:item.message,renderId,variantId,
  kind:effectKind,kindLabel:labels[effectKind],changed,labAvailable:!!read('prime-animation-lab.css'),
  changedFrom:previous||null});
 previous=variantId;
}
const versions=new Map();
for(let i=0;i<commits.length;i++){
 const c=commits[i],v=versions.get(c.version);
 if(v){v.commitCount++;v.lastCommitIndex=i;v.lastCommit=c.sha;v.lastDate=c.date;v.kind=c.kind;v.kindLabel=c.kindLabel;v.renderId=c.renderId;v.variantId=c.variantId;v.labAvailable=c.labAvailable;if(c.changed)v.animationChanges++;}
 else versions.set(c.version,{version:c.version,firstCommitIndex:i,lastCommitIndex:i,firstDate:c.date,lastDate:c.date,
  firstCommit:c.sha,lastCommit:c.sha,commitCount:1,animationChanges:c.changed?1:0,
  kind:c.kind,kindLabel:c.kindLabel,renderId:c.renderId,variantId:c.variantId,labAvailable:c.labAvailable});
}
const current=JSON.parse(fs.readFileSync(path.join(root,'version.json'),'utf8')).version;
const catalog={schemaVersion:1,generatedAt:new Date().toISOString(),source:'Git commit tree, original CSS and animation handlers',
 repository:'nirav2000/Dol',release:current,totalCommits:commits.length,totalVersions:versions.size,
 totalAnimationSignatures:new Set(commits.map(x=>x.variantId)).size,totalRenderSnapshots:snapshots.size,
 versions:[...versions.values()].reverse(),commits:commits.slice().reverse()};
if(catalog.versions[0].version!==current)throw Error('History missing current release '+current);
if(!catalog.versions.some(x=>x.version==='2.5.10'&&x.labAvailable))throw Error('v2.5.10 lab not found');
if(!catalog.commits.some(x=>x.sha.startsWith('f745738e')&&x.kind==='original-prime-ribbon'))throw Error('Lost original prime trigger');
if(!catalog.commits.some(x=>x.sha.startsWith('ee3c99b8')&&x.kind==='number-type'))throw Error('Lost generic number trigger');
fs.writeFileSync(path.join(output,'history.json'),JSON.stringify(catalog));
console.log('Dol animation archive: '+catalog.totalCommits+' commits, '+catalog.totalVersions+' versions, '+catalog.totalAnimationSignatures+' distinct signatures and '+catalog.totalRenderSnapshots+' source snapshots (current '+current+')');
