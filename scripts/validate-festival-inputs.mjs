import fs from 'node:fs';
import path from 'node:path';

const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const nonempty=v=>typeof v==='string'&&v.trim().length>0;
const validYear=v=>Number.isInteger(v)&&v>=1895&&v<=2100;
const globalPath='data/festivals/festivals.json';
const catalogPath='data/catalog/catalog.json';
const mapPath='data/catalog/festival-matches.json';
const dataPath=p=>p===globalPath||p===catalogPath||/^data\/festivals\/years\/.*\.json$/.test(p)||/^data\/catalog\/(annual_.*_overlay|festival-owned-\d{4})\.json$/.test(p);

export function inspectInputs(files){
 const issues=[],parsed=new Map();
 const add=(file,code,identity,message,fatal=false,advisory=false)=>issues.push({file,code,identity,message,fatal,advisory});
 for(const p of [catalogPath,globalPath])if(!files.has(p))add(p,'missing-source',p,'Falta una fuente obligatoria.',true);
 for(const [p,text] of files){
  if(!dataPath(p))continue;
  try{parsed.set(p,JSON.parse(text));}catch{add(p,'invalid-json',p,'El archivo no contiene JSON válido.',true);}
 }
 const db=parsed.get(globalPath);
 if(db!==undefined&&(!object(db)||!Array.isArray(db.editions)))add(globalPath,'invalid-editions',globalPath,'Se requiere un objeto con editions como lista.',true);
 const editions=Array.isArray(db?.editions)?db.editions:[];
 const sections=new Map(),years=new Set();let appearances=0;
 for(const [i,ed] of editions.entries()){
  const id=JSON.stringify([ed?.festival,ed?.year,ed?.section]);
  if(!object(ed)||!nonempty(ed.festival)||!validYear(ed.year)||!nonempty(ed.section)||!Array.isArray(ed.films)){
   add(globalPath,'invalid-edition',id+'|'+i,'Edición sin festival, año, sección o lista de películas válidos.',true);continue;
  }
  years.add(ed.year);
  if(sections.has(id))add(globalPath,'duplicate-edition',id,'La edición está duplicada.',true);
  const titles=new Set(),films=new Set();sections.set(id,titles);
  for(const [j,f] of ed.films.entries()){
   appearances++;
   const identity=JSON.stringify([ed.festival,ed.year,ed.section,f?.title,f?.director||'']);
   if(!object(f)||!nonempty(f.title)){add(globalPath,'invalid-film',id+'|'+j,'Película sin título válido.',true);continue;}
   titles.add(f.title);
   if(films.has(identity))add(globalPath,'duplicate-film',identity,'Película repetida dentro de la edición.');
   films.add(identity);
   if(f.director!=null&&typeof f.director!=='string')add(globalPath,'invalid-director',identity,'El director debe ser texto.',true);
   if(f.aliases!=null&&(!Array.isArray(f.aliases)||f.aliases.some(a=>!nonempty(a))))
    add(globalPath,'invalid-aliases',identity,'Aliases debe ser una lista de títulos no vacíos.',true);
  }
 }
 let catalogRecords=0,ownershipTitles=0;
 for(const [p,rows] of parsed){
  if(p===catalogPath||/^data\/catalog\/annual_.*_overlay\.json$/.test(p)){
   if(!Array.isArray(rows)){add(p,'invalid-catalog',p,'El catálogo debe ser una lista de fichas.',true);continue;}
   catalogRecords+=rows.length;
   const seen=new Map();
   for(const [i,r] of rows.entries()){
    const id=JSON.stringify([r?.t,r?.y,r?.d||'']);
    if(!object(r)||!nonempty(r.t)||!validYear(r.y)){
     add(p,'invalid-record',id+'|'+i,'Ficha sin título o año válidos.',true);continue;
    }
    const metadata=JSON.stringify([r.p||'',r.dur||0,Boolean(r.noPosterFallback)]);
    if(seen.has(id)){
     if(seen.get(id)!==metadata)add(p,'ambiguous-record',id+'|'+JSON.stringify([seen.get(id),metadata].sort()),'Identidad repetida con carátula, duración o fallback contradictorios.');
     else add(p,'duplicate-record',id,'Identidad repetida con los mismos datos de asociación; puede representar varias copias.',false,true);
    }else seen.set(id,metadata);
    for(const field of ['d','p','ot','original_title','en','english_title','src'])
     if(r[field]!=null&&typeof r[field]!=='string')add(p,'invalid-'+field,id,field+' debe ser texto.',true);
    if(r.dur!=null&&(typeof r.dur!=='number'||!Number.isFinite(r.dur)||r.dur<0))
     add(p,'invalid-duration',id+'|'+JSON.stringify(r.dur),'La duración debe ser un número no negativo o estar sin informar.');
    if(r.noPosterFallback!=null&&typeof r.noPosterFallback!=='boolean')
     add(p,'invalid-fallback',id,'noPosterFallback debe ser verdadero o falso.',true);
   }
  }else if(/^data\/catalog\/festival-owned-\d{4}\.json$/.test(p)){
   if(!object(rows)){add(p,'invalid-ownership',p,'La propiedad debe ser un objeto de secciones.',true);continue;}
   const year=Number(p.match(/(\d{4})\.json$/)[1]);
   for(const [section,titles] of Object.entries(rows)){
    const split=section.indexOf('|');
    const id=JSON.stringify([section.slice(0,split),year,section.slice(split+1)]);
    if(split<1||!nonempty(section.slice(split+1))||!Array.isArray(titles)||titles.some(t=>!nonempty(t))){
     add(p,'invalid-ownership-section',section,'Se requiere festival|sección con una lista de títulos.',true);continue;
    }
    ownershipTitles+=titles.length;
    const registered=sections.get(id),seen=new Set();
    if(!registered)add(p,'unknown-ownership-section',section,'La sección declarada no existe en ese año.');
    for(const title of titles){
     if(seen.has(title))add(p,'duplicate-owned-title',section+'|'+title,'Título repetido en la propiedad de la sección.');
     seen.add(title);
     if(registered&&!registered.has(title))add(p,'unknown-owned-title',section+'|'+title,'El título declarado no existe en la sección.');
    }
   }
  }
 }
 return {issues,summary:{years:[...years].sort((a,b)=>a-b),editions:editions.length,appearances,catalogRecords,ownershipTitles}};
}

const issueKey=i=>JSON.stringify([i.file,i.code,i.identity]);
export function validateInputChanges(before,after){
 const old=inspectInputs(before),current=inspectInputs(after);
 const counts=new Map();
 for(const issue of old.issues){const key=issueKey(issue);counts.set(key,(counts.get(key)||0)+1);}
 const errors=[],inherited=[],advisories=[];
 for(const issue of current.issues){
  const key=issueKey(issue),previous=counts.get(key)||0;
  if(previous)counts.set(key,previous-1);
  // Invalid shapes are unsafe even when inherited; the planner cannot consume them.
  if(issue.advisory&&!previous)advisories.push(issue);
  else if(issue.fatal||!previous)errors.push(issue);else inherited.push(issue);
 }
 // The branch's generated map is never the approved reference for its own gate.
 try{
  const approved=JSON.parse(before.get(mapPath)||'null');
  if(!object(approved)||!object(approved.matches)||approved.version!==1||
   !Number.isInteger(approved.total)||!Number.isInteger(approved.present)||approved.present<0||approved.present>approved.total||approved.total!==old.summary.appearances)throw new Error();
  const db=JSON.parse(before.get(globalPath));
  const keys=(db.editions||[]).flatMap(ed=>ed.films.map(f=>JSON.stringify([ed.festival,ed.year,f.title,f.director||''])));
  if(new Set(keys).size!==Object.keys(approved.matches).length||keys.some(k=>!Object.hasOwn(approved.matches,k))||
   keys.filter(k=>approved.matches[k]!==null).length!==approved.present)throw new Error();
  for(const [key,r] of Object.entries(approved.matches)){
   const identity=JSON.parse(key);
   if(!Array.isArray(identity)||identity.length!==4||!validYear(identity[1])||
    (r!==null&&(!object(r)||!Number.isInteger(r.i)||r.i<0||!nonempty(r.t)||!validYear(r.y))))throw new Error();
  }
 }catch{errors.push({file:mapPath,code:'invalid-approved-map',identity:mapPath,message:'Falta un mapa aprobado válido en el commit base.',fatal:true});}
 const changedFiles=[...new Set([...before.keys(),...after.keys()])]
  .filter(p=>dataPath(p)&&before.get(p)!==after.get(p)).sort();
 return {ok:errors.length===0,changedFiles,errors,inheritedIssues:inherited.length,newWarnings:advisories.length,
  warnings:[...advisories,...inherited.filter(i=>changedFiles.includes(i.file))].slice(0,20),before:old.summary,after:current.summary};
}

export function writeValidationReport(report,directory){
 fs.mkdirSync(directory,{recursive:true});
 fs.writeFileSync(path.join(directory,'bloque.json'),JSON.stringify(report,null,2)+'\n');
 const lines=['# Comprobación del bloque de Filmoteca LAB','',
  report.ok?'**Resultado: válido para generar.**':'**Resultado: bloqueado antes de generar.**','',
  'Base aprobada: `'+report.base+'`','',
  'Archivos de datos modificados: '+report.changedFiles.length+'.',
  'Años a regenerar: '+(report.plan?.years.length?report.plan.years.join(', '):report.plan?'ninguno; conservar asociaciones':'sin calcular por errores')+'.',
  'Años conservados: '+(report.plan?report.plan.allYears.filter(y=>!report.plan.years.includes(y)).join(', '):'sin calcular')+'.','',
  '| Datos | Antes | Después |','| --- | ---: | ---: |'];
 for(const [key,label] of [['editions','Ediciones'],['appearances','Apariciones de películas'],['catalogRecords','Fichas en fuentes de catálogo'],['ownershipTitles','Declaraciones de propiedad']])
  lines.push(`| ${label} | ${report.before[key]} | ${report.after[key]} |`);
 if(report.changedFiles.length)lines.push('','## Fuentes modificadas','',...report.changedFiles.map(p=>'- `'+p+'`'));
 if(report.plan?.years.length)lines.push('','## Motivos del alcance','',...report.plan.years.map(y=>'- '+y+': '+report.plan.reasons[y].join(', ')));
 if(report.errors.length)lines.push('','## Errores que impiden generar','',...report.errors.map(i=>'- `'+i.file+'` · '+i.code+': '+i.message+' Identidad: `'+i.identity+'`'));
 lines.push('','Avisos previos conservados: '+report.inheritedIssues+'; incluyen copias repetidas. Avisos nuevos no bloqueantes: '+report.newWarnings+'. No se reauditan identidades ni carátulas.');
 if(report.warnings.length)lines.push('','## Avisos en archivos del bloque (hasta 20)','',...report.warnings.map(i=>'- `'+i.file+'` · '+i.code+': '+i.message));
 lines.push('','El total de fichas cuenta las fuentes base y overlays; no es el total de películas únicas de la colección.');
 fs.writeFileSync(path.join(directory,'bloque.md'),lines.join('\n')+'\n');
}
