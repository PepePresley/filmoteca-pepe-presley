import fs from 'node:fs';
let src=JSON.parse(fs.readFileSync('data/catalog/catalog.json','utf8'));
for(const f of ['annual_1989_overlay.json','annual_1990_1994_overlay.json','annual_1995_1996_overlay.json','annual_1997_1999_overlay.json']){
 const p='data/catalog/'+f;
 if(fs.existsSync(p)){
   const extra=JSON.parse(fs.readFileSync(p,'utf8'));
   if(Array.isArray(extra))src=src.concat(extra);
 }
}
const out='data/catalog/festival-index';
fs.mkdirSync(out,{recursive:true});
const buckets=new Map();
for(let i=0;i<src.length;i++){
  const r=src[i]||{}, y=Number(r.y)||0;
  if(!y) continue;
  const start=y<1930?1891:Math.floor(y/10)*10;
  const end=start===1891?1929:start+9;
  const key=`${start}-${end}`;
  if(!buckets.has(key)) buckets.set(key,[]);
  buckets.get(key).push({
    i,y,t:r.t||'',d:r.d||'',
    ot:r.ot||'',o:r.original_title||'',
    en:r.en||'',e:r.english_title||'',p:r.p||'',dur:r.dur||0
  });
}
for(const [key,rows] of buckets){
  fs.writeFileSync(`${out}/${key}.json`,JSON.stringify(rows));
  console.log(key,rows.length);
}
