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
 const c=vm.createContext({fetch:async()=>{fetches++;return {ok:true,json:async()=>rows}},$:()=>box,document:{createElement:()=>({style:{}})}});
 vm.runInContext(html.slice(html.indexOf('let catalog1948References;'),html.indexOf('async function openModal(')),c);
 const movie=rows.find(r=>r.t==='Blonde Ice');
 const hit={t:movie.t,y:1948,d:movie.d,p:movie.p,dur:movie.dur,i:999999};
 const full=await c.recordWithCopies(hit);
 assert.equal(full.u,'https://t.me/c/2158944187/466');
 assert.equal(full.copias.length,2);
 c.renderCopyReferences(full);
 assert.equal(box.children.length,1);
 assert.equal(box.children[0].href,'https://t.me/c/2158944187/454');
 assert.match(box.children[0].textContent,/pendiente de comprobar/);
 assert.match(box.children[0].textContent,/Sombras en el mar/);
 const again=await c.recordWithCopies(hit);assert.equal(fetches,1);assert.equal(again.i,hit.i);
 assert.equal(await c.recordWithCopies(movie),movie);
 const unrelated={t:'Otra',y:1944};assert.equal(await c.recordWithCopies(unrelated),unrelated);assert.equal(fetches,1);
 c.renderCopyReferences({copias:[]});assert.equal(box.children.length,0);assert.equal(box.style.display,'none');
});

test('master years remain separate from the 1948 catalog grouping and wrong poster fallback stays blocked',()=>{
 assert.equal(rows.length,269);
 assert.equal(rows.reduce((n,r)=>n+r.copias.length,0),270);
 assert(rows.every(r=>r.y===1948));
 assert.equal(rows.find(r=>r.t==='Les feux de la mer').masterYear,1949);
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
   assert(html.includes(`annual_${year}_overlay.json?v=master-${year}-20261024`));
   assert(html.includes('(1945|1946|1947|1948|2024)'));
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

test('1945 retains all 191 copies, corrected short identities and shifted master years',()=>{
 const annual=JSON.parse(fs.readFileSync('data/catalog/annual_1945_overlay.json'));
 assert.equal(annual.length,189);assert(annual.every(r=>r.y===1945));
 const copies=annual.flatMap(r=>r.copias);assert.equal(copies.length,191);assert.equal(new Set(copies.map(c=>c.u)).size,191);
 for(const suffix of ['/309','/367']){
  const r=annual.find(r=>r.u.endsWith(suffix));assert(!r.p);assert(r.noPosterFallback);
 }
 assert.equal(annual.find(r=>r.u.endsWith('/309')).o,'The Legend of Coyote Rock');
 assert.equal(annual.find(r=>r.u.endsWith('/367')).o,'The Clock Watcher');
 const film=annual.find(r=>r.copias.some(c=>c.u.endsWith('/333')));
 assert.equal(film.copias.length,2);assert(film.copias.every(c=>c.revisionPendiente));
 assert.equal(annual.filter(r=>r.masterYear===1946).length,2);
 for(const app of ['lab','lab-lite'])assert(fs.readFileSync(app+'/index.html','utf8').includes('annual_1945_overlay.json?v=master-1945-20261025'));
});
