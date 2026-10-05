import fs from 'node:fs';

let DATA=JSON.parse(fs.readFileSync('data/catalog/catalog.json','utf8'));
for(const f of ['annual_1989_overlay.json','annual_1990_1994_overlay.json','annual_1995_1996_overlay.json','annual_1997_1999_overlay.json']){
 const p='data/catalog/'+f;
 if(fs.existsSync(p)){
  const extra=JSON.parse(fs.readFileSync(p,'utf8'));
  if(Array.isArray(extra))DATA=DATA.concat(extra);
 }
}
const DB=JSON.parse(fs.readFileSync('data/festivals/festivals.json','utf8'));
const MAP=JSON.parse(fs.readFileSync('data/catalog/festival-matches.json','utf8')).matches||{};
function normFest(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()}
function festTokenSimilarity(a,b){
 const A=new Set(normFest(a).split(' ').filter(x=>x.length>1)),B=new Set(normFest(b).split(' ').filter(x=>x.length>1));
 if(!A.size||!B.size)return 0;
 let common=0;A.forEach(x=>{if(B.has(x))common++});
 return common/(A.size+B.size-common);
}
const FESTIVAL_INDEX=DATA.map((r,idx)=>({
 idx,
 y:Number(r&&r.y)||0,
 d:normFest(r&&r.d),
 titles:[r&&r.t,r&&r.ot,r&&r.original_title,r&&r.en,r&&r.english_title].filter(Boolean).map(normFest)
}));
function resolveFestivalMatch(ft){
 const nd=normFest(ft.director),nt=normFest(ft.festival_title),aliasTitles=(ft.aliases||[]).map(normFest).filter(Boolean),queryTitles=[nt,...aliasTitles],fy=Number(ft.festival_year)||0,targetYear=ft.festival==='Oscar'?fy-1:fy;
 let best=-1,bestScore=-1;
 for(const x of FESTIVAL_INDEX){
   const yearDiff=(targetYear&&x.y)?Math.abs(x.y-targetYear):99;
   let dirSim=0;
   if(nd&&x.d){
     if(x.d===nd)dirSim=1;
     else if(x.d.includes(nd)||nd.includes(x.d))dirSim=.9;
     else dirSim=festTokenSimilarity(x.d,nd);
   }
   let titleSim=0;
   for(const t of x.titles){
     if(!t)continue;
     for(const q of queryTitles){
       if(!q)continue;
       let s=0;
       if(t===q)s=1;
       else if(t.includes(q)||q.includes(t))s=.88;
       else s=festTokenSimilarity(t,q);
       if(s>titleSim)titleSim=s;
     }
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
const key=(festival,year,title,director)=>JSON.stringify([String(festival||''),Number(year)||0,String(title||''),String(director||'')]);
const checks=[];
for(const ed of (DB.editions||[]).filter(e=>e.festival==='Cannes'&&Number(e.year)===1997)){
 for(const f of ed.films||[]){
  const ft={festival:'Cannes',festival_year:1997,section:ed.section,festival_title:f.title,aliases:f.aliases||[],director:f.director};
  const literal=resolveFestivalMatch(ft);
  const hit=MAP[key('Cannes',1997,f.title,f.director)];
  const mapped=hit?hit.i:-1;
  checks.push({section:ed.section,title:f.title,literal,mapped,same:literal===mapped});
 }
}
for(const ed of (DB.editions||[]).filter(e=>e.festival==='Berlín'&&Number(e.year)===2024)){
 for(const f of ed.films||[])if(f.title==='My Favourite Cake'){
  const ft={festival:'Berlín',festival_year:2024,section:ed.section,festival_title:f.title,aliases:f.aliases||[],director:f.director};
  const literal=resolveFestivalMatch(ft),hit=MAP[key('Berlín',2024,f.title,f.director)],mapped=hit?hit.i:-1;
  checks.push({section:ed.section,title:f.title,literal,mapped,same:literal===mapped});
 }
}
const bad=checks.filter(x=>!x.same);
console.log(JSON.stringify({checks:checks.length,mismatches:bad.length,bad,cannes1997:{present:checks.filter(x=>x.title!=='My Favourite Cake'&&x.literal>=0).length,missing:checks.filter(x=>x.title!=='My Favourite Cake'&&x.literal<0).map(x=>x.title)},myFavouriteCake:checks.find(x=>x.title==='My Favourite Cake')}));
if(bad.length)process.exit(2);
