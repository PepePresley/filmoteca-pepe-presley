// Shared presentation settings for LAB and Lite. Film data remains in annual sources.
(function(root){
 const config=Object.freeze({
  "Cannes": {
    "label": "Festival de Cannes",
    "icon": "#ico-cannes",
    "award": false
  },
  "Venecia": {
    "label": "Festival de Venecia",
    "icon": "#ico-venice",
    "award": false
  },
  "Berlín": {
    "label": "Festival de Berlín",
    "icon": "#ico-berlin",
    "award": false
  },
  "San Sebastián": {
    "label": "Festival de San Sebastián",
    "icon": "#ico-ss",
    "award": false
  },
  "Sitges": {
    "label": "Festival de Sitges",
    "icon": "/filmoteca-pepe-presley/app/festival-icons.svg?v=1#sitges",
    "award": false
  },
  "Seminci": {
    "label": "Seminci · Valladolid",
    "icon": "/filmoteca-pepe-presley/app/festival-icons.svg?v=1#seminci",
    "award": false
  },
  "Oscar": {
    "label": "Premios Oscar",
    "icon": "#ico-oscar",
    "award": true,
    "categories": [
      "Película",
      "Dirección",
      "Casting",
      "Actor protagonista",
      "Actriz protagonista",
      "Actor de reparto",
      "Actriz de reparto",
      "Guion original",
      "Guion adaptado",
      "Película internacional",
      "Película de animación",
      "Documental",
      "Cortometraje documental",
      "Cortometraje de animación",
      "Cortometraje de ficción",
      "Fotografía",
      "Montaje",
      "Diseño de producción",
      "Vestuario",
      "Maquillaje y peluquería",
      "Banda sonora",
      "Canción",
      "Sonido",
      "Efectos visuales"
    ]
  },
  "Goya": {
    "label": "Premios Goya",
    "icon": "/filmoteca-pepe-presley/app/festival-icons.svg?v=1#goya",
    "award": true
  },
  "BAFTA": {
    "label": "Premios BAFTA",
    "icon": "/filmoteca-pepe-presley/app/festival-icons.svg?v=1#bafta",
    "award": true
  },
  "César": {
    "label": "Premios César",
    "icon": "/filmoteca-pepe-presley/app/festival-icons.svg?v=1#cesar",
    "award": true,
    "categories": [
      "Película",
      "Dirección",
      "Actriz protagonista",
      "Actor protagonista",
      "Actriz de reparto",
      "Actor de reparto",
      "Actriz revelación",
      "Actor revelación",
      "Guion original",
      "Guion adaptado",
      "Ópera prima",
      "Película extranjera",
      "Película de animación",
      "Documental",
      "Fotografía",
      "Montaje",
      "Música original",
      "Sonido",
      "Diseño de producción",
      "Vestuario",
      "Efectos visuales",
      "Cortometraje de ficción",
      "Cortometraje de animación",
      "Cortometraje documental"
    ]
  },
  "Locarno": {
    "label": "Festival de Locarno",
    "icon": "/filmoteca-pepe-presley/app/festival-icons.svg?v=1#locarno",
    "award": false
  },
  "Sundance": {
    "label": "Festival de Sundance",
    "icon": "/filmoteca-pepe-presley/app/festival-icons.svg?v=1#sundance",
    "award": false
  },
  "Globos de Oro": {
    "label": "Globos de Oro · cine",
    "icon": "/filmoteca-pepe-presley/app/festival-icons.svg?v=1#globos",
    "award": true,
    "categories": [
      "Película dramática",
      "Película musical o comedia",
      "Dirección",
      "Actriz protagonista en drama",
      "Actor protagonista en drama",
      "Actriz protagonista en musical o comedia",
      "Actor protagonista en musical o comedia",
      "Actriz de reparto",
      "Actor de reparto",
      "Guion",
      "Película de habla no inglesa",
      "Película de animación",
      "Música original",
      "Canción original",
      "Logro cinematográfico y de taquilla"
    ]
  },
  "David di Donatello": {
    "label": "Premios David di Donatello",
    "icon": "/filmoteca-pepe-presley/app/festival-icons.svg?v=1#david",
    "award": true,
    "categories": [
      "Mejor película",
      "Mejor dirección",
      "Mejor actriz protagonista",
      "Mejor actor protagonista",
      "Mejor actriz de reparto",
      "Mejor actor de reparto",
      "Mejor guion original",
      "Mejor guion adaptado",
      "Mejor dirección novel",
      "Mejor producción",
      "Mejor película internacional",
      "Mejor película documental",
      "Mejor fotografía",
      "Mejor montaje",
      "Mejor compositor",
      "Mejor canción original",
      "Mejor sonido",
      "Mejor dirección artística",
      "Mejor vestuario",
      "Mejor maquillaje",
      "Mejor peluquería",
      "Mejores efectos visuales",
      "Mejor casting",
      "Mejor cortometraje",
      "David Giovani"
    ]
  },
  "Ariel": {
    "label": "Premios Ariel",
    "icon": "/filmoteca-pepe-presley/app/festival-icons.svg?v=1#ariel",
    "award": true,
    "categories": [
      "Película",
      "Dirección",
      "Actriz",
      "Actor",
      "Coactuación femenina",
      "Coactuación masculina",
      "Revelación actoral",
      "Guion original",
      "Guion adaptado",
      "Ópera prima",
      "Película iberoamericana",
      "Largometraje animación",
      "Largometraje documental",
      "Fotografía",
      "Edición",
      "Música original",
      "Sonido",
      "Diseño de arte",
      "Vestuario",
      "Maquillaje",
      "Efectos especiales",
      "Efectos visuales",
      "Cortometraje ficción",
      "Cortometraje animación",
      "Cortometraje documental"
    ]
  }
});
 const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
 let referenceRows;
 async function withReference(record){
  if(/^https?:\/\/(?:t\.me|telegram\.me)\//i.test(record.u||''))return record;
  try{
   if(!referenceRows)referenceRows=Promise.all(['festival-references-2022-2024.json','festival-references-cinco-2025.json','festival-references-cinco-2024.json','festival-references-cinco-2022-2023.json','festival-references-2026.json','festival-references-cinco-2020-2021.json','festival-references-cinco-2018-2019.json','festival-references-sitges-seminci-cesar-2020-2021.json','festival-references-sitges-seminci-cesar-2018-2019.json','festival-references-ocho-2016-2017.json'].map(file=>fetch('/filmoteca-pepe-presley/data/catalog/'+file+'?v=20261028g').then(async response=>{if(!response.ok)throw new Error('References unavailable');return response.json()}))).then(groups=>groups.flat()).catch(error=>{referenceRows=null;throw error});
   const rows=await referenceRows;
   const matches=rows.filter(r=>r.t===record.t&&r.d===record.d&&Number(r.y)===Number(record.y));
   if(matches.length===1){const full=matches[0];return {...record,u:full.u,arch:full.arch,res:full.res,sz:full.sz};}
  }catch(_){}
  return record;
 }
 root.FilmotecaFestivals=Object.freeze({
  config,
  withReference,
  label:f=>config[f]?.label||'Festival de '+f,
  icon:f=>config[f]?.icon||'#ico-festival',
  isAward:f=>Boolean(config[f]?.award),
  categoryOrder:f=>config[f]?.categories||[],
  fromSlug:s=>Object.keys(config).find(f=>normalize(f)===normalize(s))||null
 });
 if(root.document){
  const navigation=root.document.querySelector('.festNav');
  if(navigation)navigation.innerHTML=Object.entries(config).map(([name,item])=>'<button class="festivalSelectBtn'+(name==='Cannes'?' active':'')+'" data-festival="'+name+'"><svg class="festIcon" viewBox="0 0 64 64"><use href="'+item.icon+'"></use></svg>'+name+'</button>').join('');
 }
})(globalThis);
