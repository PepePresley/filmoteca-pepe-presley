import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { planMatches, readSnapshot, catalogRows } from './plan-festival-matches.mjs';

const globalPath='data/festivals/festivals.json';
const catalogPath='data/catalog/catalog.json';
const row={t:'Una película',y:2024,d:'Directora',p:'poster',dur:100};
const edition=(festival,year,title='Una película',director='Directora')=>
 ({festival,year,section:'Competición',films:[{title,director}]});
function snapshot(editions,rows=[row],extra={}){
 return new Map(Object.entries({[globalPath]:JSON.stringify({editions}),
  [catalogPath]:JSON.stringify(rows),...Object.fromEntries(Object.entries(extra).map(([p,v])=>[p,JSON.stringify(v)]))}));
}
function mutate(source,p,value){const next=new Map(source);next.set(p,JSON.stringify(value));return next;}

test('presentation, awards, category order and version preserve approved associations',()=>{
 const before=snapshot([edition('Cannes',2024)]);
 const db=JSON.parse(before.get(globalPath));db.version=99;
 Object.assign(db.editions[0].films[0],{display_title:'Título español',award:'Palma',categories:['Otra']});
 assert.deepEqual(planMatches(before,mutate(before,globalPath,db)).years,[]);
});
test('catalog changes find ceremony years and displaced identities, leaving unrelated editions alone',()=>{
 const before=snapshot([edition('Cannes',2024),edition('Oscar',2025),edition('Goya',2000),
  edition('Berlín',2020,'Otra película','Otro director')]);
 const plan=planMatches(before,mutate(before,catalogPath,[{...row,dur:105}]));
 assert.deepEqual(plan.years,[2000,2024,2025]);
 assert.equal(plan.reasons[2000][0],'catalog-result');
});
test('adding unrelated rows does not reopen adjacent years; removing a winner does',()=>{
 const before=snapshot([edition('Cannes',2024),edition('Venecia',2023,'Otra','Otra')]);
 assert.deepEqual(planMatches(before,mutate(before,catalogPath,[row,{t:'Sin relación',d:'Z',y:2024}])).years,[]);
 assert.deepEqual(planMatches(before,mutate(before,catalogPath,[])).years,[2024]);
});
test('ownership is authoritative, order-insensitive and limited to relevant edition years',()=>{
 const p='data/catalog/festival-owned-2024.json';
 const before=snapshot([edition('Cannes',2024),edition('Cannes',2023)], [row],
  {[p]:{'Cannes|Competición':['Una película','Otra']}});
 assert.deepEqual(planMatches(before,mutate(before,p,{'Cannes|Competición':['Otra','Una película']})).years,[]);
 assert.deepEqual(planMatches(before,mutate(before,p,{'Cannes|Competición':[]})).years,[2024]);
 const blocked=mutate(before,p,{'Cannes|Competición':[]});
 assert.deepEqual(planMatches(blocked,mutate(blocked,catalogPath,[])).years,[2023]);
});
test('new, removed and renamed film identities, aliases and sections affect their years',()=>{
 const before=snapshot([edition('Cannes',2024),edition('Oscar',2025)]);
 for(const alter of [ed=>ed.films.push({title:'Nueva',director:'Otro'}),ed=>ed.films.pop(),
  ed=>ed.films[0].title='Distinta',ed=>ed.films[0].aliases=['Alias'],ed=>ed.section='Otra']){
  const db=JSON.parse(before.get(globalPath));alter(db.editions[0]);
  assert.deepEqual(planMatches(before,mutate(before,globalPath,db)).years,[2024]);
 }
 const db=JSON.parse(before.get(globalPath));db.editions.pop();
 assert.deepEqual(planMatches(before,mutate(before,globalPath,db)).years,[2025]);
});
test('annual master replacement, technical-only edits and hidden base poster fallback',()=>{
 const p='data/catalog/annual_2024_overlay.json';
 const overlay={...row,p:'',src:'Catalogo_Telegram_2024',technical:'1080p'};
 const before=snapshot([edition('Cannes',2024)], [row], {[p]:[overlay]});
 assert.deepEqual(catalogRows(before),[overlay]);
 assert.deepEqual(planMatches(before,mutate(before,p,[{...overlay,technical:'2160p'}])).years,[]);
 assert.deepEqual(planMatches(before,mutate(before,catalogPath,[{...row,p:'new-poster'}])).years,[2024]);
 const blocked=mutate(before,p,[{...overlay,noPosterFallback:true}]);
 assert.deepEqual(planMatches(blocked,mutate(blocked,catalogPath,[{...row,p:'new-poster'}])).years,[]);
 const deleted=new Map(before);deleted.delete(p);
 assert.deepEqual(planMatches(before,deleted).years,[]); // same final identity and poster
});
test('tied candidate order changes are detected without treating all index shifts as changes',()=>{
 const first={...row,p:'first'},second={...row,p:'second'};
 const before=snapshot([edition('Cannes',2024)],[first,second]);
 assert.deepEqual(planMatches(before,mutate(before,catalogPath,[second,first])).years,[2024]);
 assert.deepEqual(planMatches(before,mutate(before,catalogPath,[{t:'Unrelated',y:1900},first,second])).years,[]);
});
test('matching rule changes explicitly include all existing years',()=>{
 const before=snapshot([edition('Cannes',2024),edition('Oscar',2025)]);
 before.set('scripts/festival-match-rules.mjs','old');
 const after=new Map(before);after.set('scripts/festival-match-rules.mjs','new');
 assert.deepEqual(planMatches(before,after).years,[2024,2025]);
});
test('a changed record already used by the approved map is included even if legacy resolution differs',()=>{
 const before=snapshot([edition('Cannes',2024,'Título antiguo','Otra directora')]);
 before.set('data/catalog/festival-matches.json',JSON.stringify({matches:{
  [JSON.stringify(['Cannes',2024,'Título antiguo','Otra directora'])]:{...row,i:123}
 }}));
 const plan=planMatches(before,mutate(before,catalogPath,[{...row,dur:105}]));
 assert.deepEqual(plan.years,[2024]);
 assert.deepEqual(plan.reasons[2024],['approved-catalog-record']);
});
test('the full current dataset has zero scope when its inputs are unchanged',()=>{
 const before=readSnapshot();
 const plan=planMatches(before,new Map(before));
 assert.equal(plan.mode,'preserve');assert.deepEqual(plan.years,[]);assert.ok(plan.allYears.length>0);
});
test('initial resolver extraction must preserve the old resolver text',()=>{
 const before=snapshot([edition('Cannes',2024)]);
 before.set('scripts/build-festival-matches.mjs','prefix\nunchanged rules\nsuffix');
 const after=new Map(before);after.set('scripts/build-festival-matches.mjs','refactored');
 after.set('scripts/festival-match-rules.mjs','unchanged rules\nexport { makeIndex, prepare, resolve };');
 assert.deepEqual(planMatches(before,after).years,[]);
 after.set('scripts/festival-match-rules.mjs','different rules\nexport { makeIndex, prepare, resolve };');
 assert.deepEqual(planMatches(before,after).years,[2024]);
});
test('generator extraction retains legacy bytes and preserves out-of-scope associations',()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'match-scope-test-'));
 try{
  fs.mkdirSync(path.join(temp,'data/catalog'),{recursive:true});
  fs.mkdirSync(path.join(temp,'data/festivals'),{recursive:true});
  const db={editions:[edition('Cannes',2024),edition('Oscar',2025),edition('Goya',2000)]};
  const key=ed=>JSON.stringify([ed.festival,ed.year,ed.films[0].title,ed.films[0].director]);
  const approved={version:1,total:3,present:3,matches:Object.fromEntries(db.editions.map((ed,i)=>
   [key(ed),{i:50+i,y:2024,t:row.t,d:row.d,p:'approved',dur:99}]))};
  fs.writeFileSync(path.join(temp,globalPath),JSON.stringify(db));
  fs.writeFileSync(path.join(temp,catalogPath),JSON.stringify([row]));
  const legacy=execFileSync('git',['show','d869403a2aa0aac47625b98a27fd0003001a55c2:scripts/build-festival-matches.mjs'],{encoding:'utf8'});
  fs.writeFileSync(path.join(temp,'legacy.mjs'),legacy);
  for(const file of ['build-festival-matches.mjs','festival-match-rules.mjs'])
   fs.copyFileSync('scripts/'+file,path.join(temp,file));
  const mapFile=path.join(temp,'data/catalog/festival-matches.json');
  for(const args of [[],['--years=2024'],['--years=2000,2024,2025','--labels-only']]){
   fs.writeFileSync(mapFile,JSON.stringify(approved));
   execFileSync(process.execPath,['legacy.mjs',...args],{cwd:temp});
   const expected=fs.readFileSync(mapFile,'utf8');
   fs.writeFileSync(mapFile,JSON.stringify(approved));
   execFileSync(process.execPath,['build-festival-matches.mjs',...args],{cwd:temp});
   assert.equal(fs.readFileSync(mapFile,'utf8'),expected);
   if(args[0]==='--years=2024'){
    const output=JSON.parse(expected);
    for(const ed of db.editions.filter(ed=>ed.year!==2024))
     assert.deepEqual(output.matches[key(ed)],approved.matches[key(ed)]);
   }
  }
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});

test('runner uses the approved Git base, not a modified map, and scoped generation preserves other years',()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'match-runner-test-'));
 try{
  fs.mkdirSync(path.join(temp,'data/catalog'),{recursive:true});
  fs.mkdirSync(path.join(temp,'data/festivals'),{recursive:true});
  fs.mkdirSync(path.join(temp,'scripts'));
  const db={version:1,editions:[edition('Cannes',2024),edition('Oscar',2025,'Ajena','Otra')]};
  const key=ed=>JSON.stringify([ed.festival,ed.year,ed.films[0].title,ed.films[0].director]);
  const approved={version:1,total:2,present:2,matches:{
   [key(db.editions[0])]:{i:500,y:2024,t:row.t,d:row.d,p:'approved',dur:99},
   [key(db.editions[1])]:{i:600,y:1900,t:'Conservada',d:'Otra',p:'old-poster',dur:77}
  }};
  fs.writeFileSync(path.join(temp,globalPath),JSON.stringify(db)+'\n');
  fs.mkdirSync(path.join(temp,'data/festivals/years'));
  const index={schemaVersion:1,metadata:{version:1},editionOrder:db.editions.map(ed=>[ed.festival,ed.year,ed.section])};
  fs.writeFileSync(path.join(temp,'data/festivals/years/index.json'),JSON.stringify(index));
  for(const ed of db.editions)fs.writeFileSync(path.join(temp,'data/festivals/years/'+ed.year+'.json'),JSON.stringify({year:ed.year,editions:[ed]}));
  fs.writeFileSync(path.join(temp,catalogPath),JSON.stringify([row]));
  const mapFile=path.join(temp,'data/catalog/festival-matches.json');
  fs.writeFileSync(mapFile,JSON.stringify(approved));
  for(const file of ['build-festival-matches.mjs','festival-match-rules.mjs','plan-festival-matches.mjs','build-festivals.mjs','validate-festival-inputs.mjs'])
   fs.copyFileSync('scripts/'+file,path.join(temp,'scripts',file));
  const git=(...args)=>execFileSync('git',args,{cwd:temp,stdio:'pipe'});
  git('init','-q');git('add','.');
  git('-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','-qm','Approved base');
  const base=git('rev-parse','HEAD').toString().trim();
  const tampered=structuredClone(approved);tampered.matches[key(db.editions[1])].p='tampered';
  fs.writeFileSync(mapFile,JSON.stringify(tampered));
  const run=(...args)=>execFileSync(process.execPath,['scripts/plan-festival-matches.mjs','--base='+base,...args],{cwd:temp});
  run('--plan-only');assert.equal(JSON.parse(fs.readFileSync(mapFile)).matches[key(db.editions[1])].p,'tampered');
  run();assert.deepEqual(JSON.parse(fs.readFileSync(mapFile)),approved);
  fs.writeFileSync(path.join(temp,catalogPath),JSON.stringify([{...row,dur:105}]));
  run();const generated=JSON.parse(fs.readFileSync(mapFile));
  assert.equal(generated.matches[key(db.editions[0])].dur,105);
  assert.equal(generated.matches[key(db.editions[0])].i,500);
  assert.deepEqual(generated.matches[key(db.editions[1])],approved.matches[key(db.editions[1])]);
  const validMap=fs.readFileSync(mapFile,'utf8');
  fs.writeFileSync(path.join(temp,catalogPath),JSON.stringify([{...row,noPosterFallback:'yes'}]));
  assert.throws(()=>run());
  assert.equal(fs.readFileSync(mapFile,'utf8'),validMap);
  let report=JSON.parse(fs.readFileSync(path.join(temp,'outputs/validacion_bloque/bloque.json')));
  assert.equal(report.ok,false);assert.ok(report.errors.some(i=>i.code==='invalid-fallback'));
  fs.writeFileSync(path.join(temp,catalogPath),JSON.stringify([row]));
  const annualFile=path.join(temp,'data/festivals/years/2024.json');
  const annual=JSON.parse(fs.readFileSync(annualFile));annual.editions[0].films[0].display_title='Etiqueta';
  fs.writeFileSync(annualFile,JSON.stringify(annual));
  assert.throws(()=>run());assert.equal(fs.readFileSync(mapFile,'utf8'),validMap);
  report=JSON.parse(fs.readFileSync(path.join(temp,'outputs/validacion_bloque/bloque.json')));
  assert.ok(report.errors.some(i=>i.code==='annual-artifact'));
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});
