(function(){
'use strict';
const $=id=>document.getElementById(id),C=window.CompanionCore;
const defaults={name:'小蓝',city:'如皋',lat:32.37,lon:120.57,night:true,bed:'22:30',wake:'07:00',greeting:false,greetTime:'07:05',endpoint:'',token:''};
let settings=Object.assign({},defaults),weather=null,busy=false,unlocked=false,manualSleep=false,awakeUntil=0,history=[],lastGreeting='',voiceURL=null,weatherSeq=0;
try{settings=Object.assign(settings,JSON.parse(localStorage.getItem('v10-companion-settings')||'{}'));lastGreeting=localStorage.getItem('v10-last-greeting')||'';}catch(e){}
function set(id,text,cls){$(id).textContent=text;if(cls)$(id).className=cls;}
function state(kind,label){$('avatar').className='avatar '+kind;$('stateLabel').textContent=label;}
function status(text){$('recordInfo').textContent=text;}
function message(role,text){const box=$('messages');if(box.querySelector('.empty'))box.textContent='';const p=document.createElement('p');p.className=role==='user'?'you':'bot';p.textContent=(role==='user'?'你：':settings.name+'：')+text;box.appendChild(p);while(box.children.length>12)box.removeChild(box.firstChild);box.scrollTop=box.scrollHeight;}
function stopSpeech(){if(window.speechSynthesis)window.speechSynthesis.cancel();$('audio').pause();state('idle','在这里陪着你');}
function sayLocal(text){$('subtitle').textContent=text;message('assistant',text);stopSpeech();if(!window.speechSynthesis||!window.SpeechSynthesisUtterance){status('已显示招呼文字；当前浏览器未开放系统朗读，连接语音后端后可播放');return;}try{const u=new SpeechSynthesisUtterance(text);u.lang='zh-CN';u.rate=.95;u.onstart=()=>state('speaking','正在和你说话');u.onend=()=>state('idle','在这里陪着你');u.onerror=()=>{state('idle','在这里陪着你');status('本机朗读不可用，请连接语音后端');};speechSynthesis.speak(u);}catch(e){status('本机朗读不可用');}}
function base(){return settings.endpoint.replace(/\/+$/,'');}
async function request(path,body){if(!settings.endpoint)throw new Error('尚未配置 AI 服务；请在设置中连接自己的后端');if(!settings.token)throw new Error('请先填写服务访问口令（不是 DeepSeek 密钥）');const url=base();if(!/^https:\/\//i.test(url)&&!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(url))throw new Error('远程服务必须使用 HTTPS');const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),90000);try{const r=await fetch(url+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json','Authorization':'Bearer '+settings.token},body:body?JSON.stringify(body):undefined,signal:controller.signal});const data=await r.json();if(!r.ok)throw new Error(data.error||'服务请求失败 '+r.status);return data;}finally{clearTimeout(timer);}}
function weatherContext(){if(!weather)return null;return {city:settings.city,observed:weather.current.time,temperature:weather.current.temperature_2m,feels:weather.current.apparent_temperature,min:weather.daily.temperature_2m_min[0],max:weather.daily.temperature_2m_max[0],rain:weather.daily.precipitation_probability_max[0]};}
function toBase64(blob){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject(new Error('读取录音失败'));reader.readAsDataURL(blob);});}
function audioFromBase64(value){const bytes=atob(value),array=new Uint8Array(bytes.length);for(let i=0;i<bytes.length;i++)array[i]=bytes.charCodeAt(i);return new Blob([array],{type:'audio/wav'});}
async function answer(payload){if(busy)return;busy=true;$('talk').disabled=true;stopSpeech();state('thinking','让我想一想');$('chatBadge').textContent='正在请求 DeepSeek';try{const result=await request('/api/chat',Object.assign({history:history.slice(-8),weather:weatherContext(),name:settings.name},payload));if(result.transcript){message('user',result.transcript);history.push({role:'user',content:result.transcript});}message('assistant',result.answer);history.push({role:'assistant',content:result.answer});$('subtitle').textContent=result.answer;$('chatBadge').textContent='DeepSeek 已回答';status(result.audio?'回答已就绪，正在尝试播放':'已显示回答；后端语音未生成');if(document.body.classList.contains('sleeping')){state('idle','晚安');status('回答已收到，夜间不播放');return;}if(result.audio){if(voiceURL)URL.revokeObjectURL(voiceURL);voiceURL=URL.createObjectURL(audioFromBase64(result.audio));$('audio').src=voiceURL;$('audio').style.display='block';try{await $('audio').play();state('speaking','正在和你说话');}catch(e){state('idle','点播放器听回答');status('自动播放被拦截，请点下方播放器');}}else state('idle','在这里陪着你');}catch(e){state('idle','连接需要一点帮助');status(e.name==='AbortError'?'服务等待超时，请稍后重试':e.message);$('chatBadge').textContent='请求未完成';}finally{busy=false;$('talk').disabled=false;}}
async function handleRecording(blob){if(document.body.classList.contains('sleeping'))return;state('idle','录好了');if(settings.endpoint&&settings.token){try{await answer({audio:await toBase64(blob)});}catch(e){status(e.message);}}else status('录音已保存在本页，可回放。AI 尚未连接，请在设置里配置服务。');}
function paintSettings(){ $('brandName').textContent=settings.name;$('cityLabel').textContent=settings.city;document.title=settings.name+' · 化妆桌上的 AI 伙伴';$('scheduleNote').textContent=settings.night?'夜间：'+settings.bed+' — '+settings.wake:'夜间模式已关闭';$('connection').textContent=settings.endpoint?'AI 服务待验证':'AI 尚未连接';}
async function refreshWeather(){const seq=++weatherSeq;weather=null;$('temp').textContent='—°';$('outfit').textContent='正在查询天气…';$('weatherDesc').textContent='等待天气数据';try{const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);let r;try{r=await fetch(C.weatherUrl(settings.lat,settings.lon),{signal:controller.signal});}finally{clearTimeout(timer);}if(!r.ok)throw new Error('天气服务暂不可用');const w=await r.json();if(seq!==weatherSeq)return;if(!w.current||!w.daily||w.current.temperature_2m==null)throw new Error('天气返回不完整');weather=w;$('temp').textContent=Math.round(w.current.temperature_2m)+'°';const code=w.current.weather_code;$('weatherDesc').textContent=code<=1?'晴朗':code<=3?'多云':code<=48?'有雾':code<=67?'有雨':code<=77?'有雪':'阵雨或雷雨';$('feels').textContent='体感 '+Math.round(w.current.apparent_temperature)+'°';$('range').textContent=Math.round(w.daily.temperature_2m_min[0])+' / '+Math.round(w.daily.temperature_2m_max[0])+'°';$('rain').textContent='降雨概率 '+w.daily.precipitation_probability_max[0]+'%';$('outfit').textContent=C.outfit(w);$('weatherSource').textContent='Open-Meteo · '+w.current.time.replace('T',' ')+' · 穿衣为规则建议';}catch(e){if(seq!==weatherSeq)return;weather=null;$('weatherDesc').textContent='天气连接失败';$('feels').textContent='体感 —°';$('range').textContent='— / —°';$('rain').textContent='降雨 —';$('outfit').textContent='暂时无法取得实时天气，不能判断今天的温度。点刷新可以重试。';$('weatherSource').textContent='Open-Meteo · 暂无可用数据';}}
function greeting(){const text='早上好呀，'+settings.name+'在这里陪你。'+(weather?settings.city+'现在'+Math.round(weather.current.temperature_2m)+'度。'+C.outfit(weather):'今天也慢慢来，先把自己照顾好。天气还没有连上。');if(settings.endpoint&&settings.token)answer({text:'请用一句温柔的早安招呼，再根据天气给出简短穿衣提醒。'});else sayLocal(text);}
function timeString(d){return ('0'+d.getHours()).slice(-2)+':'+('0'+d.getMinutes()).slice(-2);}
function tick(){const d=new Date(),time=timeString(d),day=d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();$('dateText').textContent=(d.getMonth()+1)+'月'+d.getDate()+'日 · '+['周日','周一','周二','周三','周四','周五','周六'][d.getDay()];if(manualSleep&&time===settings.wake)manualSleep=false;const night=(manualSleep||(settings.night&&C.isNight(time,settings.bed,settings.wake)))&&Date.now()>awakeUntil;if(night&&!document.body.classList.contains('sleeping')){stopCapture(false);stopSpeech();}document.body.classList.toggle('sleeping',night);$('night').hidden=!night;if(!night&&settings.greeting&&unlocked&&time===settings.greetTime&&lastGreeting!==day&&!busy&&!capture){lastGreeting=day;try{localStorage.setItem('v10-last-greeting',day);}catch(e){}greeting();}}
$('night').onclick=()=>{awakeUntil=Date.now()+120000;tick();};$('night').onkeydown=e=>{if(e.key==='Enter'||e.key===' '){awakeUntil=Date.now()+120000;tick();}};
$('sleepNow').onclick=()=>{manualSleep=true;awakeUntil=0;tick();};$('fullscreen').onclick=async()=>{try{const el=document.documentElement;await (el.requestFullscreen||el.webkitRequestFullscreen).call(el);}catch(e){status('当前容器不允许全屏');}};
$('stopSpeech').onclick=stopSpeech;$('greet').onclick=()=>{unlocked=true;greeting();};$('weatherRefresh').onclick=refreshWeather;$('askWeather').onclick=()=>{unlocked=true;if(weather)sayLocal(settings.city+'现在'+Math.round(weather.current.temperature_2m)+'度。'+C.outfit(weather));else{status('正在刷新天气，稍后再点“今天穿什么”');refreshWeather();}};
$('textForm').onsubmit=e=>{e.preventDefault();const value=$('textInput').value.trim();if(!value||busy)return;unlocked=true;$('textInput').value='';answer({text:value});};
$('settingsOpen').onclick=()=>{const fields={nameSetting:'name',citySetting:'city',latSetting:'lat',lonSetting:'lon',bedSetting:'bed',wakeSetting:'wake',greetTimeSetting:'greetTime',endpointSetting:'endpoint',tokenSetting:'token'};Object.keys(fields).forEach(id=>$(id).value=settings[fields[id]]);$('nightSetting').checked=settings.night;$('greetingSetting').checked=settings.greeting;$('settings').hidden=false;};$('settingsClose').onclick=()=>{$('settings').hidden=true;};
$('settingsForm').onsubmit=e=>{e.preventDefault();const lat=Number($('latSetting').value),lon=Number($('lonSetting').value);if(!isFinite(lat)||lat< -90||lat>90||!isFinite(lon)||lon< -180||lon>180){$('saveResult').textContent='请输入有效经纬度';return;}settings={name:$('nameSetting').value.trim()||'小蓝',city:$('citySetting').value.trim()||'当前城市',lat:lat,lon:lon,night:$('nightSetting').checked,bed:$('bedSetting').value||'22:30',wake:$('wakeSetting').value||'07:00',greeting:$('greetingSetting').checked,greetTime:$('greetTimeSetting').value||'07:05',endpoint:$('endpointSetting').value.trim().replace(/\/+$/,''),token:$('tokenSetting').value.trim()};try{localStorage.setItem('v10-companion-settings',JSON.stringify(settings));}catch(e){status('浏览器未允许保存设置，退出后需重新填写');}manualSleep=false;paintSettings();refreshWeather();$('settings').hidden=true;tick();};
$('connectTest').onclick=async()=>{try{const r=await request('/api/health');$('saveResult').textContent='连接成功 · DeepSeek '+(r.deepseek?'已配置':'未配置')+' · 识别 '+(r.stt?'可用':'未就绪')+' · 朗读 '+(r.tts?'可用':'未就绪');$('connection').textContent=r.deepseek&&r.stt?'AI 服务已连接':'服务已连接，配置待完成';}catch(e){$('saveResult').textContent=e.message;}};
$('audio').addEventListener('ended',()=>state('idle','在这里陪着你'));
  // Legacy V10 capture: Web Audio -> mono PCM16 WAV, entirely in memory.
  let capture = null, captureSerial = 0, audioURL = null;
  function cleanupCapture(session) {
    clearTimeout(session.timer); clearTimeout(session.requestTimer);
    if (session.processor) session.processor.onaudioprocess = null;
    [session.source, session.processor, session.gain].forEach(node => {
      if (node) { try { node.disconnect(); } catch (e) {} }
    });
    if (session.stream) session.stream.getTracks().forEach(t => t.stop());
    if (session.context) { try { Promise.resolve(session.context.close()).catch(() => {}); } catch (e) {} }
    session.blocks = [];
    if (capture === session) {
      capture = null;
      $('talk').disabled = false;
      $('talk').className='talk'; state('idle','在这里陪着你');
      $('talk').textContent = '开始说话 ●';
    }
  }
  function encodeWav(blocks, samples, sampleRate) {
    const buffer = new ArrayBuffer(44 + samples * 2);
    const view = new DataView(buffer);
    const write = (offset, text) => { for (let i=0;i<text.length;i++) view.setUint8(offset+i,text.charCodeAt(i)); };
    write(0,'RIFF'); view.setUint32(4,36+samples*2,true); write(8,'WAVE');
    write(12,'fmt '); view.setUint32(16,16,true); view.setUint16(20,1,true);
    view.setUint16(22,1,true); view.setUint32(24,sampleRate,true);
    view.setUint32(28,sampleRate*2,true); view.setUint16(32,2,true); view.setUint16(34,16,true);
    write(36,'data'); view.setUint32(40,samples*2,true);
    let offset=44;
    blocks.forEach(block => { for (let i=0;i<block.length;i++) {
      const value=Math.max(-1,Math.min(1,block[i]));
      view.setInt16(offset,Math.round(value<0 ? value*32768 : value*32767),true); offset+=2;
    }});
    return new Blob([buffer],{type:'audio/wav'});
  }
  function stopCapture(save) {
    const session=capture;
    if (!session) return;
    session.cancelled=true;
    try {
      if (save) {
        if (!session.samples) {
          set('recordInfo','没有收到音频数据；请查看下方说明','bad');
          $('subtitle').textContent='麦克风音轨已获得，但 Web Audio 没有回传采样。请拍下此状态，不能据此判断硬件损坏。';
        } else {
          const blob=encodeWav(session.blocks,session.samples,session.context.sampleRate);
          if (audioURL) URL.revokeObjectURL(audioURL);
          audioURL=URL.createObjectURL(blob);
          $('audio').src=audioURL; $('audio').style.display='block'; $('audio').load();
          $('replay').disabled=false;
          setTimeout(()=>handleRecording(blob),0);
          const seconds=(session.samples/session.context.sampleRate).toFixed(1);
          set('recordInfo','已生成 '+seconds+' 秒 WAV；点顶部“回放录音”',session.peak>0.001 ? 'ok':'warn');
          $('recordInfo').textContent='已保存 '+seconds+' 秒 · '+Math.round(blob.size/1024)+' KB'+(session.peak<=0.001 ? ' · 信号很弱或静音':' · 请回放核对声音');
          $('subtitle').textContent='录音已生成。连接 AI 服务后会发送处理；尚未连接时只保存在本页，可点“回放我的录音”。';
        }
      }
    } catch(e) { set('recordInfo','生成 WAV 失败：'+e.message,'bad'); }
    finally { cleanupCapture(session); }
  }
  $('replay').addEventListener('click', async () => {
    if (!audioURL) return;
    try {
      const audio=$('audio'); audio.pause(); if(audio.src!==audioURL){audio.src=audioURL;audio.load();} audio.currentTime=0;
      audio.volume=1; audio.muted=false;
      await audio.play(); $('recordInfo').textContent='正在回放，请听 V10 扬声器';
    } catch(e) { $('recordInfo').textContent='回放失败：'+e.name+' / '+e.message; }
  });
  $('audio').addEventListener('ended', () => { $('recordInfo').textContent='回放结束；可再次点击回放'; });
  $('audio').addEventListener('error', () => {
    if (audioURL) $('recordInfo').textContent='播放器错误：'+($('audio').error && $('audio').error.code || '未知');
  });
  $('talk').addEventListener('click', async () => {
    if (capture) { stopCapture(capture.active); return; }
    const session={id:++captureSerial,blocks:[],samples:0,peak:0,active:false,cancelled:false,lastUI:0};
    capture=session;
    unlocked=true; stopSpeech();
    $('audio').pause(); $('replay').disabled=true;
    $('talk').textContent='取消麦克风请求'; state('listening','准备听你说话');
    set('recordInfo','正在请求麦克风…','warn');
    $('meterFill').style.width='0%'; $('recordInfo').textContent='等待麦克风权限，最长30秒';
    session.requestTimer=setTimeout(() => {
      if (capture!==session) return;
      session.cancelled=true; cleanupCapture(session);
      set('recordInfo','请求超时，已取消；请检查麦克风权限','bad');
    },30000);
    try {
      const AudioContextClass=window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) throw new Error('此浏览器没有 Web Audio');
      session.context=new AudioContextClass();
      // Resume in the user gesture; do not let resume wait block permission requests.
      const resume=session.context.resume();
      if (resume && resume.catch) resume.catch(() => {});
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error('未开放网页麦克风接口');
      const stream=await navigator.mediaDevices.getUserMedia({audio:true,video:false});
      if (session.cancelled || capture!==session) { stream.getTracks().forEach(t=>t.stop()); return; }
      session.stream=stream;
      if (!stream.getAudioTracks().length) throw new Error('没有返回音频轨道');
      clearTimeout(session.requestTimer);
      if (!session.context.createScriptProcessor) throw new Error('没有兼容采样接口 createScriptProcessor');
      session.source=session.context.createMediaStreamSource(stream);
      session.processor=session.context.createScriptProcessor(4096,1,1);
      session.gain=session.context.createGain(); session.gain.gain.value=0;
      session.active=true;
      session.processor.onaudioprocess=event => {
        if (!session.active || session.cancelled) return;
        const input=event.inputBuffer.getChannelData(0);
        const remaining=session.context.sampleRate*15-session.samples;
        if (remaining<=0) { stopCapture(true); return; }
        const block=new Float32Array(input.subarray(0,Math.min(input.length,remaining)));
        session.blocks.push(block); session.samples+=block.length;
        let power=0,peak=0;
        for(let i=0;i<block.length;i++) { power+=block[i]*block[i]; peak=Math.max(peak,Math.abs(block[i])); }
        session.peak=Math.max(session.peak,peak);
        // Never feed microphone samples to the speakers while recording.
        event.outputBuffer.getChannelData(0).fill(0);
        if (Date.now()-session.lastUI>100) {
          session.lastUI=Date.now();
          const rms=Math.sqrt(power/Math.max(1,block.length));
          $('meterFill').style.width=Math.min(100,rms*500)+'%';
          $('recordInfo').textContent='已采集 '+(session.samples/session.context.sampleRate).toFixed(1)+' 秒 / 15 秒 · 音量 '+Math.round(rms*100)+'%';
        }
        if(session.samples>=session.context.sampleRate*15) stopCapture(true);
      };
      session.source.connect(session.processor); session.processor.connect(session.gain); session.gain.connect(session.context.destination);
      $('talk').textContent='停止并发送';
      $('talk').className='talk recording'; state('listening','我在听，你说');
      set('recordInfo','采集中；请说话，观察音量条','warn');
      $('subtitle').textContent='我在听，请说话。说完点“停止并发送”，最长15秒。';
      session.timer=setTimeout(() => { if(capture===session) stopCapture(true); },15000);
    } catch(e) {
      if (capture!==session) return;
      session.cancelled=true; cleanupCapture(session);
      set('recordInfo','采集失败：'+e.name+': '+e.message,'bad');
    }
  });
  window.addEventListener('pagehide', () => {
    stopCapture(false);
    if (audioURL) { URL.revokeObjectURL(audioURL); audioURL=null; }
  });

paintSettings();refreshWeather();tick();setInterval(tick,1000);setInterval(()=>{if(!document.body.classList.contains("sleeping"))refreshWeather();},1800000);
})();
