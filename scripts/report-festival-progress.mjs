import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const readJson = filename => JSON.parse(fs.readFileSync(filename, 'utf8'));
const safeList = values => values.length ? values.join(', ') : 'ninguno';

function buildReport(rootDirectory = '.', {year: selectedYear = null, allYears = false} = {}) {
  const root = path.resolve(rootDirectory);
  const dataRoot = path.join(root, 'data/festivals');
  const relative = filename => path.relative(root, filename).split(path.sep).join('/');
  const indexPath = path.join(dataRoot, 'years/index.json');
  const index = readJson(indexPath);
  if (!Array.isArray(index.editionOrder)) throw new Error('Falta editionOrder en years/index.json');

  const editionsByYear = new Map();
  for (const row of index.editionOrder) {
    if (!Array.isArray(row) || !Number.isInteger(row[1])) throw new Error('Entrada inválida en editionOrder');
    editionsByYear.set(row[1], (editionsByYear.get(row[1]) || 0) + 1);
  }

  const annualDirectory = path.join(dataRoot, 'years');
  const annualFiles = new Set(fs.readdirSync(annualDirectory)
    .filter(name => /^\d{4}\.json$/.test(name) && name !== 'index.json')
    .map(name => Number(name.slice(0, 4))));
  const indexedYears = [...editionsByYear.keys()].sort((a, b) => a - b);
  const missingAnnual = indexedYears.filter(year => !annualFiles.has(year));
  const unindexedAnnual = [...annualFiles].filter(year => !editionsByYear.has(year)).sort((a, b) => a - b);

  const coverageFiles = [
    'sources/cobertura_hasta_2015.json',
    'sources/cobertura_desde_2016.json',
  ];
  const coverage = coverageFiles.map(file => {
    const filename = path.join(dataRoot, file);
    if (!fs.existsSync(filename)) return {file, data: null};
    return {file, data: readJson(filename)};
  });
  const coverageYears = new Map();
  for (const item of coverage) {
    for (const entry of item.data?.years || []) {
      const records = coverageYears.get(entry.year) || [];
      records.push({file: item.file, entry, summary: item.data});
      coverageYears.set(entry.year, records);
    }
  }

  const constructionDirectory = path.join(dataRoot, 'sources');
  const constructionFiles = fs.readdirSync(constructionDirectory)
    .filter(name => /^construccion_\d{4}\.json$/.test(name)).sort();
  const constructionByYear = new Map();
  for (const name of constructionFiles) {
    const filename = path.join(constructionDirectory, name);
    const record = readJson(filename);
    if (!Number.isInteger(record.year)) continue;
    constructionByYear.set(record.year, {record, file: relative(filename)});
  }

  const followUpFiles = fs.readdirSync(constructionDirectory)
    .filter(name => /^(?:suplemento|incorporacion)_.*\.json$/.test(name)).sort();
  const followUpsByYear = new Map();
  for (const name of followUpFiles) {
    const filename = path.join(constructionDirectory, name);
    const match = name.match(/_(\d{4})(?:_(\d{4}))?(?:_20\d{2}-\d{2}-\d{2})?\.json$/);
    if (!match) continue;
    const record = readJson(filename);
    const firstYear = Number(match[1]);
    const lastYear = Number(match[2] || match[1]);
    const entry = {
      file: relative(filename),
      date: record.date || record.closedOn || record.completionDate || '',
      status: record.status || record.coverageStatus || '',
    };
    for (let year = firstYear; year <= lastYear; year++) {
      const entries = followUpsByYear.get(year) || [];
      entries.push(entry);
      followUpsByYear.set(year, entries);
    }
  }

  const sourceYears = new Set([...indexedYears, ...constructionByYear.keys()]);
  const yearsWithoutStatusSource = [...sourceYears].filter(year =>
    !coverageYears.has(year) && !constructionByYear.has(year)).sort((a, b) => a - b);
  const statusCounts = new Map();
  for (const {record} of constructionByYear.values()) {
    const status = record.status || 'SIN ESTADO';
    statusCounts.set(status, (statusCounts.get(status) || 0) + 1);
  }

  const lines = [
    '# Inventario de avance Filmoteca LAB',
    '',
    `Índice de ediciones: versión ${index.metadata?.version ?? 'desconocida'}; ${indexedYears.length} años; ${index.editionOrder.length} ediciones.`,
    `Fuentes anuales presentes: ${annualFiles.size}; índice sin fuente anual: ${missingAnnual.length}; fuentes fuera del índice: ${unindexedAnnual.length}.`,
    '',
    '## Cobertura declarada',
    '',
    'Estos resúmenes confirman presencia de ediciones y secciones principales; no certifican la revisión de cada película.',
  ];

  for (const item of coverage) {
    const data = item.data;
    if (!data) {
      lines.push(`- **${item.file}:** no encontrado.`);
      continue;
    }
    const span = data.years?.length
      ? `${data.years[0].year}–${data.years.at(-1).year} (${data.years.length} años)`
      : 'sin detalle anual';
    lines.push(`- **${span}:** ${data.status || 'sin estado'}; faltantes declarados: ${data.missing?.length ?? 'no indicado'}; fuente: \`${item.file}\`.`);
    for (const exception of data.exceptions || []) lines.push(`  - Excepción: ${exception}`);
  }

  lines.push('', '## Registros de construcción', '', `${constructionByYear.size} registros anuales; los estados se muestran literalmente, sin convertirlos en “cerrado”.`);
  for (const [status, count] of [...statusCounts].sort((a, b) => a[0].localeCompare(b[0], 'es'))) {
    const years = [...constructionByYear.entries()].filter(([, item]) => (item.record.status || 'SIN ESTADO') === status)
      .map(([year]) => year).sort((a, b) => a - b);
    lines.push(`- **${status}:** ${count} años (${safeList(years)}).`);
  }
  const newerFollowUps = [...constructionByYear.entries()].flatMap(([year, base]) =>
    (followUpsByYear.get(year) || [])
      .filter(item => item.date && base.record.completionDate && item.date > base.record.completionDate)
      .map(item => `${year}: \`${item.file}\` (${item.date}${item.status ? `; ${item.status}` : ''})`));
  if (newerFollowUps.length) {
    lines.push('', '### Registros posteriores al estado base', '');
    lines.push('Consultar estos suplementos e incorporaciones antes de actuar: pueden actualizar o acotar el registro de construcción, pero no lo sustituyen automáticamente.');
    for (const item of newerFollowUps) lines.push(`- ${item}`);
  }

  const detailYears = selectedYear === null
    ? (allYears ? [...sourceYears].sort((a, b) => a - b) : [])
    : [selectedYear];
  if (detailYears.length) {
    lines.push('', '## Años con detalle', '', '| Año | Ediciones en índice | Fuente anual | Estado de cobertura/construcción | Seguimientos | Fuente del estado |', '| ---: | ---: | --- | --- | --- | --- |');
  }
  for (const year of detailYears) {
    const construction = constructionByYear.get(year);
    const coverageEntries = coverageYears.get(year) || [];
    const sources = [];
    let state = 'Sin registro de estado localizado';
    if (construction) {
      state = construction.record.status || 'Sin estado explícito';
      sources.push(construction.file);
    }
    if (coverageEntries.length) {
      const summaryStates = [...new Set(coverageEntries.map(item => item.summary.status || 'sin estado'))];
      state = construction
        ? `${state}; cobertura declarada: ${summaryStates.join(', ')}`
        : `Cobertura declarada: ${summaryStates.join(', ')}`;
      sources.push(...coverageEntries.map(item => item.file));
    }
    const followUps = followUpsByYear.get(year) || [];
    lines.push(`| ${year} | ${editionsByYear.get(year) ?? 0} | ${annualFiles.has(year) ? 'presente' : 'no presente'} | ${state} | ${followUps.length ? followUps.map(item => `\`${item.file}\`${item.status ? ` (${item.status})` : ''}`).join('<br>') : '—'} | ${sources.length ? sources.map(source => `\`${source}\``).join('<br>') : '—'} |`);
  }

  lines.push('', '## Límites y avisos', '');
  lines.push('- La presencia del archivo anual solo acredita que existe una fuente; este informe no relee sus películas ni valida identidades, propiedad o premios.');
  lines.push('- Los estados de cobertura y construcción se conservan separados. Si ambas fuentes discrepan, se muestran ambas; no se decide cuál prevalece.');
  lines.push(`- Años sin estado de cobertura/construcción localizado: ${safeList(yearsWithoutStatusSource)}.`);
  lines.push(`- Años indexados sin archivo anual: ${safeList(missingAnnual)}; archivos anuales fuera del índice: ${safeList(unindexedAnnual)}.`);
  if (selectedYear === null && !allYears) lines.push('- Para consultar un año concreto: `node scripts/report-festival-progress.mjs --year=AAAA`. Para listar todos: añade `--all`.');
  lines.push('- Este informe se imprime en pantalla y no escribe ni modifica archivos.');
  return lines.join('\n') + '\n';
}

if (typeof process !== 'undefined' && process.argv[1]
    && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    const root = args.find(argument => !argument.startsWith('--')) || '.';
    const yearArgument = args.find(argument => argument.startsWith('--year='));
    const selectedYear = yearArgument ? Number(yearArgument.slice('--year='.length)) : null;
    if (yearArgument && (!Number.isInteger(selectedYear) || selectedYear < 1895 || selectedYear > 2100)) {
      throw new Error('El año debe tener cuatro cifras y estar entre 1895 y 2100.');
    }
    process.stdout.write(buildReport(root, {year: selectedYear, allYears: args.includes('--all')}));
  } catch (error) {
    process.stderr.write(`No se pudo generar el inventario: ${error.message}\n`);
    process.exitCode = 1;
  }
}

export {buildReport};
