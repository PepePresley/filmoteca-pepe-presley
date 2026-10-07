import fs from 'node:fs';

function loadCatalog(){
 let src=JSON.parse(fs.readFileSync('data/catalog/catalog.json','utf8'));
 const dir='data/catalog';
 const files=fs.readdirSync(dir).filter(f=>/^annual_.*_overlay\.json$/.test(f)).sort();
 for(const f of files){
  const p=dir+'/'+f;
  const extra=JSON.parse(fs.readFileSync(p,'utf8'));
  if(!Array.isArray(extra))continue;

  // Annual masters named in the form Catalogo_Telegram_YYYY replace any
  // older rows of that same year in the base catalog. Legacy overlays keep
  // their historical additive behaviour.
  const masterYears=new Set(
   extra
    .filter(r=>/^Catalogo_Telegram_\d{4}$/.test(String(r&&r.src||'')))
    .map(r=>Number(r&&r.y)||0)
    .filter(Boolean)
  );
  if(masterYears.size===1 && extra.every(r=>masterYears.has(Number(r&&r.y)||0))){
   src=src.filter(r=>!masterYears.has(Number(r&&r.y)||0));
  }
  src=src.concat(extra);
 }
 return src;
}
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const toks=s=>new Set(String(s||'').split(' ').filter(x=>x.length>1));
const sig=s=>[...toks(s)].sort().join('\u001f');
function tokenSim(A,B){
 if(!A.size||!B.size)return 0;
 let common=0;A.forEach(x=>{if(B.has(x))common++});
 return common/(A.size+B.size-common);
}
function makeIndex(rows){
 return rows.map((r,idx)=>{
  const d=norm(r&&r.d);
  const titles=[r&&r.t,r&&r.ot,r&&r.original_title,r&&r.en,r&&r.english_title]
    .filter(Boolean).map(v=>{const s=norm(v);return {s,t:toks(s),g:sig(s)}}).filter(x=>x.s);
  const festivalOverride=/_festival$/.test(String(r&&r.src||''));
  return {idx,y:Number(r&&r.y)||0,d,dt:toks(d),titles,festivalOverride};
 });
}
function prepare(index){
 const byYear=new Map(),byTitle=new Map(),bySig=new Map();
 for(const x of index){
  if(!byYear.has(x.y))byYear.set(x.y,[]);
  byYear.get(x.y).push(x);
  for(const t of x.titles){
   if(!byTitle.has(t.s))byTitle.set(t.s,[]);
   byTitle.get(t.s).push(x);
   if(t.g){
    if(!bySig.has(t.g))bySig.set(t.g,[]);
    bySig.get(t.g).push(x);
   }
  }
 }
 return {byYear,byTitle,bySig};
}
function query(ft){
 const nd=norm(ft.director),nt=norm(ft.festival_title);
 const qs=[nt,...(ft.aliases||[]).map(norm).filter(Boolean)].map(s=>({s,t:toks(s),g:sig(s)})).filter(x=>x.s);
 // Oscar, Goya and BAFTA editions are keyed by ceremony year, so match against the prior film year.
 const fy=Number(ft.festival_year)||0,targetYear=(ft.festival==='Oscar'||ft.festival==='Goya'||ft.festival==='BAFTA')?fy-1:fy;
 return {nd,ndt:toks(nd),nt,qs,targetYear};
}
function candidates(q,p){
 const map=new Map();
 for(let y=q.targetYear-5;y<=q.targetYear+5;y++)for(const x of (p.byYear.get(y)||[]))map.set(x.idx,x);
 // Outside ±5 only strongIdentity can qualify. titleSim===1 is exact title
 // or identical token sets, so these two indexes cover every possible candidate.
 for(const z of q.qs){
  for(const x of (p.byTitle.get(z.s)||[]))map.set(x.idx,x);
  if(z.g)for(const x of (p.bySig.get(z.g)||[]))map.set(x.idx,x);
 }
 return [...map.values()].sort((a,b)=>a.idx-b.idx);
}
function resolve(ft,p){
 const q=query(ft);let best=-1,bestScore=-1,bestOverride=false;
 for(const x of candidates(q,p)){
  const yearDiff=(q.targetYear&&x.y)?Math.abs(x.y-q.targetYear):99;
  let dirSim=0;
  if(q.nd&&x.d){
   if(x.d===q.nd)dirSim=1;
   else if(x.d.includes(q.nd)||q.nd.includes(x.d))dirSim=.9;
   else dirSim=tokenSim(x.dt,q.ndt);
  }
  let titleSim=0;
  for(const t of x.titles)for(const z of q.qs){
   let s=0;
   if(t.s===z.s)s=1;
   else if(t.s.includes(z.s)||z.s.includes(t.s))s=.88;
   else s=tokenSim(t.t,z.t);
   if(s>titleSim)titleSim=s;
  }
  // Displaced-year Goya matches require exact title plus a strong director identity; this protects historical aliases from homonyms.
  const strongIdentity=titleSim===1&&dirSim>=.8;
  const normalExact=titleSim===1&&yearDiff<=1;
  const oscarExact=!q.nd&&titleSim===1&&yearDiff<=2&&q.nt.length>=6;
  const fuzzyIdentity=titleSim>=.72&&dirSim>=.72&&yearDiff<=5;
  const directorAnchor=titleSim>=.55&&dirSim>=.95&&yearDiff<=3;
  const nearYearTitle=titleSim>=.88&&yearDiff<=1&&(!q.nd||dirSim>0);
  if(!(strongIdentity||normalExact||oscarExact||fuzzyIdentity||directorAnchor||nearYearTitle))continue;
  const yearBonus=yearDiff===0?2:yearDiff===1?1:yearDiff===2?.25:0;
  const score=titleSim*10+dirSim*5+yearBonus;
  if(score>bestScore||(score===bestScore&&x.festivalOverride&&!bestOverride)){
   bestScore=score;best=x.idx;bestOverride=Boolean(x.festivalOverride);
  }
 }
 return best;
}
const filmKey=(festival,year,title,director)=>JSON.stringify([String(festival||''),Number(year)||0,String(title||''),String(director||'')]);

const ownershipByYear=new Map();
for(const file of fs.readdirSync('data/catalog').filter(f=>/^festival-owned-\d{4}\.json$/.test(f))){
 const year=Number(file.match(/(\d{4})/)[1]);
 const raw=JSON.parse(fs.readFileSync('data/catalog/'+file,'utf8'));
 ownershipByYear.set(year,new Map(Object.entries(raw).map(([k,v])=>[k,new Set(v||[])])));
}
function authoritativeOwnership(ed,f){
 const sets=ownershipByYear.get(Number(ed.year));
 if(!sets)return null;
 const set=sets.get(ed.festival+'|'+ed.section);
 return set?set.has(f.title):null;
}

const baseCatalog=JSON.parse(fs.readFileSync('data/catalog/catalog.json','utf8'));
const basePrepared=prepare(makeIndex(baseCatalog));
const catalog=loadCatalog(),prepared=prepare(makeIndex(catalog));
const db=JSON.parse(fs.readFileSync('data/festivals/festivals.json','utf8'));
const matches={};let total=0,present=0;
for(const ed of (db.editions||[])){
 for(const f of (ed.films||[])){
  total++;
  const ft={festival:ed.festival,festival_year:Number(ed.year),section:ed.section,festival_title:f.title,aliases:f.aliases||[],director:f.director};
  let i=resolve(ft,prepared);
  const authoritative=authoritativeOwnership(ed,f);
  if(authoritative===false)i=-1;
  const key=filmKey(ed.festival,ed.year,f.title,f.director);
  if(i>=0){
   present++;
   const r=catalog[i]||{};
   // Annual master overlays can intentionally replace a year's catalogue rows
   // without carrying poster metadata. Preserve the lightweight festival map by
   // falling back to the matching row in the original base catalogue only when
   // the selected catalogue row has no poster of its own.
   let poster=r.p||'';
   if(!poster&&!r.noPosterFallback){
    const baseIndex=resolve(ft,basePrepared);
    if(baseIndex>=0)poster=(baseCatalog[baseIndex]&&baseCatalog[baseIndex].p)||'';
   }
   matches[key]={i,y:Number(r.y)||0,t:r.t||'',d:r.d||'',p:poster,dur:r.dur||0};
  }else matches[key]=null;
 }
}
const out={version:1,total,present,matches};
fs.writeFileSync('data/catalog/festival-matches.json',JSON.stringify(out));
console.log(JSON.stringify({total,present,missing:total-present,bytes:fs.statSync('data/catalog/festival-matches.json').size}));
