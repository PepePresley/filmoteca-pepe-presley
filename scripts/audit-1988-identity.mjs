import fs from 'node:fs';
const db=JSON.parse(fs.readFileSync('data/festivals/festivals.json','utf8'));
const map=JSON.parse(fs.readFileSync('data/catalog/festival-matches.json','utf8')).matches||{};
const owned=JSON.parse(fs.readFileSync('data/catalog/festival-owned-1988.json','utf8'));
const key=(festival,year,title,director)=>JSON.stringify([String(festival||''),Number(year)||0,String(title||''),String(director||'')]);
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const toks=s=>new Set(norm(s).split(' ').filter(x=>x.length>1));
function sim(a,b){
 const A=toks(a),B=toks(b);if(!A.size||!B.size)return 0;
 let c=0;A.forEach(x=>{if(B.has(x))c++});return c/(A.size+B.size-c);
}
function titleScore(a,b){
 const A=norm(a),B=norm(b);if(!A||!B)return 0;
 if(A===B)return 1;if(A.includes(B)||B.includes(A))return .88;return sim(A,B);
}
function directorScore(a,b){
 const A=norm(a),B=norm(b);if(!A||!B)return 0;
 if(A===B)return 1;if(A.includes(B)||B.includes(A))return .9;return sim(A,B);
}
const bad=[],checked=[];
for(const ed of (db.editions||[]).filter(e=>Number(e.year)===1988)){
 const set=new Set(owned[ed.festival+'|'+ed.section]||[]);
 for(const f of (ed.films||[])){
  if(!set.has(f.title))continue;
  const hit=map[key(ed.festival,1988,f.title,f.director)];
  if(!hit){bad.push({festival:ed.festival,section:ed.section,title:f.title,reason:'missing owned match'});continue}
  const titles=[f.title,...(f.aliases||[])];
  const ts=Math.max(...titles.map(t=>titleScore(t,hit.t)));
  const ds=f.director?directorScore(f.director,hit.d):0;
  const ok=ts>=.88 || (ts>=.65&&ds>=.72);
  const row={festival:ed.festival,section:ed.section,title:f.title,director:f.director||'',match:{i:hit.i,t:hit.t,d:hit.d,y:hit.y},titleScore:Number(ts.toFixed(3)),directorScore:Number(ds.toFixed(3)),ok};
  checked.push(row);
  if(!ok)bad.push({...row,reason:'wrong matched identity'});
 }
}
const report={generatedAt:new Date().toISOString(),checked:checked.length,badCount:bad.length,bad};
fs.writeFileSync('data/staging/1988/identity-audit.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
if(bad.length)process.exitCode=2;
