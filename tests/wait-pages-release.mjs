import fs from 'node:fs';
const repo=process.env.GITHUB_REPOSITORY,sha=process.env.GITHUB_SHA,token=process.env.GITHUB_TOKEN;
if(!repo||!sha||!token)throw Error('GitHub Actions repository, SHA and token are required');
const headers={Authorization:'Bearer '+token,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'};
const api=async path=>{const r=await fetch('https://api.github.com/repos/'+repo+path,{headers,signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('Pages verification API: '+r.status);return r.json();};
const output=value=>{if(process.env.GITHUB_OUTPUT)fs.appendFileSync(process.env.GITHUB_OUTPUT,'current='+value+'\n');};
for(let i=0;i<30;i++){
 const branch=await api('/branches/main');if(branch.commit.sha!==sha){console.log('Superseded by newer main revision.');output('false');process.exit(0);}
 const data=await api('/actions/runs?head_sha='+sha+'&event=dynamic&per_page=20');
 const run=data.workflow_runs.find(r=>r.name==='pages build and deployment'&&r.head_sha===sha);
 if(run?.status==='completed'){
  if(run.conclusion!=='success')throw Error('Pages deployment failed: '+run.conclusion);
  console.log('Pages deployment verified:',run.html_url);output('true');process.exit(0);
 }
 await new Promise(resolve=>setTimeout(resolve,10000));
}
throw Error('Pages deployment did not complete within five minutes');
