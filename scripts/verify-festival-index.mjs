import fs from 'node:fs';

function loadCatalog(){
 let src=JSON.parse(fs.readFileSync('data/catalog/catalog.json','utf8'));
 for(const f of ['annual_1989_overlay.json','annual_1990_1994_overlay.json','annual_1995_1996_overlay.json','annual_1997_1999_overlay.json']){
  const p='data/catalog/'+f;
  if(fs.existsSync(p)){
   const extra=JSON.parse(fs.readFileSync(p,'utf8'));
   if(Array.isArray(extra)) src=src.concat(extra);
  }
 }
 return src;
}
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
function sim(a,b){
 const A=new Set(norm(a).split(' ').filter(x=>x.length>1)),B=new Set(norm(b).split(' ').filter(x=>x.length>1));
 if(!A.size||!B.size)return 0; let common=0; A.forEach(x=>{if(B.has(x))common++});
 return common/(A.size+B.size-common);
}
function makeIndex(rows,light=false){
 return rows.map((r,pos)=>({idx:light?r.i:pos,y:Number(r&&r.y)||0,d:norm(r&&r.d),titles:[r&&r.t,r&&r.ot,r&&r.original_title,r&&r.o,r&&r.en,r&&r.english_title,r&&r.e].filter(Boolean).map(norm)}));
}
function resolve(ft,index){
 const nd=norm(ft.director),nt=norm(ft.festival_title),queryTitles=[nt,...(ft.aliases||[]).map(norm).filter(Boolean)],fy=Number(ft.festival_year)||0,targetYear=ft.festival==='Oscar'?fy-1:fy;
 let best=-1,bestScore=-1;
 for(const x of index){
  const yearDiff=(targetYear&&x.y)?Math.abs(x.y-targetYear):99;
  let dirSim=0;
  if(nd&&x.d){if(x.d===nd)dirSim=1;else if(x.d.includes(nd)||nd.includes(x.d))dirSim=.9;else dirSim=sim(x.d,nd);}
  let titleSim=0;
  for(const t of x.titles)for(const q of queryTitles){
   let s=0;if(t===q)s=1;else if(t.includes(q)||q.includes(t))s=.88;else s=sim(t,q);if(s>titleSim)titleSim=s;
  }
  const strongIdentity=titleSim===1&&dirSim>=.8;
  const normalExact=titleSim===1&&yearDiff<=1;
  const oscarExact=!nd&&titleSim===1&&yearDiff<=2&&nt.length>=6;
  const fuzzyIdentity=titleSim>=.72&&dirSim>=.72&&yearDiff<=5;
  const directorAnchor=titleSim>=.55&&dirSim>=.95&&yearDiff<=3;
  const nearYearTitle=titleSim>=.88&&yearDiff<=1;
  if(!(strongIdentity||normalExact||oscarExact||fuzzyIdentity||directorAnchor||nearYearTitle))continue;
  const yearBonus=yearDiff===0?2:yearDiff===1?1:yearDiff===2?.25:0;
  const score=titleSim*10+dirSim*5+yearBonus;
  if(score>bestScore){bestScore=score;best=x.idx}
 }
 return best;
}
function decade(y){y=Number(y)||0;const start=y<1930?1891:Math.floor(y/10)*10,end=start===1891?1929:start+9;return start+'-'+end;}

const src=loadCatalog(), fullIndex=makeIndex(src);
const db=JSON.parse(fs.readFileSync('data/festivals/festivals.json','utf8'));
const cache=new Map();
function lightIndexFor(ft){
 const target=ft.festival==='Oscar'?Number(ft.festival_year)-1:Number(ft.festival_year);
 const key=decade(target);
 if(!cache.has(key)){
  const rows=JSON.parse(fs.readFileSync('data/catalog/festival-index/'+key+'.json','utf8'));
  cache.set(key,makeIndex(rows,true));
 }
 return cache.get(key);
}
const checks=[],mismatches=[];
for(const ed of (db.editions||[])){
 for(const f of (ed.films||[])){
  const ft={festival:ed.festival,festival_year:Number(ed.year),section:ed.section,festival_title:f.title,aliases:f.aliases||[],director:f.director,award:f.award};
  const full=resolve(ft,fullIndex),light=resolve(ft,lightIndexFor(ft));
  const row={festival:ed.festival,year:Number(ed.year),section:ed.section,title:f.title,director:f.director||'',full,light,fullPresent:full>=0,lightPresent:light>=0};
  checks.push(row);
  if(full!==light)mismatches.push(row);
 }
}
const c97=checks.filter(x=>x.festival==='Cannes'&&x.year===1997);
const report={
 generatedAt:new Date().toISOString(),
 totalChecks:checks.length,
 exactMatches:checks.length-mismatches.length,
 mismatchCount:mismatches.length,
 presentStateMismatchCount:mismatches.filter(x=>x.fullPresent!==x.lightPresent).length,
 mismatches:mismatches.slice(0,200),
 cannes1997:{
  total:c97.length,
  fullPresent:c97.filter(x=>x.fullPresent).length,
  lightPresent:c97.filter(x=>x.lightPresent).length,
  fullMissing:c97.filter(x=>!x.fullPresent).map(x=>x.title),
  lightMissing:c97.filter(x=>!x.lightPresent).map(x=>x.title),
  mismatches:c97.filter(x=>x.full!==x.light)
 }
};
fs.writeFileSync('data/catalog/festival-index/verification.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({totalChecks:report.totalChecks,mismatchCount:report.mismatchCount,presentStateMismatchCount:report.presentStateMismatchCount,cannes1997:report.cannes1997}));
if(report.presentStateMismatchCount>0) process.exitCode=2;
