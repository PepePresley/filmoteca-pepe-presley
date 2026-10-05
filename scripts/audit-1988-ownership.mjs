import fs from 'node:fs';
const db=JSON.parse(fs.readFileSync('data/festivals/festivals.json','utf8'));
const map=JSON.parse(fs.readFileSync('data/catalog/festival-matches.json','utf8')).matches||{};
const owned=JSON.parse(fs.readFileSync('data/catalog/festival-owned-1988.json','utf8'));
const key=(festival,year,title,director)=>JSON.stringify([String(festival||''),Number(year)||0,String(title||''),String(director||'')]);
const groups={}, mismatches=[];
for(const ed of (db.editions||[]).filter(e=>Number(e.year)===1988)){
 const gkey=ed.festival+'|'+ed.section;
 const expectedSet=new Set(owned[gkey]||[]);
 const rows=[];
 for(const film of (ed.films||[])){
   const hit=map[key(ed.festival,1988,film.title,film.director)];
   const expected=expectedSet.has(film.title), actual=!!hit;
   const row={title:film.title,director:film.director||'',expected,actual,match:hit?{i:hit.i,t:hit.t,d:hit.d,y:hit.y}:null};
   rows.push(row);
   if(expected!==actual)mismatches.push({festival:ed.festival,section:ed.section,...row});
 }
 groups[gkey]={
   total:rows.length,
   telegramOwned:rows.filter(x=>x.expected).length,
   webOwned:rows.filter(x=>x.actual).length,
   falsePositive:rows.filter(x=>!x.expected&&x.actual).map(x=>x.title),
   falseNegative:rows.filter(x=>x.expected&&!x.actual).map(x=>x.title)
 };
}
const report={generatedAt:new Date().toISOString(),groups,mismatchCount:mismatches.length,mismatches};
fs.writeFileSync('data/staging/1988/ownership-audit.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));

if(report.mismatchCount) process.exitCode=2;
