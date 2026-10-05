import fs from 'node:fs';
const src=JSON.parse(fs.readFileSync('data/catalog/catalog.json','utf8'));
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
    en:r.en||'',e:r.english_title||''
  });
}
for(const [key,rows] of buckets){
  fs.writeFileSync(`${out}/${key}.json`,JSON.stringify(rows));
  console.log(key,rows.length);
}
