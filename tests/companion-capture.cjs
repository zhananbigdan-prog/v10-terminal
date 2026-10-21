// No hardware access: exercise the page with deterministic PCM and browser mocks.
const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const source=fs.readFileSync(require('node:path').join(__dirname,'../app.js'),'utf8');
function setup(mode='normal') {
 const els={},timers=new Map(),contexts=[],blobs=[];let timerId=0,stops=0,played=0,resolvePermission,transcriptions=0,chats=0;
 const doc={title:'',body:{classList:{contains(){return false},toggle(){}}},addEventListener(){},getElementById(id){return els[id] ||= {setAttribute(){},paused:true,style:{},disabled:false,textContent:'',listeners:{},addEventListener(k,f){this.listeners[k]=f},pause(){},load(){},play(){played++;return Promise.resolve()}}}};
 const node=()=>({connect(){},disconnect(){}});
 class AudioContext {
  constructor(){this.sampleRate=8000;this.state='running';this.destination={};contexts.push(this)}
  resume(){return Promise.resolve()}
  close(){this.closed=true;return Promise.resolve()}
  createMediaStreamSource(){return node()}
  createScriptProcessor(){this.processor=node();return this.processor}
  createGain(){return {...node(),gain:{value:1}}}
 }
 const stream={getTracks:()=>[{stop(){stops++}}],getAudioTracks:()=>[{}]};
 const navigator={userAgent:'test',mediaDevices:{getUserMedia(){
  if(mode==='denied') return Promise.reject(new Error('Permission denied'));
  if(mode==='pending') return new Promise(resolve=>{resolvePermission=resolve});
  return Promise.resolve(stream);
 }}};
 const listeners={};const window={CompanionCore:require('../core.js'),isSecureContext:true,AudioContext,addEventListener(k,f){listeners[k]=f}};
 if(mode==='handsfree'){window.COMPANION_COOKIE=true;window.COMPANION_ENDPOINT='https://example.test';window.COMPANION_SESSION='test';}
 const ctx={FileReader:class{readAsDataURL(){this.result='data:audio/wav;base64,UklGRg==';this.onload()}},window,localStorage:{getItem(){return null}},fetch:async(url)=>{if(mode==='handsfree'&&url.includes('/api/')){if(url.endsWith('/api/transcribe')){transcriptions++;return {ok:true,json:async()=>({transcript:'这是背景谈话'})}}if(url.endsWith('/api/chat'))chats++;return {ok:true,json:async()=>({stt:true,deepseek:true,tts:true})}}throw new Error('offline')},AbortController,document:doc,navigator,Date,Promise,Math,Number,JSON,Object,Error,Float32Array,DataView,ArrayBuffer,Blob,URL:{createObjectURL(blob){blobs.push(blob);return 'blob:test'},revokeObjectURL(){}},setInterval(){},setTimeout(fn,ms){timers.set(++timerId,{fn,ms});return timerId},clearTimeout(id){timers.delete(id)}};
 vm.runInNewContext(source,ctx);
 return {transcriptions:()=>transcriptions,chats:()=>chats,els,timers,contexts,blobs,listeners,stream,click:id=>els[id].listeners.click(),stops:()=>stops,played:()=>played,allow:()=>resolvePermission(stream),feed(samples){const input=Float32Array.from(samples);contexts.at(-1).processor.onaudioprocess({inputBuffer:{getChannelData:()=>input},outputBuffer:{getChannelData:()=>new Float32Array(input.length)}})}};
}
(async()=>{
 const a=setup();await a.click('talk');a.feed([-1,-0.5,0,0.5,1]);await a.click('talk');
 assert.equal(a.stops(),1);assert(a.contexts[0].closed);assert.equal(a.els.replay.disabled,false);
 const wav=Buffer.from(await a.blobs[0].arrayBuffer());
 assert.equal(wav.toString('ascii',0,4),'RIFF');assert.equal(wav.toString('ascii',8,12),'WAVE');assert.equal(wav.readUInt32LE(24),8000);assert.equal(wav.readUInt32LE(40),10);assert.equal(wav.length,54);
 assert.deepEqual([0,1,2,3,4].map(i=>wav.readInt16LE(44+i*2)),[-32768,-16384,0,16384,32767]);
 await a.click('replay');assert.equal(a.played(),1);
 const silent=setup();await silent.click('talk');silent.feed([0,0,0]);await silent.click('talk');assert.equal(silent.els.recordInfo.className,'warn');
 const empty=setup();await empty.click('talk');await empty.click('talk');assert.equal(empty.blobs.length,0);assert.equal(empty.els.replay.disabled,true);
 const denied=setup('denied');await denied.click('talk');assert.equal(denied.els.recordInfo.className,'bad');assert(denied.contexts[0].closed);assert.equal(denied.els.talk.disabled,false);
 const timeout=setup('pending');const p=timeout.click('talk');[...timeout.timers.values()].find(t=>t.ms===30000).fn();timeout.allow();await p;assert.equal(timeout.stops(),1);assert(timeout.contexts[0].closed);assert.equal(timeout.blobs.length,0);
 const auto=setup();await auto.click('talk');auto.feed([0.25,0.5]);[...auto.timers.values()].find(t=>t.ms===15000).fn();assert.equal(auto.blobs.length,1);assert.equal(auto.stops(),1);
 const leaving=setup();await leaving.click('talk');leaving.feed([0.5]);leaving.listeners.pagehide();assert.equal(leaving.blobs.length,0);assert.equal(leaving.stops(),1);
 const hf=setup('handsfree');hf.els.handsfree.onclick();await new Promise(r=>setImmediate(r));hf.feed(Array(4096).fill(0));assert.equal(hf.transcriptions(),0);hf.feed(Array(4096).fill(.05));for(let i=0;i<3;i++)hf.feed(Array(4096).fill(0));await new Promise(r=>setImmediate(r));assert.equal(hf.transcriptions(),1);assert.equal(hf.chats(),0);hf.els.muteMic.onclick();assert.equal(hf.stops(),1);assert(hf.contexts[0].closed);
 console.log('PASS: PCM16 WAV header and samples; silence warning; empty capture; audio; denial; permission timeout/late stream; auto-stop; page-exit cleanup.');
})().catch(e=>{console.error(e);process.exitCode=1});
