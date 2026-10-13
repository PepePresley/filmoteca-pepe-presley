import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { makeIndex, prepare, resolve, associationValue, catalogRows } from './festival-match-rules.mjs';

const globalPath='data/festivals/festivals.json';
const mapPath='data/catalog/festival-matches.json';
const generatorPath='scripts/build-festival-matches.mjs';
const rulesPath='scripts/festival-match-rules.mjs';
const relevant=p=>p===globalPath||p===mapPath||p===generatorPath||p===rulesPath||
 /^data\/catalog\/(catalog\.json|annual_.*_overlay\.json|festival-owned-\d{4}\.json)$/.test(p);
const parse=(files,p,fallback)=>files.has(p)?JSON.parse(files.get(p)):fallback;
const encoded=value=>JSON.stringify(value);

export { catalogRows };
const rowInput=r=>[r?.t,r?.y,r?.d,r?.ot,r?.original_title,r?.en,r?.english_title,
 /_festival$/.test(String(r?.src||'')),r?.p,r?.noPosterFallback,r?.dur];
function changedRows(before,after){
 const oldKeys=before.map(r=>encoded(rowInput(r))), keys=after.map(r=>encoded(rowInput(r)));
 const oldSet=new Set(oldKeys), set=new Set(keys);
 // Changes in relative order can change tie winners. A simple insertion shifts
 // storage indexes but leaves the relative order of existing records intact.
 if(encoded(oldKeys.filter(k=>set.has(k)))!==encoded(keys.filter(k=>oldSet.has(k))))return [...before,...after];
 return [...before.filter((r,i)=>!set.has(oldKeys[i])),...after.filter((r,i)=>!oldSet.has(keys[i]))];
}
function filmInput(ed,f){
 return {festival:ed.festival,festival_year:Number(ed.year),section:ed.section,
  festival_title:f.title,aliases:f.aliases||[],director:f.director};
}
function ownership(files,ed,f){
 const source=parse(files,`data/catalog/festival-owned-${ed.year}.json`,null);
 const titles=source?.[ed.festival+'|'+ed.section];
 return titles?titles.includes(f.title):null;
}
function yearInputs(files,db){
 const years=new Map();
 for(const ed of db.editions||[]){
  const year=Number(ed.year);
  if(!years.has(year))years.set(year,[]);
  for(const f of ed.films||[])years.get(year).push(encoded([filmInput(ed,f),ownership(files,ed,f)]));
 }
 return new Map([...years].map(([year,films])=>[year,encoded(films.sort())]));
}
function resolverChanged(before,after){
 if(before.get(rulesPath)===after.get(rulesPath)&&before.get(generatorPath)===after.get(generatorPath))return false;
 // First extraction is safe only when the original resolver text is unchanged.
 if(!before.has(rulesPath)&&after.has(rulesPath)){
  const unchangedRules=after.get(rulesPath).split('export { makeIndex, prepare, resolve };')[0];
  if(unchangedRules&&before.get(generatorPath)?.includes(unchangedRules))return false;
 }
 return true;
}

export function planMatches(before,after){
 const oldDB=parse(before,globalPath,{editions:[]}), db=parse(after,globalPath,{editions:[]});
 const allYears=[...new Set([...(oldDB.editions||[]),...(db.editions||[])].map(ed=>Number(ed.year)))].sort((a,b)=>a-b);
 const reasons=new Map();
 const add=(year,reason)=>{if(!reasons.has(year))reasons.set(year,new Set());reasons.get(year).add(reason);};
 const oldInputs=yearInputs(before,oldDB), inputs=yearInputs(after,db);
 for(const year of allYears)if(oldInputs.get(year)!==inputs.get(year))add(year,'identity-or-ownership');
 const oldCatalog=catalogRows(before), catalog=catalogRows(after);
 const oldBase=parse(before,'data/catalog/catalog.json',[]), base=parse(after,'data/catalog/catalog.json',[]);
 const catalogChanged=encoded(oldCatalog.map(rowInput))!==encoded(catalog.map(rowInput))||
  encoded(oldBase.map(rowInput))!==encoded(base.map(rowInput));
 if(catalogChanged){
  const oldPrepared=prepare(makeIndex(oldCatalog)), prepared=prepare(makeIndex(catalog));
  const oldBasePrepared=prepare(makeIndex(oldBase)), basePrepared=prepare(makeIndex(base));
  const changed=[...changedRows(oldCatalog,catalog),...changedRows(oldBase,base)];
  const changedPrepared=prepare(makeIndex(changed));
  const identities=new Set(changedRows(oldCatalog,catalog).map(r=>encoded([r?.t||'',Number(r?.y)||0,r?.d||''])));
  const approved=parse(before,mapPath,{matches:{}}).matches;
  // Compare actual outcomes, including aliases, displaced years, ties and poster
  // fallback. Candidate windows alone would unnecessarily reopen adjacent years.
  for(const ed of db.editions||[]){
   if(reasons.has(Number(ed.year)))continue;
   for(const f of ed.films||[]){
    if(ownership(after,ed,f)===false)continue;
    const ft=filmInput(ed,f);
    const key=encoded([String(ed.festival||''),Number(ed.year)||0,String(f.title||''),String(f.director||'')]);
    const existing=approved[key];
    if(existing&&identities.has(encoded([existing.t||'',Number(existing.y)||0,existing.d||'']))){
     add(Number(ed.year),'approved-catalog-record');break;
    }
    // Most changed records cannot qualify for most films. Reuse the resolver's
    // eligibility rules before comparing both complete outcomes.
    if(resolve(ft,changedPrepared)<0)continue;
    const previous=associationValue(ft,oldCatalog,oldPrepared,oldBase,oldBasePrepared)?.value||null;
    const next=associationValue(ft,catalog,prepared,base,basePrepared)?.value||null;
    if(encoded(previous)!==encoded(next)){add(Number(ed.year),'catalog-result');break;}
   }
  }
 }
 if(resolverChanged(before,after))for(const year of allYears)add(year,'matching-rules');
 const years=[...reasons.keys()].sort((a,b)=>a-b);
 return {mode:years.length?'scoped':'preserve',years,allYears,
  reasons:Object.fromEntries(years.map(year=>[year,[...reasons.get(year)].sort()]))};
}

function git(...args){return execFileSync('git',args,{encoding:'utf8',maxBuffer:64*1024*1024});}
export function readSnapshot(ref){
 if(!ref){
  const files=new Map();
  for(const p of [globalPath,mapPath,generatorPath,rulesPath,
   ...fs.readdirSync('data/catalog').map(name=>'data/catalog/'+name)])
   if(relevant(p)&&fs.existsSync(p))files.set(p,fs.readFileSync(p,'utf8'));
  return files;
 }
 const sha=git('rev-parse','--verify','--end-of-options',ref+'^{commit}').trim();
 const files=new Map();
 for(const p of git('ls-tree','-r','--name-only',sha,'data/catalog','data/festivals', 'scripts').trim().split('\n').filter(relevant))
  files.set(p,git('show',sha+':'+p));
 return files;
}

export function runPlannedMatches(base,{planOnly=false}={}){
 const before=readSnapshot(base), after=readSnapshot();
 const plan=planMatches(before,after);
 console.log(JSON.stringify(plan));
 if(planOnly)return plan;
 if(!plan.allYears.length)throw new Error('No festival years available');
 if(!before.has(mapPath))throw new Error('Approved base match map is missing');
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'festival-matches-'));
 try{
  const previous=path.join(temp,'approved.json');
  fs.writeFileSync(previous,before.get(mapPath));
  const args=[generatorPath,'--previous-map='+previous,
   '--years='+(plan.years.length?plan.years:plan.allYears).join(',')];
  if(plan.mode==='preserve')args.push('--labels-only');
  execFileSync(process.execPath,args,{stdio:'inherit'});
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
 return plan;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const args=process.argv.slice(2);
  const base=args.find(arg=>arg.startsWith('--base='))?.slice(7);
  if(!base||args.some(arg=>!arg.startsWith('--base=')&&arg!=='--plan-only'))
   throw new Error('Usage: node scripts/plan-festival-matches.mjs --base=<approved-commit> [--plan-only]');
  runPlannedMatches(base,{planOnly:args.includes('--plan-only')});
 }catch(error){console.error(error.message);process.exitCode=1;}
}
