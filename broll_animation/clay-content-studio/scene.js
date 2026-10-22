/* Original scene and score; material primitives are adapted from the supplied DOCX. */
(() => {
'use strict';
const {roundedPoly,puffy,sphere,contactShadow}=window.CLAY;
const DURATION=20, W=1280, HH=720, TAU=Math.PI*2;
const hex=H.hex, clamp=H.clamp, mix=H.lerp;
const palettes={
 butter:['#fff9d5','#ffe49a','#efbc63','#d5a34d','#a77838'],
 lavender:['#f1eaff','#c9b7f4','#ac91db','#9d80cf','#7352a7'],
 coral:['#ffe6de','#f9b6a6','#e99787','#d88a7c','#ae6258'],
 mint:['#edfff5','#b7dfcd','#8fc5b0','#7bb59e','#4a8e78'],
 blue:['#eaf6ff','#b5d5eb','#90b7d5','#7ca3c4','#547e9e'],
 white:['#ffffff','#faf4ee','#e8ddd9','#d9c9c8','#b09aaf']
};
const color='#534169', ink='#55406d';
const sprites=new Map();
const phase=(t,a,b)=>clamp((t-a)/(b-a));
const smooth=(t,a,b)=>H.ease.inOut(phase(t,a,b));
const out=(t,a,b)=>H.ease.out(phase(t,a,b));
const rect=(w,h,r)=>roundedPoly([[-w/2,-h/2,r],[w/2,-h/2,r],[w/2,h/2,r],[-w/2,h/2,r]]);
function clay(c,path,bb,x,y,palette='white',options={}) {
 const p=palettes[palette];
 puffy(c,{x,y,s:1,rot:0,path,bb,face:p.slice(0,3).map(hex),side:p.slice(3).map(hex),ext:[8,13],spec:[bb[0]*.5,bb[1]*.65,Math.max(25,(bb[2]-bb[0])*.32),Math.max(15,(bb[3]-bb[1])*.12)],...options});
}
function slab(c,x,y,w,h,r,palette,options={}) {clay(c,rect(w,h,r),[-w/2,-h/2,w/2,h/2],x,y,palette,options);}
function lettering(c,value,x,y,size=30,col=ink,weight=600){
 c.save();c.textAlign='center';c.textBaseline='middle';c.font=`${weight} ${size}px Fredoka`;
 c.fillStyle='#ffffff8c';c.fillText(value,x,y+2);c.fillStyle=col;c.fillText(value,x,y);c.restore();
}
function line(c,points,stroke,width=8){c.save();c.strokeStyle=stroke;c.lineWidth=width;c.lineCap='round';c.lineJoin='round';c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();c.restore();}
function star(r){const points=[];for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,rad=i%2?r*.48:r;points.push([Math.cos(a)*rad,Math.sin(a)*rad,Math.min(10,r*.15)]);}return roundedPoly(points);}
function bead(c,x,y,r,palette){const p=palettes[palette];sphere(c,x,y,r,...p.slice(0,3).map(hex));}
function sprite(key,w,h,fn){
 if(sprites.has(key))return sprites.get(key);
 const canvas=document.createElement('canvas');canvas.width=w*2;canvas.height=h*2;
 const ctx=canvas.getContext('2d');ctx.scale(2,2);ctx.translate(w/2,h/2);fn(ctx);
 const value={canvas,w,h};sprites.set(key,value);return value;
}
function stamp(c,key,x,y,scale=1,rotation=0){
 const s=assets()[key];c.save();c.translate(x,y);c.rotate(rotation);c.scale(scale,scale);c.drawImage(s.canvas,-s.w/2,-s.h/2,s.w,s.h);c.restore();
}
let baked=null;
function assets(){
 if(baked)return baked;
 baked={
  idea:sprite('idea',320,340,c=>{
   slab(c,0,0,218,242,52,'butter',{ext:[12,20],rot:-.035});
   clay(c,star(65),[-65,-65,65,65],-3,-28,'white',{ext:[5,10]});
   lettering(c,'IDEA',0,79,35,ink,700);
  }),
  studio:sprite('studio',590,410,c=>{
   slab(c,-130,135,100,49,23,'lavender',{ext:[4,9]});slab(c,130,135,100,49,23,'lavender',{ext:[4,9]});
   slab(c,0,0,392,248,62,'lavender',{ext:[22,28],spec:[-120,-80,135,35]});
   slab(c,0,4,254,142,36,'white',{ext:[5,9]});
   slab(c,-200,18,70,92,25,'lavender',{ext:[3,10]});
   slab(c,-211,18,30,62,13,'blue',{ext:[2,3],spec:null});
   slab(c,211,18,68,90,24,'lavender',{ext:[4,10]});
   slab(c,228,18,26,59,11,'coral',{ext:[2,3],spec:null});
   lettering(c,'RESHAPE',0,5,37,ink,700);
   lettering(c,'CONTENT STUDIO',0,96,20,ink,600);
   [-84,0,84].forEach((x,i)=>{slab(c,x,-137,53,61,24,['coral','butter','mint'][i],{ext:[5,9]});bead(c,x,-146,12,'white');});
  }),
  video:sprite('video',290,345,c=>{
   slab(c,0,0,210,250,44,'coral',{ext:[12,18]});
   slab(c,-3,-12,158,150,30,'white',{ext:[4,8]});
   const triangle=roundedPoly([[-23,-35,11],[39,0,12],[-23,35,11]]);
   clay(c,triangle,[-25,-35,40,35],-3,-12,'coral',{ext:[5,8]});
   line(c,[[-60,92],[60,92]],'#fff4eb',8);bead(c,-36,92,9,'butter');
  }),
  carousel:sprite('carousel',310,345,c=>{
   slab(c,20,-15,202,226,32,'blue',{ext:[7,12],rot:.09});
   slab(c,7,-6,202,226,32,'mint',{ext:[7,12],rot:-.045});
   slab(c,-9,6,202,226,32,'white',{ext:[9,16]});
   slab(c,-9,-28,148,102,20,'mint',{ext:[3,5]});
   bead(c,-32,-40,22,'butter');clay(c,star(28),[-28,-28,28,28],18,-13,'white',{ext:[2,4]});
   [-40,-9,22].forEach((x,i)=>bead(c,x,80,i===0?9:6,i===0?'mint':'lavender'));
   line(c,[[-66,40],[44,40]],'#c4b3d7',8);
  }),
  email:sprite('email',310,330,c=>{
   slab(c,0,0,222,180,38,'blue',{ext:[13,19]});
   const flap=roundedPoly([[-96,-65,16],[96,-65,16],[0,18,18]]);
   clay(c,flap,[-96,-65,96,18],0,0,'white',{ext:[3,7],spec:[-50,-48,75,15]});
   line(c,[[-88,65],[-26,15]],'#90b6d2',5);line(c,[[88,65],[26,15]],'#90b6d2',5);
   bead(c,0,13,23,'butter');clay(c,star(12),[-12,-12,12,12],0,11,'white',{ext:[1,2],spec:null});
  }),
  article:sprite('article',290,345,c=>{
   slab(c,0,0,202,250,34,'lavender',{ext:[11,18]});
   slab(c,-3,-3,170,218,26,'white',{ext:[3,6]});
   line(c,[[-55,-75],[42,-75]],'#8f76b2',11);
   line(c,[[-55,-48],[15,-48]],'#c4b3d7',7);
   slab(c,-3,6,121,64,15,'butter',{ext:[2,4]});
   line(c,[[-54,64],[46,64]],'#b3a2c9',7);line(c,[[-54,85],[20,85]],'#c8b8d9',7);
  }),
  check:sprite('check',90,90,c=>{bead(c,0,0,30,'mint');line(c,[[-12,0],[-3,9],[15,-11]],'#fffdf5',7);}),
 };
 return baked;
}
function spring(t,start,duration=.85){const p=phase(t,start,start+duration);if(p===0)return {k:0,sx:0,sy:0,y:85};const wiggle=Math.exp(-6*p)*Math.sin(p*12);const k=p===1?1:1-Math.exp(-7*p)*Math.cos(p*11);return {k,sx:k*(1+wiggle*.19),sy:k*(1-wiggle*.19),y:(1-H.ease.out(p))*85};}
function pop(c,t,start,x,y,key,scale=1,rot=0){const p=spring(t,start);if(!p.k)return;c.save();c.translate(x,y-p.y);c.scale(Math.max(.01,p.sx),Math.max(.01,p.sy));stamp(c,key,0,0,scale,rot);c.restore();}
function camera(t){
 const keys=[[0,420,1.04],[1.9,420,1.04],[4.5,1110,1.05],[6.4,1160,1.05],[8.4,1640,.97],[11.8,2150,.88],[14,2220,.84],[16,2220,1.0],[20,2220,1.0]];
 for(let i=1;i<keys.length;i++)if(t<=keys[i][0]){const a=keys[i-1],b=keys[i],p=smooth(t,a[0],b[0]);return {x:mix(a[1],b[1],p),z:mix(a[2],b[2],p)};}
 return {x:2220,z:1};
}
function tube(c,from,control,to,progress,palette='lavender',width=14){
 if(progress<=0)return;
 const points=[];for(let i=0;i<=40;i++){const u=i/40*clamp(progress),q=1-u;points.push([q*q*from[0]+2*q*u*control[0]+u*u*to[0],q*q*from[1]+2*q*u*control[1]+u*u*to[1]]);}
 const p=palettes[palette];line(c,points.map(([x,y])=>[x+4,y+7]),'#9a83b92d',width+4);line(c,points,p[4],width);line(c,points.map(([x,y])=>[x-1,y-2]),p[1],width*.78);line(c,points.map(([x,y])=>[x-2,y-4]),'#ffffffa6',width*.18);
}
function softBackground(c,t,cam){
 const g=c.createLinearGradient(0,0,0,HH);g.addColorStop(0,'#f3eef8');g.addColorStop(.55,'#e9dff0');g.addColorStop(.7,'#e5d9eb');g.addColorStop(1,'#f6ece9');c.fillStyle=g;c.fillRect(0,0,W,HH);
 const halo=c.createRadialGradient(560,220,20,560,220,650);halo.addColorStop(0,'#fffdf5cc');halo.addColorStop(1,'#fffdf500');c.fillStyle=halo;c.fillRect(0,0,W,HH);
 const r=H.rng(113);
 for(let i=0;i<13;i++){
  const wx=r.range(-100,3300),x=640+(wx-cam.x)*cam.z*.4,y=r.range(180,620),rad=r.range(6,18);
  if(x<-40||x>1320)continue;
  c.save();c.globalAlpha=.45;c.filter='blur(2px)';bead(c,x,y+Math.sin(t*.7+i)*5,rad,['mint','coral','butter','lavender'][i%4]);c.restore();
 }
}
const outputs=[
 {key:'video',label:'Short video',x:1815,pal:'coral',start:7.05,angle:-.045},
 {key:'carousel',label:'Carousel',x:2085,pal:'mint',start:8.65,angle:.035},
 {key:'email',label:'Email',x:2355,pal:'blue',start:10.25,angle:-.035},
 {key:'article',label:'Article',x:2625,pal:'lavender',start:11.85,angle:.05}
];
let grain=null;
function finish(c){
 if(!grain){grain=document.createElement('canvas');grain.width=grain.height=192;const g=grain.getContext('2d'),im=g.createImageData(192,192),r=H.rng(204);for(let i=0;i<im.data.length;i+=4){const v=r()>.5?255:50;im.data[i]=im.data[i+1]=im.data[i+2]=v;im.data[i+3]=Math.round(r()*5);}g.putImageData(im,0,0);}
 c.save();c.fillStyle=c.createPattern(grain,'repeat');c.fillRect(0,0,W,HH);H.vignette(c,W,HH,.08,'134,104,150');c.restore();
}
function heading(c,t){
 const words=[['One idea.',0,2.45],['Give it a new shape.',2.65,4.65],['Keep the core.',4.85,7.05],['Change the format.',7.25,13.4],['One idea. Four formats.',13.65,20.5]];
 words.forEach(([text,a,b])=>{
  const alpha=out(t,a,a+.35)*(1-smooth(t,b-.3,b));if(alpha<=0)return;c.save();c.globalAlpha=alpha;
  lettering(c,text,640,91+(1-out(t,a,a+.65))*17,text.length>22?58:66,color,600);c.restore();
 });
}
function explainer(c,width,height,t){
 t=clamp(t,0,DURATION);assets();c.save();c.scale(width/W,height/HH);
 const cam=camera(t);softBackground(c,t,cam);
 c.save();c.translate(640,355);c.scale(cam.z,cam.z);c.translate(-cam.x,-355);
 // Connective floor ribbon establishes a single continuous workshop.
 if(t>2)tube(c,[510,503],[800,555],[1125,480],out(t,2,4.4),'white',18);
 // Main idea travels into the studio, preserving its identity until the entry slot.
 const travel=smooth(t,2.4,4.3),ix=mix(420,1004,travel),iy=385-Math.sin(travel*Math.PI)*76;
 if(t<4.5){
  contactShadow(c,ix+10,540,90*(1-travel*.45),15,.2,15);
  c.save();c.globalAlpha=1-smooth(t,4.12,4.5);pop(c,t,.1,ix,iy,'idea',mix(1.05,.39,travel),-.065+travel*.1);c.restore();
 }
 // Studio body breathes while processing; outputs emerge from its right-hand port.
 if(t>1.75&&t<14.2){
  const machineIn=out(t,1.75,3.1),processing=phase(t,4.5,7.0),squish=Math.sin(processing*Math.PI*6)*Math.sin(processing*Math.PI)*.022;
  contactShadow(c,1185,565,212,22,.22*machineIn,18);
  c.save();c.translate(1170,400+(1-machineIn)*120);c.scale(machineIn*(1+squish),machineIn*(1-squish));stamp(c,'studio',0,0);c.restore();
  for(let j=0;j<3;j++){
   const on=out(t,4.7+j*.65,4.9+j*.65);if(on){c.save();c.globalAlpha=on;bead(c,1124+j*47,447,9,['coral','butter','mint'][j]);c.restore();}
  }
  if(t>4.5&&t<7.0){const p=phase(t,4.5,7);for(let j=0;j<3;j++){const x=1165+Math.cos(p*TAU+j*TAU/3)*50,y=378+Math.sin(p*TAU+j*TAU/3)*17;bead(c,x,y,7,'butter');}}
 }
 c.save();c.globalAlpha=1-smooth(t,13.5,14.5);
 outputs.forEach(item=>tube(c,[1390,495],[item.x-200,560],[item.x,498],out(t,item.start,item.start+1.4),item.pal,10));
 c.restore();
 outputs.forEach((item,i)=>{
  if(t<item.start)return;
  const progress=out(t,item.start,item.start+1.4),x=mix(1403,item.x,progress),y=mix(400,410,progress)-Math.sin(progress*Math.PI)*94;
  const bob=Math.sin(t*1.35+i*1.4)*3.5*smooth(t,item.start+1,item.start+1.7),scale=mix(.18,1,progress);
  contactShadow(c,x+10,560,95*scale,14*scale,.2*progress,15);
  stamp(c,item.key,x,y+bob,scale,item.angle*progress+Math.sin(progress*Math.PI)*.13);
  if(progress>.82){c.save();c.globalAlpha=out(t,item.start+1,item.start+1.5);lettering(c,item.label,item.x,598,31);c.restore();}
  const checked=out(t,15.6+i*.16,16.1+i*.16);if(checked)stamp(c,'check',item.x+77,309,checked*.8);
 });
 // Return the same idea token above the outputs to explain the relation.
 const summary=out(t,13.65,14.55);
 if(summary){
  outputs.forEach((item,i)=>tube(c,[2220,239],[item.x,240],[item.x,285],out(t,14.4+i*.19,15.25+i*.19),item.pal,10));
  pop(c,t,13.65,2220,191,'idea',.43,-.03);
 }
 c.restore();
 heading(c,t);
 if(t>16.3){c.save();c.globalAlpha=out(t,16.3,17);lettering(c,'Shape the format. Keep the idea.',640,668,31,color,600);c.restore();}
 // Foreground edge bokeh gives the wide stage depth without blocking the story.
 c.save();c.filter='blur(13px)';bead(c,-50+Math.sin(t*.3)*7,705,88,'mint');bead(c,1345,680+Math.sin(t*.4)*6,120,'lavender');c.restore();
 finish(c);c.restore();
}
function scoreSound(k){
 const landing=(time,note,gain=1,pan=0)=>{
  const f=k.hz(note);
  k.tone(time,{f:[[0,f*.7],[.045,f*1.15],[.2,f]],dur:.23,type:'sine',gain:.2*gain,a:.004,pan});
  k.tone(time+.13,{f:[[0,f*.94],[.1,f]],dur:.14,gain:.055*gain,a:.008,pan});
  k.noise(time,{dur:.065,color:'pink',filter:'lowpass',f:880,gain:.11*gain,a:.004,pan});
 };
 const glide=(a,b,pan=0)=>k.noise(a,{dur:b-a,color:'pink',filter:'bandpass',f:[[0,240],[(b-a)*.5,520],[b-a,290]],q:.65,gain:.035,a:(b-a)*.45,pan});
 k.bed('room',0,19.7,{gain:.12});
 k.music('pad',.2,18.7,{bpm:90,gain:.24,chords:[['C4','E4','G4','B4'],['A3','C4','E4','G4'],['F3','A3','C4','E4'],['G3','B3','D4','F4'],['C4','E4','G4','B4']]});
 landing(.37,'C4',1.15,-.2);k.play('ding',.85,{f:'G5',gain:.22,pan:0});
 glide(2.35,4.2,-.2);landing(4.22,'G3',.7,-.3);
 [4.9,5.55,6.2].forEach((t,i)=>landing(t,['C4','E4','G4'][i],.42,(i-1)*.2));
 outputs.forEach((item,i)=>{glide(item.start,item.start+1.05,(i-1.5)*.22);landing(item.start+1.14,['C4','E4','G4','B4'][i],.85,(i-1.5)*.3);});
 landing(14.0,'C5',.7,0);
 outputs.forEach((item,i)=>k.play('tick',15.0+i*.19,{f:1400+i*140,gain:.12,pan:(i-1.5)*.25}));
 ['C5','E5','G5'].forEach((note,i)=>k.play('ding',16.45+i*.07,{f:note,gain:.25-i*.035,pan:(i-1)*.2}));
 k.tone(16.45,{f:'C3',type:'triangle',dur:1.3,gain:.09,a:.025});
}
window.CLAY_STUDIO={draw:explainer,scoreSound,duration:DURATION,width:W,height:HH,assets};
window.DURATION=DURATION;window.scoreSound=scoreSound;
})();
