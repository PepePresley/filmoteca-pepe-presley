import fs from 'node:fs';

const masterPath='data/festivals/festivals.json';
const staging=[
 'data/staging/1988/cannes-competition.json',
 'data/staging/1988/cannes-ucr.json',
 'data/staging/1988/berlin.json',
 'data/staging/1988/venice.json',
 'data/staging/1988/san-sebastian.json',
 'data/staging/1988/oscar.json'
];
const db=JSON.parse(fs.readFileSync(masterPath,'utf8'));
const fresh=staging.map(p=>JSON.parse(fs.readFileSync(p,'utf8')));
const expected=new Map([
 ['Cannes|Competición oficial',21],
 ['Cannes|Un Certain Regard',22],
 ['Berlín|Competición oficial',19],
 ['Venecia|Competición oficial',22],
 ['San Sebastián|Sección Oficial',18],
 ['Oscar|60.ª edición · películas de 1987',55]
]);
for(const e of fresh){
 const k=e.festival+'|'+e.section;
 if(Number(e.year)!==1988)throw new Error('Año incorrecto: '+k);
 if((e.films||[]).length!==expected.get(k))throw new Error('Conteo incorrecto '+k+': '+(e.films||[]).length);
}
db.editions=(db.editions||[]).filter(e=>Number(e.year)!==1988).concat(fresh);
fs.writeFileSync(masterPath,JSON.stringify(db,null,2)+'\n');
console.log(fresh.map(e=>e.festival+' / '+e.section+': '+e.films.length).join('\n'));
