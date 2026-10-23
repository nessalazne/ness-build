/* Original story and score, built with the supplied Tech Glow rendering helpers. */
(()=>{'use strict';
const G=GLOW,C=G.C,DURATION=15;
const p=(t,a,b)=>H.clamp((t-a)/(b-a)),ease=(t,a,b)=>H.ease.inOut(p(t,a,b)),out=(t,a,b)=>H.ease.out(p(t,a,b));
G.ICONS.document=(c,u)=>{c.roundRect(-.6*u,-.8*u,1.2*u,1.6*u,.12*u);for(let i=0;i<3;i++){c.moveTo(-.32*u,(-.35+i*.35)*u);c.lineTo((i===2?.08:.32)*u,(-.35+i*.35)*u);}};
G.ICONS.link=(c,u)=>{c.moveTo(-.1*u,-.4*u);c.bezierCurveTo(.7*u,-1.3*u,1.3*u,-.5*u,.4*u,.2*u);c.moveTo(.1*u,.4*u);c.bezierCurveTo(-.7*u,1.3*u,-1.3*u,.5*u,-.4*u,-.2*u);c.moveTo(-.3*u,.3*u);c.lineTo(.3*u,-.3*u);};
const inputs=[{y:250,name:'Notes',icon:'document',col:C.cyan,start:.2},{y:390,name:'Links',icon:'link',col:C.blue,start:.75},{y:530,name:'Transcript',icon:'chat',col:C.violet,start:1.3}];
const paths=inputs.map(n=>G.bez(275,n.y,375,n.y,420,390,505,390));
const output=G.bez(775,390,840,390,860,390,930,390);
function text(c,s,x,y,size=30,col=C.white){c.save();c.font=`600 ${size}px Inter`;c.textAlign='center';c.textBaseline='middle';c.fillStyle=col;c.fillText(s,x,y);c.restore();}
function camera(t){const a=ease(t,1.8,4),b=ease(t,5,6.2)*(1-ease(t,8,9.4));return {x:H.lerp(330,640,a),z:H.lerp(1.12,.97,a)+b*.13};}
function draw(c,w,h,t){t=H.clamp(t,0,15);c.save();c.scale(w/1280,h/720);const cam=camera(t);G.background(c,1280,720,t,cam.x-640);
c.save();c.translate(640,390);c.scale(cam.z,cam.z);c.translate(-cam.x,-390);
inputs.forEach((n,i)=>{const a=out(t,n.start,n.start+.6);G.connector(c,paths[i],{draw:out(t,2.5+i*.4,3.7+i*.4),col:[n.col,C.violet],pulses:t>4.3?[(t-4.3-i*.15)%1.8/1.4]:[]});G.tile(c,220,n.y,100,n.icon,{a,sc:a,col:[n.col,C.violet],draw:a});c.save();c.globalAlpha=a;text(c,n.name,220,n.y+77,28);c.restore();});
const core=out(t,2.2,3.2);if(core){c.save();c.globalAlpha=core;G.card(c,505,255,270,270,{flash:Math.exp(-Math.max(0,t-4.6)*4),acc:[C.cyan,C.violet]});text(c,'CONNECT CONTEXT',640,294,23,C.cyan);
const nodes=[];for(let i=0;i<3;i++)for(let j=0;j<3;j++)nodes.push({x:555+i*85,y:345+j*50});
for(let layer=0;layer<2;layer++)for(let j=0;j<3;j++)for(let k=0;k<3;k++){const a=nodes[layer*3+j],b=nodes[(layer+1)*3+k],P=G.bez(a.x,a.y,a.x+35,a.y,b.x-35,b.y,b.x,b.y);G.connector(c,P,{draw:out(t,4.4+layer*.45,5.2+layer*.45),a:.48,noEnds:true,col:[C.cyan,C.violet],pulses:t>5.5?[(t-5.5-layer*.3-j*.1)%1.8/1.5]:[]});}
nodes.forEach((n,i)=>{const a=out(t,4+i*.06,4.5+i*.06);G.ring(c,n.x,n.y,8,C.cyan,a,1.6);G.glowDot(c,n.x,n.y,C.cyan,14,a*(.5+.3*Math.sin(t*3-i)));});
text(c,t<7?'Gather':'Organize',640,492,28);c.restore();}
G.connector(c,output,{draw:out(t,8.7,9.7),col:[C.violet,C.green],pulses:t>9.7?[(t-9.7)%2/1.6]:[]});
const ready=out(t,9.5,10.3);if(ready){c.save();c.globalAlpha=ready;c.translate(0,(1-ready)*30);G.card(c,930,247,260,286,{acc:[C.cyan,C.green],flash:Math.exp(-Math.max(0,t-12.15)*4)});text(c,'DRAFT BRIEF',1060,287,25,C.cyan);['Goal','Audience','Key message'].forEach((s,i)=>{const a=out(t,10.2+i*.55,10.65+i*.55);c.save();c.globalAlpha*=a;G.ring(c,958,339+i*57,5,C.green,1,2);c.font='600 25px Inter';c.fillStyle=C.white;c.textAlign='left';c.fillText(s,977,347+i*57);c.restore();});c.restore();}
c.restore();
const heads=[['Start with your context.',0,2.4],['Connect the pieces.',2.5,5],['Find the structure.',5.1,8.5],['Shape a useful brief.',8.6,11.8],['Context in. Clarity out.',12,15.5]];
heads.forEach(([s,a,b])=>{const alpha=out(t,a,a+.35)*(1-ease(t,b-.25,b));c.save();c.globalAlpha=alpha;G.gtext(c,s,640,104,55,{align:'center'});c.restore();});
if(t>12){G.pill(c,640,638,'Ready for your review',{a:out(t,12,12.6),size:30,col:[C.cyan,C.green],dot:true});}
G.bloom(c,1);H.vignette(c,1280,720,.45,'2,3,16');c.restore();}
function scoreSound(k){k.bed('hum',0,14.5,{gain:.16});
const ping=(t,f,g=.15)=>k.tone(t,{f,type:'sine',dur:.22,gain:g,a:.01});
inputs.forEach((n,i)=>ping(n.start+.25,['C5','E5','G5'][i]));
[2.7,3.1,3.5].forEach((t,i)=>{k.noise(t,{dur:.55,color:'pink',filter:'bandpass',f:[[0,450],[.5,1600]],gain:.025,a:.1});ping(t+.5,['C4','E4','G4'][i],.1);});
for(let i=0;i<6;i++)ping(5.1+i*.46,i%2?'G5':'C5',.045);
[10.6,11.15,11.7].forEach((t,i)=>ping(t,['C5','E5','G5'][i],.15));
['C5','E5','G5'].forEach((f,i)=>k.tone(12.3+i*.07,{f,type:'sine',dur:1.1,gain:.11,a:.015}));
k.tone(12.3,{f:'C3',type:'triangle',dur:1.4,gain:.07,a:.04});}
window.TECH_STUDIO={draw,scoreSound,duration:DURATION,width:1280,height:720,assets:()=>{}};window.DURATION=DURATION;window.scoreSound=scoreSound;
})();
