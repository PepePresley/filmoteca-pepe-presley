import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';
const db=JSON.parse(fs.readFileSync('data/festivals/years/2025.json')).editions;
test('new festival configuration resolves accent-free links and preserves award category mode',()=>{
 const context=vm.createContext({});vm.runInContext(fs.readFileSync('app/festival-config.js','utf8'),context);
 assert.equal(context.FilmotecaFestivals.fromSlug('cesar'),'César');
 assert.equal(context.FilmotecaFestivals.fromSlug('césar'),'César');
 assert.equal(context.FilmotecaFestivals.fromSlug('sitges'),'Sitges');
 assert.equal(context.FilmotecaFestivals.isAward('César'),true);assert.equal(context.FilmotecaFestivals.isAward('Seminci'),false);
 assert.equal(context.FilmotecaFestivals.categoryOrder('César').length,24);
});
test('César preserves multiple nominees from a single film, shared credits and all24 awards',()=>{
 const films=db.find(e=>e.festival==='César').films;
 assert.equal(films.reduce((n,f)=>n+f.nominations.length,0),111);
 assert.equal(films.reduce((n,f)=>n+f.wins.length,0),24);
 const actresses=films.flatMap(f=>f.nominations.filter(n=>n.startsWith('Actriz protagonista')));
 assert.equal(actresses.length,5);assert.equal(films.filter(f=>f.nominations.some(n=>n.startsWith('Actriz protagonista'))).length,4);
 assert(films.some(f=>f.nominations.some(n=>n.includes(' · ')&&n.includes(';'))));
});
test('new selections retain separate short sections and use the corrected Bonello identity',()=>{
 for(const [family,features,shorts] of [['Sitges',34,1],['Seminci',24,6]]){
  assert.equal(db.find(e=>e.festival===family&&e.section==='Competición oficial').films.length,features);
  const films=db.find(e=>e.festival===family&&e.section==='Cortometrajes premiados').films;
  assert.equal(films.length,shorts);assert(films.every(f=>f.wins.length>0));
 }
 const map=JSON.parse(fs.readFileSync('data/catalog/festival-matches.json')).matches;
 for(const [festival,title,year] of [['César','The Beast (La bestia)',2025],['Venecia','La bête',2023]]){
  const hit=map[JSON.stringify([festival,year,title,'Bertrand Bonello'])];assert.equal(hit.d,'Bertrand Bonello');assert(!hit.p);
 }
});
test('opening a festival summary recovers its full Telegram record after catalog indexes move',async()=>{
 const html=fs.readFileSync('lab/index.html','utf8');const title='The Beast (La bestia)';
 const summary={t:title,d:'Bertrand Bonello',y:2023};const full={...summary,u:'https://t.me/c/2320474244/420'};const DATA=[summary];let opened;
 const context=vm.createContext({DATA,ensureFullCatalog:async()=>{DATA.splice(0,1,{t:title,d:'Otro director',y:2023},full)},openModal:r=>{opened=r}});
 vm.runInContext(html.slice(html.indexOf('async function openFestivalMovie('),html.indexOf('const FESTIVAL_EDITION_CACHE=')),context);
 await context.openFestivalMovie(0,title);assert.equal(opened.u,full.u);assert.equal(opened.d,'Bertrand Bonello');
});
for(const app of ['lab','lab-lite'])test(`${app}: map summaries recover current Telegram URLs by exact identity`,async()=>{
 const html=fs.readFileSync(app+'/index.html','utf8');const movie={t:'The Beast (La bestia)',d:'Bertrand Bonello',y:2023,u:'https://t.me/c/2320474244/420'};
 const context=vm.createContext({DATA:[{...movie,d:'Otro director',u:'wrong'},movie]});
 vm.runInContext(html.slice(html.indexOf('let catalog1948References;'),html.indexOf('async function openModal(')),context);
 const full=await context.recordWithCopies({t:movie.t,d:movie.d,y:2023});assert.equal(full.u,movie.u);
});
test('2022–2024 retain all nine editions and complete César nominations without the false Grinberg win',()=>{
 let total=0;
 for(const [year,nominations] of [[2022,126],[2023,113],[2024,111]]){
  const editions=JSON.parse(fs.readFileSync(`data/festivals/years/${year}.json`)).editions.filter(e=>['Sitges','Seminci','César'].includes(e.festival));
  assert.equal(editions.length,5);assert.equal(new Set(editions.map(e=>e.festival)).size,3);
  const films=editions.find(e=>e.festival==='César').films;
  assert.equal(films.reduce((n,f)=>n+f.nominations.length,0),nominations);assert.equal(films.reduce((n,f)=>n+f.wins.length,0),24);
  assert.equal(new Set(films.flatMap(f=>f.nominations.map(n=>n.split(' · ')[0]))).size,24);
  if(year===2023){
   const innocent=films.find(f=>f.aliases?.some(a=>/innocent/i.test(a))||/innocent/i.test(f.title));
   assert(innocent.nominations.some(n=>n.includes('Anouk Grinberg')));assert(!innocent.wins.some(w=>w.includes('Anouk Grinberg')));assert(innocent.wins.some(w=>w.includes('Noémie Merlant')));
  }
  total+=editions.reduce((n,e)=>n+e.films.length,0);
  const owned=JSON.parse(fs.readFileSync(`data/catalog/festival-owned-${year}.json`));
  for(const e of editions)for(const f of e.films)if(!f.director)assert(!owned[e.festival+'|'+e.section].includes(f.title));
 }
 assert.equal(total,321);
});
test('master reference lookup is cached, preserves metadata and never confuses homonymous directors',async()=>{
 let requests=0;const refs=JSON.parse(fs.readFileSync('data/catalog/festival-references-2022-2024.json'));
 const context=vm.createContext({fetch:async()=>{requests++;return {ok:true,json:async()=>refs}}});vm.runInContext(fs.readFileSync('app/festival-config.js','utf8'),context);
 const target=refs.find(r=>r.d==='Marco Bellocchio'&&r.t==='El rapto');assert(target);
 const full=await context.FilmotecaFestivals.withReference({t:target.t,d:target.d,y:target.y,p:'approved'});assert.equal(full.u,target.u);assert.equal(full.p,'approved');
 const other={t:target.t,d:'Otro director',y:target.y};assert.equal(await context.FilmotecaFestivals.withReference(other),other);assert.equal(requests,1);
});
