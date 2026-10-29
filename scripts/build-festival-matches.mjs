import fs from 'node:fs';
import { makeIndex, prepare, associationValue, catalogRows } from './festival-match-rules.mjs';

// Annual construction preserves previously verified editions. Without --year,
// retain the full rebuild used for catalog-wide updates.
const yearArg=process.argv.find(a=>a.startsWith('--year='));
const scopeYear=yearArg?Number(yearArg.slice(7)):null;
if(yearArg&&(!Number.isInteger(scopeYear)||scopeYear<1895||scopeYear>2100))throw new Error('Invalid festival year');
const yearsArg=process.argv.find(a=>a.startsWith('--years='));
const scopeYears=yearsArg?new Set(yearsArg.slice(8).split(',').map(Number)):(scopeYear?new Set([scopeYear]):null);
if(yearsArg&&[...scopeYears].some(y=>!Number.isInteger(y)||y<1895||y>2100))throw new Error('Invalid festival years');
const previousMapArg=process.argv.find(a=>a.startsWith('--previous-map='));
const previousMapPath=previousMapArg?previousMapArg.slice(15):'data/catalog/festival-matches.json';
const previousMatches=scopeYears?JSON.parse(fs.readFileSync(previousMapPath,'utf8')).matches:{};
const appendOnly=process.argv.includes('--append-only');
if(appendOnly&&!scopeYears)throw new Error('--append-only requires an explicit year scope');
const labelsOnly=process.argv.includes('--labels-only');
if(labelsOnly&&!scopeYears)throw new Error('--labels-only requires an explicit year scope');

function loadCatalog(){
 const files=new Map();
 for(const name of fs.readdirSync('data/catalog').filter(name=>name==='catalog.json'||/^annual_.*_overlay\.json$/.test(name))){
  const p='data/catalog/'+name;
  files.set(p,fs.readFileSync(p,'utf8'));
 }
 return catalogRows(files);
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
const identity=r=>JSON.stringify([r.t||'',Number(r.y)||0,r.d||'']);
const stableIndexes=new Map(Object.values(previousMatches).filter(Boolean).map(r=>[identity(r),r.i]));
let nextStableIndex=Math.max(catalog.length,...Object.values(previousMatches).filter(Boolean).map(r=>r.i+1));
function outputIndex(r,i,film){
 if(!scopeYears)return i;
 const key=identity(r);
 if(previousMatches[film]&&identity(previousMatches[film])===key)return previousMatches[film].i;
 if(!stableIndexes.has(key))stableIndexes.set(key,nextStableIndex++);
 return stableIndexes.get(key);
}
const db=JSON.parse(fs.readFileSync('data/festivals/festivals.json','utf8'));
const matches={};let total=0,present=0;
for(const ed of (db.editions||[])){
 for(const f of (ed.films||[])){
  total++;
  // Display labels do not change film identity or ownership. Require every
  // existing key rather than resolving historical associations again.
  if(labelsOnly){
   const key=filmKey(ed.festival,ed.year,f.title,f.director);
   if(!Object.hasOwn(previousMatches,key))throw new Error('Identity changed during labels-only update: '+key);
   matches[key]=previousMatches[key];
   if(matches[key])present++;
   continue;
  }
  const ft={festival:ed.festival,festival_year:Number(ed.year),section:ed.section,festival_title:f.title,aliases:f.aliases||[],director:f.director};
  const authoritative=authoritativeOwnership(ed,f);
  const key=filmKey(ed.festival,ed.year,f.title,f.director);
  // Pure additions keep approved associations, including deliberate nulls.
  if(appendOnly&&Object.hasOwn(previousMatches,key)){
   matches[key]=previousMatches[key];
   if(matches[key])present++;
   continue;
  }
  if(scopeYears&&!scopeYears.has(Number(ed.year))){
   if(!Object.hasOwn(previousMatches,key))throw new Error('Unbuilt edition outside scoped year: '+key);
   matches[key]=previousMatches[key];
   if(matches[key])present++;
   continue;
  }
  const selected=authoritative===false?null:associationValue(ft,catalog,prepared,baseCatalog,basePrepared);
  if(selected){
   present++;
   matches[key]={i:outputIndex(selected.row,selected.index,key),...selected.value};
  }else matches[key]=null;
 }
}
if(labelsOnly&&Object.keys(matches).length!==Object.keys(previousMatches).length)throw new Error('Film removed during labels-only update');
const out={version:1,total,present,matches};
fs.writeFileSync('data/catalog/festival-matches.json',JSON.stringify(out));
console.log(JSON.stringify({total,present,missing:total-present,bytes:fs.statSync('data/catalog/festival-matches.json').size}));
