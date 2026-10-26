import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const rows=JSON.parse(fs.readFileSync('data/catalog/annual_1948_overlay.json'));
for(const app of ['lab','lab-lite'])test(`${app}: approved 1948 references survive festival summaries and preserve pending copies`,async()=>{
 const html=fs.readFileSync(app+'/index.html','utf8');
 for(const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g))if(!/src=|application\/json/.test(m[1]))new vm.Script(m[2]);
 const box={children:[],style:{},replaceChildren(){this.children=[]},appendChild(node){this.children.push(node)}};
 let fetches=0;
 const movie=rows.find(r=>r.t==='Blonde Ice');
 const fixture={...movie,copias:[...movie.copias,{u:'https://t.me/c/2158944187/999999',arch:'Copia por comprobar.mp4',revisionPendiente:true}]};
 const c=vm.createContext({fetch:async()=>{fetches++;return {ok:true,json:async()=>rows.map(r=>r.u===movie.u?fixture:r)}},$:()=>box,document:{createElement:()=>({style:{}})}});
 vm.runInContext(html.slice(html.indexOf('let catalog1948References;'),html.indexOf('async function openModal(')),c);
 const hit={t:movie.t,y:1948,d:movie.d,p:movie.p,dur:movie.dur,i:999999};
 const full=await c.recordWithCopies(hit);
 assert.equal(full.u,'https://t.me/c/2158944187/466');
 assert.equal(full.copias.length,2);
 c.renderCopyReferences(full);
 assert.equal(box.children.length,1);
 assert.equal(box.children[0].href,'https://t.me/c/2158944187/999999');
 assert.match(box.children[0].textContent,/pendiente de comprobar/);
 assert.match(box.children[0].textContent,/Copia por comprobar/);
 const again=await c.recordWithCopies(hit);assert.equal(fetches,1);assert.equal(again.i,hit.i);
 assert.equal(await c.recordWithCopies(movie),movie);
 const unrelated={t:'Otra',y:1942};assert.equal(await c.recordWithCopies(unrelated),unrelated);assert.equal(fetches,1);
 c.renderCopyReferences({copias:[]});assert.equal(box.children.length,0);assert.equal(box.style.display,'none');
});

test('master years remain separate from the 1948 catalog grouping and wrong poster fallback stays blocked',()=>{
 assert.equal(rows.length,270);
 assert.equal(rows.reduce((n,r)=>n+r.copias.length,0),270);
 assert(rows.every(r=>r.y===1948));
 assert.equal(rows.find(r=>r.t==='Les feux de la mer').masterYear,undefined);
 assert.equal(rows.find(r=>r.t.includes('Problemas meca')).masterYear,1947);
 for(const part of ['part II: Lysis','part III: Charmides']){
  const r=rows.find(r=>r.t.includes(part));assert(!r.p);assert.equal(r.noPosterFallback,true);
 }
 const links=rows.flatMap(r=>r.copias.map(c=>c.u));assert.equal(new Set(links).size,270);
});

test('1946 and 1947 retain every Telegram copy, distinct versions and unresolved evidence',()=>{
 for(const [year,count] of [[1946,215],[1947,230]]){
  const annual=JSON.parse(fs.readFileSync(`data/catalog/annual_${year}_overlay.json`));
  assert.equal(annual.length,count);assert(annual.every(r=>r.y===year));
  const urls=annual.flatMap(r=>r.copias.map(c=>c.u));assert.equal(new Set(urls).size,count);
  for(const app of ['lab','lab-lite']){
   const html=fs.readFileSync(app+'/index.html','utf8');
   assert(html.includes(`annual_${year}_overlay.json?v=master-${year}-${year===1946?'20261024':'20261025'}`));
   assert(html.includes('(1943|1944|1945|1946|1947|1948|2024)'));
  }
  if(year===1947){
   const color=annual.find(r=>r.u.endsWith('/132'));
   assert.match(color.t,/coloreada/);assert.match(color.ot,/coloreada/);
   assert.notEqual(color.t,annual.find(r=>r.u.endsWith('/7')).t);
  }else{
   const film=annual.find(r=>r.u.endsWith('/444'));
   assert.equal(film.dur,103);assert.equal(film.copias[0].videoDurationSeconds,5883);
   assert(!film.copias[0].revisionPendiente);
   const casey=annual.find(r=>r.u.endsWith('/410'));assert.equal(casey.d,'Jack Kinney');assert.equal(casey.masterYear,undefined);assert(!casey.identityPending);
  }
 }
});

test('1945 reconciles user-removed duplicate copies and the replacement Back to Bataan file',()=>{
 const annual=JSON.parse(fs.readFileSync('data/catalog/annual_1945_overlay.json'));
 assert.equal(annual.length,189);assert(annual.every(r=>r.y===1945));
 const copies=annual.flatMap(r=>r.copias);assert.equal(copies.length,189);assert.equal(new Set(copies.map(c=>c.u)).size,189);
 assert(!copies.some(c=>c.u.endsWith('/277')||c.u.endsWith('/357')));
 for(const suffix of ['/309','/367']){
  const r=annual.find(r=>r.u.endsWith(suffix));assert(!r.p);assert(r.noPosterFallback);
 }
 assert.equal(annual.find(r=>r.u.endsWith('/309')).o,'The Legend of Coyote Rock');
 assert.equal(annual.find(r=>r.u.endsWith('/367')).o,'The Clock Watcher');
 const film=annual.find(r=>r.copias.some(c=>c.u.endsWith('/333')));
 assert.equal(film.copias.length,1);assert.equal(film.copias[0].videoDurationSeconds,5682);assert(!film.copias[0].revisionPendiente);
 assert.equal(annual.filter(r=>r.masterYear===1946).length,2);
 for(const app of ['lab','lab-lite'])assert(fs.readFileSync(app+'/index.html','utf8').includes('annual_1945_overlay.json?v=master-1945-20261025'));
});

test('corrected 1947 and 1948 identities cannot recover posters or copies from other films',()=>{
 const r47=JSON.parse(fs.readFileSync('data/catalog/annual_1947_overlay.json'));
 const aroma=r47.find(r=>r.u.endsWith('/312'));
 assert.equal(aroma.o,'Scent-imental Over You');assert(!aroma.p);assert(aroma.noPosterFallback);
 const children=rows.find(r=>r.u.endsWith('/183'));
 assert.equal(children.d,'Hiroshi Shimizu');assert(!children.p);assert(children.noPosterFallback);
 const odor=rows.find(r=>r.u.endsWith('/576'));
 assert.equal(odor.o,'Odor of the Day');assert.equal(odor.d,'Arthur Davis');assert(!odor.p);
 const waters=rows.find(r=>r.u.endsWith('/454'));
 const ice=rows.find(r=>r.u.endsWith('/466'));
 assert.equal(waters.o,'Deep Waters');assert.equal(waters.d,'Henry King');
 assert.equal(ice.t,'Blonde Ice');assert.equal(ice.copias.length,1);assert.equal(waters.copias.length,1);
 assert(!ice.copias.some(c=>c.revisionPendiente));
});

test('1944 keeps all references and separates confirmed Raduga from the unrelated short',()=>{
 const annual=JSON.parse(fs.readFileSync('data/catalog/annual_1944_overlay.json'));
 assert.equal(annual.length,182);assert(annual.every(r=>r.y===1944));
 const copies=annual.flatMap(r=>r.copias);assert.equal(copies.length,182);assert.equal(new Set(copies.map(c=>c.u)).size,182);
 const raduga=annual.find(r=>r.u.endsWith('/161'));
 assert.equal(raduga.o,'Raduga');assert.equal(raduga.d,'Mark Donskoy');assert.equal(raduga.dur,93);assert.equal(raduga.copias[0].videoDurationSeconds,5162);
 assert.equal(annual.find(r=>r.u.endsWith('/74')).o,'Days of Glory');
 assert.equal(annual.find(r=>r.u.endsWith('/122')).o,'Uncertain Glory');
 const guadalcanal=annual.find(r=>r.u.endsWith('/358'));assert.equal(guadalcanal.d,'Ray Harryhausen');assert.equal(guadalcanal.masterYear,1943);
 assert.equal(annual.filter(r=>r.masterYear).length,6);
 for(const app of ['lab','lab-lite'])assert(fs.readFileSync(app+'/index.html','utf8').includes('annual_1944_overlay.json?v=master-1944-20261026'));
});

test('1943 preserves inventory and separates corrected homonyms and Superman shorts',()=>{
 const annual=JSON.parse(fs.readFileSync('data/catalog/annual_1943_overlay.json'));
 assert.equal(annual.length,190);assert(annual.every(r=>r.y===1943));
 const copies=annual.flatMap(r=>r.copias);assert.equal(copies.length,190);assert.equal(new Set(copies.map(c=>c.u)).size,190);
 const at=id=>annual.find(r=>r.u.endsWith('/'+id));
 assert.equal(at(89).d,'Jean Grémillon');assert.equal(at(95).d,'Andrew L. Stone');
 assert.equal(at(238).o,'Calling Dr. Death');assert.equal(at(320).o,'The Return of the Vampire');
 assert.equal(at(342).o,'Secret Agent');assert.equal(at(384).o,'The Mummy Strikes');
 assert.equal(at(23).copias[0].videoDurationSeconds,8073);assert.equal(at(23).dur,120);
 for(const app of ['lab','lab-lite'])assert(fs.readFileSync(app+'/index.html','utf8').includes('annual_1943_overlay.json?v=master-1943-20261026'));
});
