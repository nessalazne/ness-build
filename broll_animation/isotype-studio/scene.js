/* Original illustrative attendance lesson; no real-world survey data. */
(()=>{'use strict';const I=ISOTYPE,DURATION=15;
const rows=[{label:'GROUP A',n:4,y:282,start:3,col:I.BLUE},{label:'GROUP B',n:6,y:442,start:6,col:I.RED}];
const step=.42,land=t=>Math.ceil(t*12)/12;
let paper=null;
function draw(out,W,Hh,t){t=H.clamp(t,0,15);const ts=Math.floor(t*12)/12;const progress=(a,b)=>H.clamp((t-a)/(b-a));
if(!paper){paper=H.layer(W,Hh);H.paper(paper.getContext('2d'),W,Hh,I.PAPER,11,.02);}out.drawImage(paper,0,0);
const layer=I.inkLayer(W,Hh),c=layer.getContext('2d');
function text(s,x,y,size=30,color=I.INK,align='left',track=0){c.fillStyle=color;c.font=`700 ${size}px "Space Grotesk"`;I.spaced(c,s,x,y,track,align);}
function fade(a,b,fn){c.save();c.globalAlpha=progress(a,b);fn();c.restore();}
fade(.1,.6,()=>text('COUNT WITH PICTURES',80,101,52,I.INK,'left',2));
fade(.6,1,()=>text('Illustrative workshop attendance',82,143,27));
c.fillStyle=I.INK;c.fillRect(80,165,1120*H.ease.out(progress(.7,1.3)),3);
fade(1.2,2,()=>{c.fillStyle=I.INK;I.person(c,84,191,.8);text('= 10 people',122,222,29);text('ILLUSTRATIVE DATA',1198,222,23,I.INK,'right',1);});
rows.forEach((r,ri)=>{fade(r.start-.5,r.start,()=>text(r.label,83,r.y+55,29,r.col));
 let count=0;
 for(let j=0;j<r.n;j++){const start=land(r.start+j*step);if(ts<start)continue;count++;const impact=ts<start+1/12;const x=340+j*105,y=r.y;
 c.save();c.fillStyle=r.col;if(impact){c.translate(x+26,y+44);c.scale(1.12,1.12);c.translate(-x-26,-y-44);c.globalAlpha=.8;}I.person(c,x,y,2);c.restore();}
 if(count){text(String(count*10),1170,r.y+67,76,r.col,'right');}
 c.fillStyle='rgba(38,35,31,.2)';c.fillRect(80,r.y+113,1120*progress(r.start-.3,r.start+.3),1);
});
if(t>9){const a=progress(9,9.5);c.save();c.globalAlpha=a;c.strokeStyle=I.OCHRE;c.lineWidth=4;c.strokeRect(748,425,220,119);c.restore();}
fade(9.6,10.3,()=>{text('+20',1055,627,60,I.RED,'right');text('people',1077,627,28);});
if(t>9.3){c.fillStyle=I.OCHRE;I.flatArrow(c,858,551,950,591,5,progress(9.3,9.9),860,590);}
fade(10.5,11.4,()=>text('2 more symbols = 20 more people',80,622,30));
fade(12,12.7,()=>{c.fillStyle=I.INK;c.fillRect(80,650,1120,2);text('Repeat the symbol to show the quantity.',80,687,27);});
I.printInk(out,layer,W,Hh);I.lithoFinish(out,W,Hh,3);H.grain(out,W,Hh,.05,9+Math.floor(t*8));}
function scoreSound(k){k.bed('room',0,14.7,{gain:.1});
const stamp=t=>{k.noise(t,{dur:.075,color:'brown',filter:'lowpass',f:1400,gain:.32,a:.002});k.tone(t,{f:[[0,160],[.08,70]],type:'sine',dur:.11,gain:.13,a:.002});};
[.3,1.5].forEach(stamp);rows.forEach(r=>{for(let j=0;j<r.n;j++)stamp(land(r.start+j*step));});
k.noise(9,{dur:.5,color:'pink',filter:'bandpass',f:900,gain:.045,a:.06});stamp(9.75);
k.tone(12.4,{f:'C5',dur:.6,gain:.07,a:.02});}
window.ISOTYPE_STUDIO={draw,scoreSound,duration:DURATION,width:1280,height:720,assets:()=>{}};window.DURATION=DURATION;window.scoreSound=scoreSound;
})();
