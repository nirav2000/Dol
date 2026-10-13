// Dol Firebase login, powered by canonical Apps Auth v1.3 and kk-syllabus.
// Account transitions reload the app so no previous learner's in-memory state is reused.
import {Auth} from 'https://nirav2000.github.io/Apps/auth/v1/index.js';
import {createFirestoreTransport} from 'https://nirav2000.github.io/Apps/learning-sync/v1/index.js';
import {getApps,getApp,initializeApp} from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js';
import {getAuth,onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js';
import * as firestore from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js';
export const config={apiKey:'AIzaSyDrreK9rhsoOpIYNr4QeNZ7CsXgQiMPW0E',authDomain:'kk-syllabus.firebaseapp.com',projectId:'kk-syllabus',storageBucket:'kk-syllabus.firebasestorage.app',messagingSenderId:'821660665663',appId:'1:821660665663:web:c708860329bb97dc24758a'};
export const activeKey='dol-active-account-v1';
export const activeAccount=()=>{const v=localStorage.getItem(activeKey)||'guest';return /^[a-zA-Z0-9._-]{1,128}$/.test(v)?v:'guest'};
const app=getApps().find(x=>x.name==='apps-identity')||initializeApp(config,'apps-identity');
const firebaseAuth=getAuth(app);
const db=firestore.getFirestore(app);
export function transport(){return createFirestoreTransport({db,auth:firebaseAuth,sdk:firestore})}
export async function initAccountUI({onUser,notice}={}){
 const status=document.getElementById('dolAccountStatus'),email=document.getElementById('dolAccountEmail'),password=document.getElementById('dolAccountPassword');
 const say=message=>{if(status)status.textContent=message;notice?.(message)};
 const act=async(task)=>{try{say('Working…');await task();}catch(e){say(e.code||e.message||'Unable to sign in');}};
 await Auth.init({appId:'dol',mode:'shadow',migration:{phase:'shadow',authority:'legacy'},identity:{firebaseConfig:config},autoAnonymous:false});
 onAuthStateChanged(firebaseAuth,user=>{
   const next=user?.uid||'guest';
   if(next!==activeAccount()){localStorage.setItem(activeKey,next);location.reload();return}
   const logged=!!user;
   document.getElementById('dolAccountLogin').hidden=logged;
   document.getElementById('dolAccountLogout').hidden=!logged;
   say(logged?'Signed in: '+(user.email||'Firebase account'):'Playing as guest. Progress is stored on this device.');
   onUser?.(user);
 });
 document.getElementById('dolAccountSignIn').onclick=()=>act(()=>Auth.signInEmail(email.value.trim(),password.value));
 document.getElementById('dolAccountRegister').onclick=()=>act(()=>Auth.createEmailAccount(email.value.trim(),password.value));
 document.getElementById('dolAccountGoogle').onclick=()=>act(()=>Auth.signInGoogle());
 document.getElementById('dolAccountResetPassword').onclick=()=>act(async()=>{await Auth.resetPassword(email.value.trim());say('Password reset email requested.')});
 document.getElementById('dolAccountLogout').onclick=()=>act(()=>Auth.logout());
 return {auth:firebaseAuth,db};
}
