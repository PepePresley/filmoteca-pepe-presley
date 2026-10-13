import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildFestivals, compileFestivals, serializeFestivals} from './build-festivals.mjs';

const repository = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function fixture(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'filmoteca-sources-'));
  t.after(() => fs.rmSync(directory, {recursive: true, force: true}));
  fs.mkdirSync(path.join(directory, 'years'));
  const cannes = {festival: 'Cannes', year: 2000, section: 'Competición', films: [
    {title: 'Winner', director: 'Director A', award: 'Palma de Oro', aliases: ['Alias'], extra: {keep: true}},
    {title: 'Selection', director: 'Director B', award: 'En competición'},
  ]};
  const berlin = {festival: 'Berlín', year: 1999, section: 'Competición', films: [{title: 'Film', award: 'Oso de Oro'}]};
  const oscar = {festival: 'Oscar', year: 2000, section: 'Premios', films: [
    {title: 'Nominee', nominations: ['Película', 'Guion'], wins: ['Guion']},
  ]};
  const expected = {version: 7, editions: [cannes, berlin, oscar]};
  const write = (filename, value) => fs.writeFileSync(path.join(directory, filename), JSON.stringify(value));
  const manifest = {schemaVersion: 1, metadata: {version: 7}, editionOrder: expected.editions.map(e => [e.festival, e.year, e.section])};
  write('years/index.json', manifest);
  write('years/1999.json', {year: 1999, editions: [berlin]});
  write('years/2000.json', {year: 2000, editions: [cannes, oscar]});
  return {directory, write, manifest, expected, cannes, berlin, oscar};
}

test('all published data regenerates byte for byte from annual sources', () => {
  const source = path.join(repository, 'data/festivals');
  const published = fs.readFileSync(path.join(source, 'festivals.json'));
  assert.deepEqual(compileFestivals(source), JSON.parse(published));
  assert.deepEqual(Buffer.from(serializeFestivals(compileFestivals(source))), published);
});

test('preserves edition order, film order, award categories and extra fields', t => {
  const f = fixture(t);
  assert.deepEqual(compileFestivals(f.directory), f.expected);
});

test('editing one annual source leaves other years intact', t => {
  const f = fixture(t);
  f.cannes.films[0].filmaffinityTitle = 'Registered title';
  f.write('years/2000.json', {year: 2000, editions: [f.cannes, f.oscar]});
  const result = compileFestivals(f.directory);
  assert.deepEqual(result.editions[1], f.berlin);
  assert.deepEqual(result.editions[2], f.oscar);
  assert.equal(result.editions[0].films[0].filmaffinityTitle, 'Registered title');
  assert.equal(result.editions[0].films[0].award, 'Palma de Oro');
});

test('rejects missing, unlisted and duplicated editions', t => {
  const f = fixture(t);
  f.write('years/2000.json', {year: 2000, editions: [f.cannes]});
  assert.throws(() => compileFestivals(f.directory), /Missing annual edition/);
  f.write('years/2000.json', {year: 2000, editions: [f.cannes, f.oscar, f.cannes]});
  assert.throws(() => compileFestivals(f.directory), /Duplicate edition/);
  f.write('years/2000.json', {year: 2000, editions: [f.cannes, f.oscar]});
  f.manifest.editionOrder.pop();
  f.write('years/index.json', f.manifest);
  assert.throws(() => compileFestivals(f.directory), /missing from manifest/);
  f.manifest.editionOrder.push(f.manifest.editionOrder[0]);
  f.write('years/index.json', f.manifest);
  assert.throws(() => compileFestivals(f.directory), /Duplicate edition order/);
});

test('rejects wrong years, duplicated films and unsupported schemas', t => {
  const f = fixture(t);
  f.write('years/2000.json', {year: 2001, editions: [f.cannes, f.oscar]});
  assert.throws(() => compileFestivals(f.directory), /Invalid annual source/);
  f.cannes.year = 2001;
  f.write('years/2000.json', {year: 2000, editions: [f.cannes, f.oscar]});
  assert.throws(() => compileFestivals(f.directory), /Invalid edition/);
  f.cannes.year = 2000;
  f.cannes.films.push(f.cannes.films[0]);
  f.write('years/2000.json', {year: 2000, editions: [f.cannes, f.oscar]});
  assert.throws(() => compileFestivals(f.directory), /Duplicate film/);
  f.manifest.schemaVersion = 99;
  f.write('years/index.json', f.manifest);
  assert.throws(() => compileFestivals(f.directory), /Unsupported festival source schema/);
});

test('detects stale output without changing it and writes deterministically', t => {
  const f = fixture(t);
  const output = path.join(f.directory, 'festivals.json');
  fs.writeFileSync(output, 'previous artifact');
  assert.throws(() => buildFestivals({sourceDirectory: f.directory, check: true}), /stale/);
  assert.equal(fs.readFileSync(output, 'utf8'), 'previous artifact');
  buildFestivals({sourceDirectory: f.directory});
  const first = fs.readFileSync(output);
  buildFestivals({sourceDirectory: f.directory});
  assert.deepEqual(fs.readFileSync(output), first);
  assert.doesNotThrow(() => buildFestivals({sourceDirectory: f.directory, check: true}));
  f.write('years/2000.json', {year: 2001, editions: []});
  assert.throws(() => buildFestivals({sourceDirectory: f.directory}), /Invalid annual source/);
  assert.deepEqual(fs.readFileSync(output), first);
});
