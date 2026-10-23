/* Original fifteen-second scene. The paper geometry/material engine is adapted from the supplied DOCX. */
(()=>{
'use strict';
const P=window.PAPER, DURATION=15, W=1280, HEIGHT=720;
const clamp=H.clamp, lerp=H.lerp, smooth=(t,a,b)=>H.ease.inOut(clamp((t-a)/(b-a)));
const BEATS={plan:[0,2.0],walls:[1.7,5.2],roof:[5.3,8.1],details:[8.2,11.1],open:[11.2,15]};
const paint={paper:'#f5edd9',ink:'#243b35',teal:'#347c70',mint:'#b3c4a5',orange:'#d97142',gold:'#e5b652',blue:'#6b9ca8'};
const qtime=t=>Math.floor(t*12+1e-6)/12;
function fill(c,w,h,color){c.fillStyle=color;c.fillRect(0,0,w,h);}
function dashed(c,x,y,x2,y2){P.dots(c,x,y,x2,y2,'#56624b88',.9,[4,4]);}
function printWall(kind){return(c,w,h)=>{
 fill(c,w,h,paint.paper);c.fillStyle='#d4d0b4';c.fillRect(0,h-16,w,16);
 if(kind==='front'){
  c.fillStyle=paint.teal;c.fillRect(w*.08,h*.08,w*.84,h*.23);
  P.fitTxt(c,'IDEA STUDIO',w/2,h*.2,28,w*.76,'#fff8df','"Space Grotesk"',700);
  c.fillStyle=paint.orange;c.fillRect(w*.42,h*.42,w*.21,h*.58);
  c.fillStyle='#f6cf86';c.fillRect(w*.45,h*.46,w*.15,h*.27);
  c.fillStyle=paint.ink;c.beginPath();c.arc(w*.59,h*.8,3,0,7);c.fill();
  for(const x of [w*.1,w*.71]){
   c.fillStyle=paint.teal;c.fillRect(x,h*.43,w*.18,h*.39);
   c.fillStyle='#b1d5d0';c.fillRect(x+4,h*.43+4,w*.18-8,h*.39-8);
   c.strokeStyle=paint.paper;c.lineWidth=2;c.beginPath();c.moveTo(x+w*.09,h*.43);c.lineTo(x+w*.09,h*.82);c.moveTo(x,h*.63);c.lineTo(x+w*.18,h*.63);c.stroke();
  }
 }else{
  c.fillStyle=paint.teal;c.fillRect(w*.15,h*.19,w*.7,h*.1);
  for(let x=w*.16;x<w*.8;x+=w*.35){c.fillStyle='#a4c9c1';c.fillRect(x,h*.42,w*.25,h*.35);c.strokeStyle=paint.teal;c.lineWidth=3;c.strokeRect(x,h*.42,w*.25,h*.35);}
 }
 dashed(c,4,4,w-4,4);P.partNo(c,kind==='front'?'F-01':'S-02',5,h-6);
};}
const printTop=(c,w,h)=>{fill(c,w,h,paint.paper);dashed(c,6,h/2,w-6,h/2);P.txt(c,'FOLD',w/2,h/2,12,'#848b74','center','"Space Mono"');};
function roofPrint(c,w,h){
 fill(c,w,h,paint.orange);
 c.strokeStyle='#a94f2c66';c.lineWidth=.7;
 for(let y=10;y<h;y+=13){c.beginPath();c.moveTo(0,y);c.lineTo(w,y);c.stroke();}
 for(let x=12;x<w;x+=18){c.beginPath();c.moveTo(x,0);c.lineTo(x,h);c.stroke();}
 dashed(c,4,4,w-4,4);P.partNo(c,'R-03',5,h-6,'#ffe8c3');
}
function roof(t){
 if(t<BEATS.roof[0])return[];
 const fold=smooth(t,5.45,7.1),drop=10*(1-smooth(t,5.3,7.85)),h=18+drop,ridge=h+9*fold,w=17,z=13;
 const faces=[
  P.fromPts([[-w,h,-z],[0,ridge,-z],[0,ridge,z],[-w,h,z]],[-.5,1,0],{grp:500,col:paint.orange,print:roofPrint}),
  P.fromPts([[0,ridge,-z],[w,h,-z],[w,h,z],[0,ridge,z]],[.5,1,0],{grp:500,col:paint.orange,print:roofPrint})
 ];
 if(fold>.02){for(const zz of [-11,11])faces.push(P.fromPts([[-15,h,zz],[15,h,zz],[0,ridge,zz]],[0,0,Math.sign(zz)],{grp:500,col:paint.paper,fl:false}));}
 return faces;
}
function awning(t){
 if(t<8.25)return[];
 const p=smooth(t,8.25,9.2),z=-11,drop=5*(1-p),faces=[];
 const pr=(c,w,h)=>{fill(c,w,h,paint.paper);for(let x=0;x<w;x+=w/8){c.fillStyle=paint.teal;c.fillRect(x,0,w/16,h);}dashed(c,0,h-2,w,h-2);};
 faces.push(P.fromPts([[-13,12.4+drop,z],[13,12.4+drop,z],[13,10.5+drop,z-4*p],[-13,10.5+drop,z-4*p]],[0,1,-.5],{grp:501,col:paint.teal,print:pr}));
 faces.push(P.fromPts([[-13,10.5+drop,z-4*p],[13,10.5+drop,z-4*p],[13,8.8+drop,z-4*p],[-13,8.8+drop,z-4*p]],[0,0,-1],{grp:501,col:paint.paper,print:pr}));
 return faces;
}
function tree(t,x,z,start,id){
 if(t<start)return[];
 const scale=smooth(t,start,start+.65),f=[];
 f.push(...P.xf(P.box({w:1.5,d:1.5,h:3,col:'#bd8d5e',tabs:false}),[0,0,1.2]));
 const outline=[[-6,3],[0,16],[6,3]];
 const crown=P.prism(outline,.35,{o:[0,0,-.1],ax:[0,0,1],u:[1,0,0],v:[0,1,0]},paint.teal,null,paint.teal);
 f.push(...crown);
 f.push(...P.box({w:5,d:5,h:1.1,col:paint.gold,tabs:false}));
 return P.place(f,id,t,x,0,z,.12,Math.max(.001,scale));
}
const labelPrint=(text,col)=>(c,w,h)=>{fill(c,w,h,paint.paper);c.fillStyle=col;c.fillRect(0,0,w,h*.17);P.fitTxt(c,text,w/2,h*.61,26,w*.9,paint.ink,'"Space Grotesk"');P.partNo(c,'PAPER / 02',3,h-3);};
function scene(t){
 P.reset();const q=qtime(t),F=[];
 const fold=smooth(q,BEATS.walls[0],BEATS.walls[1]);
 const yaw=lerp(.16,-.23,smooth(t,5.5,12));
 const model=[];
 model.push(...P.box({w:30,d:22,h:18,f:fold,col:{top:paint.paper,front:paint.paper,side:paint.paper,bottom:paint.paper},pr:{top:printTop,front:printWall('front'),right:printWall('right'),left:printWall('left'),back:printWall('back')},gap:'left',gapAmt:.012}));
 model.push(...roof(q),...awning(q));
 F.push(...P.place(model,1,q,0,0,1,yaw));
 F.push(...tree(q,-25,8,9.1,6),...tree(q,25,12,9.65,7));
 if(q>10.2){
  const pr=labelPrint('OPEN',paint.orange);
  F.push(...P.place(P.tent({w:14,h:7,a:smooth(q,10.2,11.0),pf:pr,pb:labelPrint('HELLO',paint.teal)}),8,q,23,0,-17,-.35));
 }
 // A small route of folded cardstock connects the workbench to the finished object.
 if(t>10.8)F.push(...P.strip(P.bez([-28,-20],[-20,-27],[-10,-26],[-3,-17]),smooth(q,10.8,12.0),{w:2.2,head:3.3,col:paint.gold}));
 F.push(...P.xf(P.ruler(49),[44,0,0],1.4));
 F.push(...P.xf(P.knife(),[-38,0,-4],.85));
 F.push(...P.xf(P.glueStick(),[36,0,19],.1));
 return F;
}
function title(c,words,sub,t,a,b){
 const alpha=smooth(t,a,a+.3)*(1-smooth(t,b-.25,b));if(alpha<=0)return;
 c.save();c.globalAlpha=alpha;
 c.fillStyle='#f6f0df';c.shadowColor='#14281c66';c.shadowBlur=16;c.shadowOffsetY=7;
 c.beginPath();c.roundRect(282,30,716,100,4);c.fill();c.shadowBlur=0;c.shadowOffsetY=0;
 c.fillStyle=paint.orange;c.fillRect(282,30,8,100);
 P.txt(c,words,640,71,45,paint.ink,'center','"Space Grotesk"',700);
 P.txt(c,sub,640,109,14,'#697362','center','"Space Mono"',700);
 c.restore();
}
function draw(c,w,h,t){
 t=clamp(t,0,DURATION);
 const keys=[[0,0,-11,155,1.03,0],[1.4,0,-11,154,1.03,0],[5.2,0,0,124,.81,7],[8.2,1,1,115,.72,10],[11.3,2,0,111,.69,10],[13.4,2,0,108,.69,10],[15,2,0,108,.69,10]];
 const k=P.camAt(keys,t),cam=P.makeCam(k[0],k[1],k[2],k[3],w,h,k[4]);
 P.renderScene(c,w,h,cam,scene(t),qtime(t));
 // Screen-space labels stay readable while the camera moves through the physical set.
 c.save();c.scale(w/W,h/HEIGHT);
 title(c,'Start with a flat plan.','01 / THE TEMPLATE',t,0,2.2);
 title(c,'Fold the walls.','02 / FORM TAKES SHAPE',t,2.3,5.25);
 title(c,'Give it a roof.','03 / FIT THE PIECES',t,5.4,8.2);
 title(c,'Make it yours.','04 / ADD THE DETAILS',t,8.35,11.2);
 title(c,'Bring the idea to life.','05 / A LITTLE PAPER STUDIO',t,11.35,15.5);
 if(t>12){c.save();c.globalAlpha=smooth(t,12,12.5);c.fillStyle='#f6f0df';c.shadowColor='#10261c77';c.shadowBlur=10;c.beginPath();c.roundRect(346,633,588,55,4);c.fill();c.shadowBlur=0;P.txt(c,'PLAN  →  FOLD  →  BUILD',640,662,26,paint.ink,'center','"Space Grotesk"');c.restore();}
 c.restore();
}
function scoreSound(k){
 const snap=t=>Math.ceil(t*12)/12;
 const fold=(t,pan=0)=>{t=snap(t);k.noise(t,{dur:.32,color:'pink',filter:'bandpass',f:[[0,1800],[.13,3300],[.32,1300]],q:.7,gain:.16,a:.04,pan});k.noise(t+.27,{dur:.035,color:'brown',filter:'lowpass',f:700,gain:.14,pan});};
 const setDown=(t,f,pan=0)=>{t=snap(t);k.tone(t,{f:[[0,f],[.08,f*.62]],type:'triangle',dur:.1,gain:.12,pan});k.noise(t,{dur:.085,color:'brown',filter:'lowpass',f:900,gain:.2,a:.004,pan});};
 k.bed('room',0,14.8,{gain:.13});
 k.noise(.1,{dur:.5,color:'pink',filter:'highpass',f:1600,gain:.08,a:.04});
 [2.0,2.65,3.3,4.0].forEach((t,i)=>fold(t,(i-1.5)*.16));setDown(5.0,240);
 fold(5.65,-.2);fold(6.45,.2);setDown(7.85,310,.1);
 fold(8.55,-.05);setDown(9.2,400,-.4);setDown(9.75,460,.4);fold(10.45,.35);
 [10.9,11.15,11.4,11.65].forEach((t,i)=>k.play('tick',snap(t),{f:1900+i*130,gain:.15,pan:-.4+i*.15}));
 ['C5','E5','G5'].forEach((n,i)=>k.play('ding',snap(12.1+i*.08),{f:n,gain:.14,pan:(i-1)*.15}));
}
window.PAPER_STUDIO={draw,scoreSound,duration:DURATION,assets:()=>{},width:W,height:HEIGHT};
window.DURATION=DURATION;window.scoreSound=scoreSound;
})();
