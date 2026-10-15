import fs from 'node:fs';
const expected=JSON.parse(fs.readFileSync('version.json','utf8')).version;
const atLeast=(a,b)=>a===b;
for(let attempt=0;attempt<30;attempt++){
 try{
  const r=await fetch('https://nirav2000.github.io/Dol/version.json?check='+Date.now());if(!r.ok)throw Error('Metadata unavailable');
  const {version}=await r.json();const html=await (await fetch('https://nirav2000.github.io/Dol/?check='+Date.now())).text();
  if(atLeast(version,expected)&&html.includes('Dol v'+version)){console.log('Published Dol',version,'matches tested release',expected);process.exit(0);}
 }catch(e){console.log('Waiting for Pages',e.message);}
 await new Promise(r=>setTimeout(r,10000));
}
throw Error('Pages did not publish the tested version or a newer release');
