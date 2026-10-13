import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { inspectInputs, validateInputChanges, writeValidationReport } from './validate-festival-inputs.mjs';
import { readSnapshot } from './plan-festival-matches.mjs';

const catalog='data/catalog/catalog.json',global='data/festivals/festivals.json',owned='data/catalog/festival-owned-2024.json';
const row={t:'Película',y:2024,d:'Directora',dur:100};
const film={title:'Película',director:'Directora'};
const key=JSON.stringify(['Cannes',2024,'Película','Directora']);
function fixture(){return new Map(Object.entries({
 [catalog]:JSON.stringify([row]),
 [global]:JSON.stringify({version:1,editions:[{festival:'Cannes',year:2024,section:'Competición',films:[film]}]}),
 [owned]:JSON.stringify({'Cannes|Competición':['Película']}),
 'data/catalog/festival-matches.json':JSON.stringify({version:1,total:1,present:0,matches:{[key]:null}})
}));}
function change(files,p,value){const copy=new Map(files);copy.set(p,JSON.stringify(value));return copy;}

test('valid joint sources have counts and no blocking errors',()=>{
 const before=fixture(),report=validateInputChanges(before,new Map(before));
 assert.equal(report.ok,true);assert.deepEqual(report.errors,[]);assert.equal(report.after.catalogRecords,1);
 assert.equal(report.after.appearances,1);assert.equal(report.after.ownershipTitles,1);
});
test('malformed JSON and unsafe shapes are blocked before planning',()=>{
 const before=fixture();
 const malformed=new Map(before);malformed.set(catalog,'{');
 assert.ok(validateInputChanges(before,malformed).errors.some(i=>i.code==='invalid-json'));
 for(const [p,value,code] of [[catalog,{},'invalid-catalog'],[global,{editions:{}},'invalid-editions'],
  [owned,[],'invalid-ownership'],[catalog,[{...row,t:''}],'invalid-record'],
  [catalog,[{...row,noPosterFallback:'true'}],'invalid-fallback'],[catalog,[{...row,d:42}],'invalid-d'],
  [catalog,[{...row,dur:-1}],'invalid-duration'],[catalog,[{...row,y:0}],'invalid-record']]){
  const report=validateInputChanges(before,change(before,p,value));
  assert.equal(report.ok,false,code);assert.ok(report.errors.some(i=>i.code===code),code);
 }
});
test('invalid aliases and duplicate films are blocked',()=>{
 const before=fixture();
 for(const films of [[{...film,aliases:'Alias'}],[{...film,aliases:['']}],[film,film]]){
  const db=JSON.parse(before.get(global));db.editions[0].films=films;
  assert.equal(validateInputChanges(before,change(before,global,db)).ok,false);
 }
});
test('new ownership references must point to existing sections and literal raw titles',()=>{
 const before=fixture();
 for(const [value,code] of [[{'Cannes|Otra':['Película']},'unknown-ownership-section'],
  [{'Cannes|Competición':['Título español de presentación']},'unknown-owned-title'],
  [{'Cannes|Competición':['Película','Película']},'duplicate-owned-title'],
  [{'Competición':['Película']},'invalid-ownership-section']]){
  const report=validateInputChanges(before,change(before,owned,value));
  assert.equal(report.ok,false);assert.ok(report.errors.some(i=>i.code===code));
 }
});
test('historical references are retained as warnings; newly introduced errors still block',()=>{
 const initial=fixture();
 const before=change(initial,owned,{'Cannes|Competición':['Antigua pendiente']});
 const after=new Map(before);after.set('data/festivals/years/2024.json','{}');
 let report=validateInputChanges(before,after);
 assert.equal(report.ok,true);assert.equal(report.inheritedIssues,1);
 report=validateInputChanges(before,change(before,owned,{'Cannes|Competición':['Antigua pendiente','Nueva pendiente']}));
 assert.equal(report.ok,false);assert.equal(report.inheritedIssues,1);assert.equal(report.errors.length,1);
});
test('duplicates within a source block new ambiguity but overlays may repeat base identities',()=>{
 const before=fixture();
 const copies=validateInputChanges(before,change(before,catalog,[row,row]));
 assert.equal(copies.ok,true);assert.equal(copies.newWarnings,1);
 assert.equal(validateInputChanges(before,change(before,catalog,[row,{...row,p:'contradictory'}])).ok,false);
 const inherited=change(before,catalog,[row,row]);
 assert.equal(validateInputChanges(inherited,new Map(inherited)).ok,true);
 const overlay=change(before,'data/catalog/annual_2024_festival_overlay.json',[{...row,p:'corrected'}]);
 assert.equal(validateInputChanges(before,overlay).ok,true);
});
test('missing fields, null durations and displaced master years remain supported',()=>{
 const before=fixture();
 for(const r of [{t:'Película',y:2024},{...row,dur:null},{...row,dur:0},{...row,masterYear:2025}])
  assert.equal(validateInputChanges(before,change(before,catalog,[r])).ok,true);
 const displaced=change(before,'data/catalog/annual_2025_overlay.json',[{...row,src:'Catalogo_Telegram_2025'}]);
 assert.equal(validateInputChanges(before,displaced).ok,true);
});
test('approved map must have valid shape, complete key coverage and consistent counts',()=>{
 const before=fixture(),p='data/catalog/festival-matches.json';
 for(const map of [null,{version:1,total:1,present:0,matches:{}},
  {version:1,total:2,present:0,matches:{[key]:null}},
  {version:1,total:1,present:1,matches:{[key]:null}},
  {version:1,total:1,present:1,matches:{[key]:{i:-1,t:'Película',y:2024}}}])
  assert.equal(validateInputChanges(change(before,p,map),before).ok,false);
});
test('real dataset stays valid against its approved baseline without reopening inherited records',()=>{
 const current=readSnapshot('aac45256ea8709dc65b8cffe34e9065d8ece0861');
 const report=validateInputChanges(current,new Map(current));
 assert.equal(report.ok,true);assert.deepEqual(report.errors,[]);assert.equal(report.after.appearances,9287);
 assert.equal(inspectInputs(current).summary.editions,321);
});
test('both report formats contain blocking errors, scope, preserved years and count differences',()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'festival-report-'));
 try{
  const before=fixture();
  const report={...validateInputChanges(before,change(before,owned,{'Cannes|Otra':['Película']})),base:'approved',
   plan:{years:[2024],allYears:[2023,2024],reasons:{2024:['identity-or-ownership']}}};
  writeValidationReport(report,temp);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(temp,'bloque.json'))),report);
  const markdown=fs.readFileSync(path.join(temp,'bloque.md'),'utf8');
  for(const expected of ['bloqueado','unknown-ownership-section','Años conservados: 2023','identity-or-ownership'])
   assert.ok(markdown.includes(expected),expected);
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});
