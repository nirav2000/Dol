// Dol Firebase login, powered by canonical Apps Auth v1.3 and kk-syllabus.
// Account transitions reload the app so no previous learner's in-memory state is reused.
import {Auth} from 'https://nirav2000.github.io/Apps/auth/v1/index.js';
import 'https://nirav2000.github.io/Apps/auth/v1/ui.js';
import {mountAccountEntry} from 'https://nirav2000.github.io/Apps/platform/account-entry/v1/index.js';
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
export function preferencesStore(){return {db,firestore,auth:firebaseAuth}}
export function transport(){return createFirestoreTransport({db,auth:firebaseAuth,sdk:firestore})}
export async function initAccountUI({onUser,notice}={}){
 const status=document.getElementById('dolAccountStatus');
 const say=message=>{if(status)status.textContent=message;notice?.(message)};
 await Auth.init({appId:'dol',mode:'shadow',migration:{phase:'shadow',authority:'legacy'},identity:{firebaseConfig:config},autoAnonymous:false});
 const entry=mountAccountEntry({Auth,appId:'dol',slot:document.getElementById('dolAccountEntrySlot'),settingsTrigger:document.getElementById('dolManageAccount'),variant:'balanced',theme:'midnight',methods:'emailPassword,google',heading:'Your Dol account'});
 document.getElementById('dolProgressAccount')?.addEventListener('click',entry.open);
 onAuthStateChanged(firebaseAuth,user=>{
   const next=user?.uid||'guest';
   if(next!==activeAccount()){localStorage.setItem(activeKey,next);location.reload();return}
   if(!user)document.getElementById('dolSyncStatus').textContent='Saved on this device · not synchronised';
   say(user?'Signed in: +(user.email||'Firebase account'):'Playing as guest. Progress is stored on this device.');
   onUser?.(user);
 });
 return {auth:firebaseAuth,db};
}
