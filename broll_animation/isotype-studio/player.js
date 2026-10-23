(() => {
'use strict';
const $=id=>document.getElementById(id), canvas=$('film'),ctx=canvas.getContext('2d');
let currentT=0,playing=false,muted=true,loop=true,lastTime=0,stopSound=null,ready=false;
const duration=ISOTYPE_STUDIO.duration;
const playbackStatus=`${duration} seconds · Canvas + synthesized audio · No generated video`;
let audioRequest=0;
function silence(){audioRequest++;if(stopSound){stopSound();stopSound=null;}}
function startSound(){
 silence();if(muted||!playing)return;
 const request=audioRequest;
 const failed=error=>{if(request!==audioRequest)return;silence();muted=true;$('sound').textContent='Sound off';$('sound').setAttribute('aria-pressed','false');$('status').textContent='Audio could not start. Click Sound off to retry, or play the downloaded MP4.';console.error('Audio playback:',error);};
 try{stopSound=SOUND.live(scoreSound,currentT,{voiceover:false,master:.85,duration});stopSound.ready.then(()=>{if(request===audioRequest)$('status').textContent=playbackStatus;}).catch(failed);}catch(error){failed(error);}
}
function paint(t){
 currentT=Math.max(0,Math.min(duration,Number(t)||0));
 ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);
 ISOTYPE_STUDIO.draw(ctx,canvas.width,canvas.height,currentT);
 $('scrub').value=currentT;$('time').textContent=`${currentT.toFixed(1)} / ${duration.toFixed(1)}s`;
}
function setPlaying(value){playing=value&&ready;lastTime=0;$('play').textContent=playing?'Pause':'Play';$('play').setAttribute('aria-pressed',String(playing));if(playing)startSound();else silence();}
window.seek=t=>{setPlaying(false);paint(t);};
window.renderReady=document.fonts.ready.then(async()=>{
 await Promise.all(['700 56px "Space Grotesk"'].map(font=>document.fonts.load(font)));
 ISOTYPE_STUDIO.assets();ready=true;paint(0);$('status').textContent=playbackStatus;
 if(!new URLSearchParams(location.search).has('render'))SOUND.prepare(scoreSound,duration,{voiceover:false,master:.85}).catch(error=>console.warn('Audio preparation will retry on playback:',error));
 $('play').disabled=false;
 if(!matchMedia('(prefers-reduced-motion: reduce)').matches&&!new URLSearchParams(location.search).has('render'))setPlaying(true);
});
function frame(now){
 requestAnimationFrame(frame);if(!playing||document.hidden){lastTime=0;return;}
 if(lastTime===0){lastTime=now;return;}
 const next=currentT+(now-lastTime)/1000;lastTime=now;
 if(next>=duration){if(loop){paint(next%duration);startSound();}else{paint(duration);setPlaying(false);}}else paint(next);
}
requestAnimationFrame(frame);
$('play').addEventListener('click',()=>{if(currentT>=duration)paint(0);setPlaying(!playing);});
$('restart').addEventListener('click',()=>{paint(0);setPlaying(true);});
$('scrub').addEventListener('input',event=>{setPlaying(false);paint(event.target.value);});
$('sound').addEventListener('click',()=>{muted=!muted;$('sound').textContent=muted?'Sound off':'Sound on';$('sound').setAttribute('aria-pressed',String(!muted));startSound();});
$('loop').addEventListener('click',()=>{loop=!loop;$('loop').textContent=loop?'Loop on':'Loop off';$('loop').setAttribute('aria-pressed',String(loop));});
document.addEventListener('visibilitychange',()=>{if(document.hidden){silence();lastTime=0;}else if(playing)startSound();});
document.addEventListener('keydown',event=>{if(['INPUT','TEXTAREA','BUTTON','SELECT'].includes(document.activeElement.tagName))return;if(event.code==='Space'){event.preventDefault();setPlaying(!playing);}});
document.querySelectorAll('[data-time]').forEach(button=>button.addEventListener('click',()=>window.seek(button.dataset.time)));
const promptButton=$('copy');
if(promptButton)promptButton.addEventListener('click',async()=>{
 try{const result=await fetch('prompt.txt');if(!result.ok)throw Error('Prompt unavailable');await navigator.clipboard.writeText(await result.text());promptButton.textContent='Full prompt copied';setTimeout(()=>promptButton.textContent='Copy full prompt + code',2500);}
 catch{promptButton.textContent='Use Download prompt below';}
});
})();
