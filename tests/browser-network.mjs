// CI uses the normal network. Local restricted runners can fetch public test assets
// through the configured HTTP proxy without routing loopback through it.
import fs from 'node:fs';import path from 'node:path';import {execFileSync} from 'node:child_process';
const cache=new Map();
export async function testNetwork(context,{base='http://127.0.0.1:8000/',apps=process.env.APPS_CHECKOUT||'../Apps'}={}){
 if(base.startsWith('http://127.0.0.1'))await context.route('https://nirav2000.github.io/Apps/**',async route=>{
  const rel=new URL(route.request().url()).pathname.slice('/Apps/'.length),file=path.resolve(apps,rel);
  if(!file.startsWith(path.resolve(apps)+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile())return route.abort();
  await route.fulfill({body:fs.readFileSync(file),contentType:/\.(mjs|js)$/.test(file)?'application/javascript':file.endsWith('.css')?'text/css':'application/json',headers:{'Access-Control-Allow-Origin':'*'}});
 });
 else if(process.env.HTTPS_PROXY)await context.route('https://nirav2000.github.io/**',async route=>{
  const url=route.request().url();if(route.request().method()!=='GET')return route.abort();
  try{if(!cache.has(url))cache.set(url,execFileSync('curl',['--fail','--silent','--show-error','--location','--max-time','45',url],{maxBuffer:10_000_000}));
   const ext=new URL(url).pathname;await route.fulfill({body:cache.get(url),contentType:/\.(mjs|js)$/.test(ext)?'application/javascript':ext.endsWith('.css')?'text/css':ext.endsWith('.json')?'application/json':ext.endsWith('.png')?'image/png':'text/html',headers:{'Access-Control-Allow-Origin':'*'}});
  }catch{await route.abort();}
 });
}
