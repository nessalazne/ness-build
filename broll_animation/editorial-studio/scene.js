/* Original editorial demonstration. City image is a code-drawn illustration. */
(()=>{'use strict';const E=COLLAGE,DURATION=15;let art=null;
const p=(t,a,b)=>H.clamp((t-a)/(b-a));
function assets(){if(art)return art;
const city=E.treat(390,285,123,(c,w,h)=>{const g=c.createLinearGradient(0,0,0,h);g.addColorStop(0,'#e7e7e7');g.addColorStop(1,'#777');c.fillStyle=g;c.fillRect(0,0,w,h);c.fillStyle='#ddd';c.beginPath();c.arc(310,50,30,0,7);c.fill();const r=H.rng(73);for(let i=0;i<9;i++){const x=i*48-15,top=55+r()*95;c.fillStyle=i%2?'#454545':'#606060';c.fillRect(x,top,44,h-top);for(let y=top+14;y<h-30;y+=22)for(let xx=x+7;xx<x+39;xx+=13){c.fillStyle=r()>.35?'#aaa':'#333';c.fillRect(xx,y,6,11);}}c.fillStyle='#333';c.beginPath();c.moveTo(0,h);c.lineTo(w,h);c.lineTo(240,210);c.lineTo(180,210);c.closePath();c.strokeStyle='#bbb';c.lineWidth=3;c.beginPath();c.moveTo(210,214);c.lineTo(240,h);c.stroke();},{cell:4,mix:.38});
art={photo:E.makePrint(city,22),title:E.makeStrip('FOLLOW THE SOURCES','400 65px Anton',{seed:11,torn:[0,1,0,1],hl:'SOURCES'}),context:E.makeClipping({w:360,h:302,seed:37,kicker:'EDITORIAL STUDY / CONTEXT',headPx:29,head:['What does','it mean?'],deckPx:21,deck:['|Look at the context.|'],cols:2}),source:E.makeClipping({w:270,h:240,seed:51,kicker:'READING NOTES',headPx:25,head:['Where did','it start?'],deckPx:18,deck:['|Trace the source.|'],cols:2}),caption:E.makeStrip('A CITY IN MOTION','700 29px Oswald',{seed:14}),sourceLabel:E.makeStrip('SOURCE','700 28px Oswald',{seed:15,bg:E.RED,fg:E.CARD}),takeaway:E.makeStrip('Build a clearer picture.','700 34px Oswald',{seed:16,bg:E.INK,fg:E.CARD}),note:E.makeStrip('ILLUSTRATIVE EDITORIAL STUDY','700 19px Oswald',{seed:18})};return art;}
function draw(c,w,h,t){t=H.clamp(t,0,15);const A=assets(),q=E.q12(t),cam={x:H.lerp(-60,0,H.ease.inOut(p(t,2,9))),y:0,z:1+.025*Math.sin(Math.PI*p(t,0,15))};E.bgPaper(c,cam);
E.block(c,cam,.55,-330,10,440,340,-.055,E.RED,8,[1,0,1,0]);
E.putSpr(c,cam,.9,A.photo,-350,-5,-.04,1,q,.35,'slideL');
if(t>.9)E.place(c,cam,1,-350,-5,-.04,1,cc=>{E.tape(cc,-120,-155,90,27,-.4,12);if(t>1.2)E.tape(cc,145,135,85,25,-.4,13);});
E.putSpr(c,cam,1.15,A.title,0,-245,-.016,1,q,1.45,'drop',cc=>E.hilite(cc,A.title.hl,p(t,2.1,2.8),10));
E.putSpr(c,cam,1,A.caption,-350,175,.012,1,q,2.9,'drop');
E.putSpr(c,cam,1,A.context,65,-5,.035,1,q,3.8,'slideU',cc=>{if(t>4.2)E.tape(cc,60,-155,95,28,.15,29);E.hilite(cc,A.context.hl,p(t,5,5.8),16);});
E.place(c,cam,1.1,0,0,0,1,cc=>E.inkArrow(cc,E.quadPts(-110,150,-20,200,65,163),p(t,5.9,6.5),3,E.RED));
E.putSpr(c,cam,1.08,A.source,430,97,-.04,1,q,6.8,'slideR',cc=>{if(t>7.2)E.tape(cc,-10,-125,90,24,-.1,30);E.hilite(cc,A.source.hl,p(t,8.2,8.9),22);});
E.putSpr(c,cam,1.2,A.sourceLabel,430,-63,-.03,1,q,7.8,'drop');
E.place(c,cam,1.12,0,0,0,1,cc=>{E.inkArrow(cc,E.quadPts(240,80,270,125,290,130),p(t,9,9.7),3,E.RED);E.marker(cc,E.loopPts(430,-63,76,27,4),p(t,10,10.7),E.RED,4);});
E.putSpr(c,cam,1.15,A.takeaway,0,275,-.008,1,q,11.4,'slideU');
E.putSpr(c,cam,.9,A.note,-360,240,.01,1,q,12.2,'drop');
E.finish(c,t,.32);}
function scoreSound(k){k.bed('room',0,14.8,{gain:.14});
const place=t=>{k.noise(t,{dur:.1,color:'brown',filter:'lowpass',f:1500,gain:.22,a:.002});};
[.42,1.5,3,3.9,6.9,7.9,11.5,12.3].forEach(place);
[.9,1.2,4.2,7.2].forEach(t=>k.noise(t,{dur:.18,color:'pink',filter:'bandpass',f:1800,gain:.055,a:.01}));
[[2.1,2.8],[5,5.8],[5.9,6.5],[8.2,8.9],[9,9.7],[10,10.7]].forEach(([a,b])=>k.noise(a,{dur:b-a,color:'pink',filter:'bandpass',f:850,gain:.045,a:.03}));
k.tone(12.6,{f:'C5',type:'sine',dur:.6,gain:.065,a:.02});}
window.EDITORIAL_STUDIO={draw,scoreSound,duration:DURATION,width:1280,height:720,assets};window.DURATION=DURATION;window.scoreSound=scoreSound;
})();
