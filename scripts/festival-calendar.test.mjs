import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

for(const app of ['lab','lab-lite'])test(`${app}: canceled editions remain visible without inventing festival data`,()=>{
 const html=fs.readFileSync(app+'/index.html','utf8');
 const start=html.indexOf('function festivalCalendarExceptions(');
 const end=html.indexOf('function rebuildFestivalYears(',start);
 const c=vm.createContext({});vm.runInContext(html.slice(start,end),c);
 assert.deepEqual(Array.from(c.festivalCalendarYears('Cannes',[1951,1949,1947,1946])),[1951,1950,1949,1948,1947,1946,1945,1944,1943,1942,1941,1940]);
 assert.equal(Array.from(c.festivalCalendarYears('Cannes',[1948,1950,1949])).filter(y=>y===1948).length,1);
 assert.deepEqual(Array.from(c.festivalCalendarYears('Oscar',[1949,1948,1947])),[1949,1948,1947,1933]);
 for(const y of [1948,1950]){
  const button=c.festivalCalendarButton('Cannes',y);
  assert.match(button,/ disabled /);assert.match(button,/No se celebró/);
  assert.match(button,new RegExp(`aria-label="${y}: No se celebró"`));
 }
 assert.doesNotMatch(c.festivalCalendarButton('Cannes',1949),/disabled|No se celebró/);
 assert.doesNotMatch(c.festivalCalendarButton('Oscar',1948),/disabled|No se celebró/);
 assert.match(c.festivalCalendarButton('Oscar',1933),/Sin ceremonia/);
 assert.match(c.festivalCalendarButton('Venecia',1977),/Programa especial/);
 assert.doesNotMatch(c.festivalCalendarButton('Venecia',1977),/No se celebró/);
 assert.match(c.festivalCalendarButton('Venecia',1978),/No se celebró/);
 assert.match(c.festivalCalendarButton('Venecia',1973),/Sin Mostra oficial/);
 for(const f of ['Berlín','San Sebastián','BAFTA','Goya'])assert.deepEqual(Array.from(c.festivalCalendarYears(f,[2026,2025])),[2026,2025]);
 for(const y of [1939,1968,2020])assert.doesNotMatch(c.festivalCalendarButton('Cannes',y),/disabled/);
});
