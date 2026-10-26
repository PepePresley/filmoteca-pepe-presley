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
    "icon": "#ico-festival",
    "award": false
  },
  "Seminci": {
    "label": "Seminci · Valladolid",
    "icon": "#ico-festival",
    "award": false
  },
  "Oscar": {
    "label": "Premios Oscar",
    "icon": "#ico-oscar",
    "award": true
  },
  "Goya": {
    "label": "Premios Goya",
    "icon": "#ico-goya",
    "award": true
  },
  "BAFTA": {
    "label": "Premios BAFTA",
    "icon": "#ico-bafta",
    "award": true
  },
  "César": {
    "label": "Premios César",
    "icon": "#ico-bafta",
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
  }
});
 const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
 root.FilmotecaFestivals=Object.freeze({
  config,
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
