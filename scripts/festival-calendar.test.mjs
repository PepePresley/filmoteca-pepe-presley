import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

for(const app of ['lab','lab-lite'])test(`${app}: canceled editions remain visible without inventing festival data`,()=>{
 const html=fs.readFileSync(app+'/index.html','utf8');
 const start=html.indexOf('function festivalCalendarYears(');
 const end=html.indexOf('function rebuildFestivalYears(',start);
 const c=vm.createContext({});vm.runInContext(html.slice(start,end),c);
 assert.deepEqual(Array.from(c.festivalCalendarYears('Cannes',[1951,1949,1947,1946])),[1951,1950,1949,1948,1947,1946]);
 assert.deepEqual(Array.from(c.festivalCalendarYears('Cannes',[1948,1950,1949])),[1950,1949,1948]);
 assert.deepEqual(Array.from(c.festivalCalendarYears('Oscar',[1949,1948,1947])),[1949,1948,1947]);
 for(const y of [1948,1950]){
  const button=c.festivalCalendarButton('Cannes',y);
  assert.match(button,/ disabled /);assert.match(button,/No se celebró/);
  assert.match(button,new RegExp(`aria-label="${y}: no se celebró"`));
 }
 assert.doesNotMatch(c.festivalCalendarButton('Cannes',1949),/disabled|No se celebró/);
 assert.doesNotMatch(c.festivalCalendarButton('Oscar',1948),/disabled|No se celebró/);
});
