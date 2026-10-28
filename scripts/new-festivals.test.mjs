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
 const context=vm.createContext({fetch:async url=>{requests++;return {ok:true,json:async()=>(url.includes('references-cinco-')||url.includes('references-2026'))?[]:refs}}});vm.runInContext(fs.readFileSync('app/festival-config.js','utf8'),context);
 const target=refs.find(r=>r.d==='Marco Bellocchio'&&r.t==='El rapto');assert(target);
 const full=await context.FilmotecaFestivals.withReference({t:target.t,d:target.d,y:target.y,p:'approved'});assert.equal(full.u,target.u);assert.equal(full.p,'approved');
 const external=await context.FilmotecaFestivals.withReference({t:target.t,d:target.d,y:target.y,u:'https://www.themoviedb.org/movie/1'});assert.equal(external.u,target.u);
 const other={t:target.t,d:'Otro director',y:target.y};assert.equal(await context.FilmotecaFestivals.withReference(other),other);assert.equal(requests,5);
});
test('2025 additions preserve personal nominations, sections and corrected Sundance awards',()=>{
 const context=vm.createContext({});vm.runInContext(fs.readFileSync('app/festival-config.js','utf8'),context);
 for(const f of ['Globos de Oro','David di Donatello','Ariel'])assert(context.FilmotecaFestivals.isAward(f));
 for(const f of ['Locarno','Sundance'])assert(!context.FilmotecaFestivals.isAward(f));
 for(const [family,noms,wins] of [['Globos de Oro',92,15],['David di Donatello',127,26],['Ariel',127,25]]){
  const films=db.filter(e=>e.festival===family).flatMap(e=>e.films);
  assert.equal(films.reduce((n,f)=>n+f.nominations.length,0),noms);assert.equal(films.reduce((n,f)=>n+f.wins.length,0),wins);
  for(const f of films){assert.equal(f.nominations.length,new Set(f.nominations).size);if(f.nominations.length)for(const w of f.wins)assert(f.nominations.includes(w));}
 }
 const emilia=db.find(e=>e.festival==='Globos de Oro').films.find(f=>f.title==='Emilia Pérez');
 assert.equal(emilia.nominations.filter(n=>n.startsWith('Actriz de reparto')).length,2);assert(emilia.nominations.some(n=>n.includes('Selena Gomez')));assert(emilia.nominations.some(n=>n.includes('Mi Camino')));
 const ariel=db.find(e=>e.festival==='Ariel');assert.equal(ariel.films.filter(f=>/párvulos/i.test(f.title)).length,1);
 const sundance=db.filter(e=>e.festival==='Sundance');assert.equal(sundance.slice(0,5).reduce((n,e)=>n+e.films.length,0),48);
 const twinless=sundance.flatMap(e=>e.films).find(f=>f.title==='Twinless'||f.aliases.includes('Twinless'));assert(twinless.wins.includes('Audience Award: U.S. Dramatic'));
 const seeds=sundance.flatMap(e=>e.films).find(f=>f.title==='Seeds'||f.aliases.includes('Seeds'));assert.equal(seeds.wins.length,2);
 const locarno=db.filter(e=>e.festival==='Locarno');assert.equal(locarno.filter(e=>e.section==='Semaine de la Critique').length,1);assert.equal(locarno.find(e=>e.section==='Semaine de la Critique').films.length,2);
 for(const e of [...sundance,...locarno].filter(e=>/corto|short film/i.test(e.section)))assert(e.films.every(f=>f.wins.length));
});
test('2024 new awards retain all nominations and the Cannes shared acting prize',()=>{
 const editions=JSON.parse(fs.readFileSync('data/festivals/years/2024.json')).editions;
 for(const [family,noms,wins] of [['Globos de Oro',92,15],['David di Donatello',120,25],['Ariel',126,25]]){
  const films=editions.filter(e=>e.festival===family).flatMap(e=>e.films);
  assert.equal(films.reduce((n,f)=>n+f.nominations.length,0),noms);assert.equal(films.reduce((n,f)=>n+f.wins.length,0),wins);
  for(const f of films)if(f.nominations.length)for(const w of f.wins)assert(f.nominations.includes(w));
 }
 const emilia=editions.find(e=>e.festival==='Cannes'&&e.section==='Competición oficial').films.find(f=>f.title==='Emilia Pérez');
 for(const name of ['Adriana Paz','Zoe Saldaña','Karla Sofía Gascón','Selena Gomez'])assert(emilia.wins.some(w=>w.includes(name)));
 const locarno=editions.filter(e=>e.festival==='Locarno');assert.equal(locarno[0].films.length,17);assert.equal(locarno[1].films.length,15);
 for(const e of locarno.filter(e=>/corto/.test(e.section)))assert(e.films.every(f=>f.wins.length&&!f.wins.every(w=>w.startsWith('Candidato al European Film Awards'))));
});
test('all 15 families have distinct usable icon targets and shared SVG symbols exist',()=>{
 const context=vm.createContext({});vm.runInContext(fs.readFileSync('app/festival-config.js','utf8'),context);const config=context.FilmotecaFestivals.config;
 assert.equal(new Set(Object.values(config).map(c=>c.icon)).size,15);
 const sprite=fs.readFileSync('app/festival-icons.svg','utf8');
 for(const item of Object.values(config))if(item.icon.includes('festival-icons.svg'))assert(sprite.includes('id="'+item.icon.split('#')[1]+'"'));
});
test('2022–2023 additions preserve complete award counts, corrected shorts and separate film years',()=>{
 for(const [year,expected] of [[2022,{globos:70,david:118,ariel:117,davidWins:26,arielWins:26}],[2023,{globos:70,david:117,ariel:117,davidWins:25,arielWins:25}]]){
  const editions=JSON.parse(fs.readFileSync(`data/festivals/years/${year}.json`)).editions;
  for(const [family,noms,wins] of [['Globos de Oro',expected.globos,14],['David di Donatello',expected.david,expected.davidWins],['Ariel',expected.ariel,expected.arielWins]]){
   const films=editions.filter(e=>e.festival===family).flatMap(e=>e.films);assert.equal(films.reduce((n,f)=>n+f.nominations.length,0),noms);assert.equal(films.reduce((n,f)=>n+f.wins.length,0),wins);
   for(const f of films){assert.equal(f.nominations.length,new Set(f.nominations).size);if(f.nominations.length)for(const w of f.wins)assert(f.nominations.includes(w));}
  }
  const sundance=editions.filter(e=>e.festival==='Sundance');assert.equal(sundance.slice(0,4).reduce((n,e)=>n+e.films.length,0),year===2023?48:40);
  const shorts=sundance.find(e=>/Short Film/.test(e.section)).films;
  if(year===2023)for(const [title,director] of [['Rest Stop','Crystal Kayiza'],['The Kidnapping of the Bride','Sophia Mocorrea'],['AliEN0089','Valeria Hofmann'],['The Vacation','Jarreau Carrillo']])assert.equal(shorts.find(f=>f.title===title).director,director);
  else assert(sundance.find(e=>e.section==='U.S. Documentary Competition').films.some(f=>f.title==='Navalny'||f.aliases.includes('Navalny')));
  const venice=editions.find(e=>e.festival==='Venecia').films;const film=venice.find(f=>f.title===(year===2023?'Io Capitano':'Bones and All'));assert(film.award.includes(year===2023?'Matteo Garrone':'Luca Guadagnino'));assert(film.award.includes(year===2023?'Seydou Sarr':'Taylor Russell'));
 }
});
test('2026 has fifteen families, complete structured awards and Seminci still in competition',()=>{
 const editions=JSON.parse(fs.readFileSync('data/festivals/years/2026.json')).editions;assert.equal(new Set(editions.map(e=>e.festival)).size,15);
 for(const [family,nominations,wins,categories] of [['Oscar',125,25,24],['Globos de Oro',92,15,15],['César',110,24,24],['David di Donatello',129,26,25],['Ariel',122,28,25]]){
  const films=editions.filter(e=>e.festival===family).flatMap(e=>e.films);assert.equal(films.reduce((n,f)=>n+f.nominations.length,0),nominations);assert.equal(films.reduce((n,f)=>n+f.wins.length,0),wins);assert.equal(new Set(films.flatMap(f=>f.nominations.map(n=>n.split(' · ')[0]))).size,categories);
  for(const f of films){assert.equal(new Set(f.nominations).size,f.nominations.length);if(f.nominations.length)for(const w of f.wins)assert(f.nominations.includes(w));}
 }
 const seminci=editions.find(e=>e.festival==='Seminci');assert.equal(seminci.films.length,22);assert.equal(seminci.status,'in_progress');assert(seminci.section.includes('pendiente'));assert(seminci.films.every(f=>!f.wins.length&&f.award==='En competición'));
 const oscar=editions.find(e=>e.festival==='Oscar');assert.equal(oscar.films.flatMap(f=>f.wins).filter(w=>w.startsWith('Cortometraje de ficción')).length,2);assert(oscar.films.some(f=>f.nominations.some(n=>n.startsWith('Casting'))));
 const david=editions.find(e=>e.festival==='David di Donatello');const leading=david.films.find(f=>f.aliases.includes('LE CITTÀ DI PIANURA'));assert(leading.wins.some(w=>w.includes('Sergio ROMANO')));assert(!leading.wins.some(w=>w.includes('Pierpaolo CAPOVILLA')));
 const locarno=editions.filter(e=>e.festival==='Locarno');assert.equal(locarno.find(e=>e.section==='Semaine de la Critique').films.length,2);assert(locarno.find(e=>e.section.includes('cortometrajes')).films.some(f=>f.title==='Private Property'));
});
