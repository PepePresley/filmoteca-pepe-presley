import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const nonempty = value => typeof value === 'string' && value.trim().length > 0;
const editionKey = edition => JSON.stringify([edition.festival, edition.year, edition.section]);
const validYear = year => Number.isInteger(year) && year >= 1895 && year <= 2100;

// The manifest preserves the established edition order, including editions
// originally appended outside chronological order. Annual files own the data.
export function compileFestivals(sourceDirectory = 'data/festivals') {
  const manifest = JSON.parse(fs.readFileSync(path.join(sourceDirectory, 'years/index.json'), 'utf8'));
  if (manifest.schemaVersion !== 1) throw new Error('Unsupported festival source schema');
  if (!manifest.metadata || Array.isArray(manifest.metadata) || typeof manifest.metadata !== 'object'
      || Object.hasOwn(manifest.metadata, 'editions')
      || !Number.isInteger(manifest.metadata.version) || manifest.metadata.version < 1) {
    throw new Error('Invalid festival metadata');
  }
  if (!Array.isArray(manifest.editionOrder)) throw new Error('Missing edition order');

  const editions = new Map();
  const yearsDirectory = path.join(sourceDirectory, 'years');
  for (const filename of fs.readdirSync(yearsDirectory).filter(name => name.endsWith('.json') && name !== 'index.json').sort()) {
    if (!/^\d{4}\.json$/.test(filename)) throw new Error('Unexpected annual source: ' + filename);
    const year = Number(filename.slice(0, 4));
    const annual = JSON.parse(fs.readFileSync(path.join(yearsDirectory, filename), 'utf8'));
    if (!validYear(year) || annual.year !== year || !Array.isArray(annual.editions) || !annual.editions.length) {
      throw new Error('Invalid annual source: ' + filename);
    }
    for (const edition of annual.editions) {
      if (edition.year !== year || !nonempty(edition.festival) || !nonempty(edition.section)
          || !Array.isArray(edition.films)) throw new Error('Invalid edition in ' + filename);
      const key = editionKey(edition);
      if (editions.has(key)) throw new Error('Duplicate edition: ' + key);
      const filmIdentities = new Set();
      for (const film of edition.films) {
        if (!film || !nonempty(film.title)) throw new Error('Missing film title in ' + key);
        const identity = JSON.stringify([film.title, film.director || '']);
        if (filmIdentities.has(identity)) throw new Error('Duplicate film in ' + key + ': ' + film.title);
        filmIdentities.add(identity);
      }
      editions.set(key, edition);
    }
  }

  const ordered = [];
  const seen = new Set();
  for (const entry of manifest.editionOrder) {
    if (!Array.isArray(entry) || entry.length !== 3 || !nonempty(entry[0])
        || !validYear(entry[1]) || !nonempty(entry[2])) throw new Error('Invalid edition order entry');
    const key = JSON.stringify(entry);
    if (seen.has(key)) throw new Error('Duplicate edition order entry: ' + key);
    if (!editions.has(key)) throw new Error('Missing annual edition: ' + key);
    seen.add(key);
    ordered.push(editions.get(key));
  }
  if (seen.size !== editions.size) {
    const unlisted = [...editions.keys()].filter(key => !seen.has(key));
    throw new Error('Annual editions missing from manifest: ' + unlisted.join(', '));
  }
  return {...manifest.metadata, editions: ordered};
}

export const serializeFestivals = database => JSON.stringify(database) + '\n';

export function buildFestivals({sourceDirectory = 'data/festivals', output, check = false} = {}) {
  const target = output || path.join(sourceDirectory, 'festivals.json');
  const database = compileFestivals(sourceDirectory);
  const content = serializeFestivals(database);
  if (check) {
    if (!fs.existsSync(target) || !fs.readFileSync(target).equals(Buffer.from(content))) {
      throw new Error('festivals.json is stale; run node scripts/build-festivals.mjs');
    }
  } else {
    // Validate everything before replacing the published artifact atomically.
    const temporary = target + '.' + process.pid + '.tmp';
    let descriptor = fs.openSync(temporary, 'wx');
    try {
      fs.writeFileSync(descriptor, content);
      fs.closeSync(descriptor);
      descriptor = null;
      fs.renameSync(temporary, target);
    } finally {
      if (descriptor !== null) fs.closeSync(descriptor);
      if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
    }
  }
  return {
    years: new Set(database.editions.map(edition => edition.year)).size,
    editions: database.editions.length,
    films: database.editions.reduce((sum, edition) => sum + edition.films.length, 0),
    bytes: Buffer.byteLength(content),
    check,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const options = {};
    for (const argument of process.argv.slice(2)) {
      if (argument === '--check') options.check = true;
      else if (argument.startsWith('--source-dir=')) options.sourceDirectory = argument.slice(13);
      else if (argument.startsWith('--output=')) options.output = argument.slice(9);
      else throw new Error('Unknown argument: ' + argument);
    }
    console.log(JSON.stringify(buildFestivals(options)));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
