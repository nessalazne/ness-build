/* LUMA is a fictional product concept, not an advertised device. */
(()=>{'use strict';const P=PRODUCT,DURATION=15;
const progress=(t,a,b)=>H.clamp((t-a)/(b-a)),smooth=(t,a,b)=>H.ease.inOut(progress(t,a,b));
const keys=[{t:0,cx:640,cy:535,s:.69,yaw:-1.05,pitch:.24},{t:3.5,cx:640,cy:535,s:.79,yaw:-.65,pitch:.4},{t:6.5,cx:640,cy:530,s:.91,yaw:-.22,pitch:.55},{t:9.5,cx:640,cy:535,s:.85,yaw:.25,pitch:.48},{t:12.5,cx:640,cy:535,s:.73,yaw:.42,pitch:.4},{t:15,cx:640,cy:535,s:.73,yaw:.45,pitch:.41}];
function draw(c,w,h,t){t=H.clamp(t,0,15);const cam=P.cam(P.keyed(keys,t));
const L={key:.08+.92*smooth(t,.8,3.3),rim:.18+.82*smooth(t,.1,1.8),ring:smooth(t,2.2,3.2)*(.8+.18*Math.sin(t*1.3)),spec:t<7?H.lerp(-.4,1.4,progress(t,2,6)):H.lerp(-.25,1.25,progress(t,8.5,12.3)),fwd:t>3?(t-3)%2/1.65:-1,back:-1,adj:0,act:smooth(t,2.8,3.8),hover:.37+.015*Math.sin(t*1.1),ringRot:t*.2};
if(L.fwd>1)L.fwd=-1;P.stage(c,w,h,cam,L,t);P.chip(c,cam,L);
const intro=1-smooth(t,4.1,4.7),ending=smooth(t,10.8,11.6);
P.words(c,[{s:'Meet',t:1.2},{s:'LUMA.',t:1.5,fill:'grad'}],640,145,800,88,t,{align:'center',alpha:intro});
P.label(c,'A FICTIONAL PRODUCT CONCEPT',640,194,600,20,'#a1a1a6','center',intro*smooth(t,2,2.6));
const detail=smooth(t,4.4,5)*(1-smooth(t,10,10.7));
P.words(c,[{s:'Designed',t:4.4},{s:'around',t:4.6},{s:'light.',t:4.8,fill:'grad'}],640,120,800,58,t,{align:'center',alpha:detail});
c.save();c.globalAlpha=detail;const y=L.hover+P.THICK/2;
const a=cam.P(-.8,y,-.6),b=cam.P(.62,y,.5);
P.callout(c,[a,[390,300],[285,300]],smooth(t,5.1,6.1),'Sculpted edge','Rounded silhouette','l',{px:27,subPx:21});
P.callout(c,[b,[890,350],[965,350]],smooth(t,7,8),'Edge illumination','Color follows the form','r',{px:27,subPx:21});
c.restore();
P.words(c,[{s:'LUMA',t:10.9,fill:'grad'}],640,135,800,100,t,{align:'center',alpha:ending});
P.label(c,'A study in light.',640,196,400,34,'#f5f5f7','center',ending);
P.label(c,'CONCEPT EDITION / ORIGINAL CODE ANIMATION',640,677,600,18,'#a1a1a6','center',smooth(t,11.6,12.3));
P.finish(c,w,h,t,false);}
function scoreSound(k){k.bed('hum',0,14.7,{gain:.15});
k.tone(.2,{f:[[0,45],[2.8,70]],type:'sine',dur:3.1,gain:.12,a:1.1});
const sweep=(t,d)=>k.noise(t,{dur:d,color:'pink',filter:'bandpass',f:[[0,250],[d*.7,1600],[d,500]],gain:.055,a:d*.4});
sweep(1.6,1.7);k.tone(3.15,{f:'C3',type:'triangle',dur:.7,gain:.12,a:.015});
[5.9,7.8].forEach((t,i)=>k.tone(t,{f:i?'G5':'E5',type:'sine',dur:.3,gain:.075,a:.02}));sweep(8.6,1.4);sweep(10.6,.7);
['C4','E4','G4'].forEach((f,i)=>k.tone(11.5+i*.08,{f,type:'sine',dur:1.6,gain:.095,a:.06}));}
window.LAUNCH_STUDIO={draw,scoreSound,duration:DURATION,width:1280,height:720,assets:()=>{}};window.DURATION=DURATION;window.scoreSound=scoreSound;
})();
