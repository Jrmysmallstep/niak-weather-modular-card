/**
 * Hestia Weather Add-on — 0.3.0-beta.1 (carte « hestia-weather-addon », ancien nom « niak-weather-modular-card » toujours reconnu)
 * Add-on de l'intégration Hestia Weather (ex-Niak Weather) : Synthèse, Lune, Solar Mask et radars de pluie (par lien).
 * Les autres cartes (vent, pluie, pression, air, pollens, prévisions…) sont fournies par l'intégration elle-même.
 * Inspired by Niak Weather by Niakman13 (MIT); see LICENSE and README.md.
 * No cloud calls and no external JavaScript dependencies.
 */
(() => {
  'use strict';
  const VERSION = '0.3.0-beta.1';
  const ELEMENT = 'hestia-weather-addon';
  const LEGACY_ELEMENT = 'niak-weather-modular-card';
  // Integration websocket domain: Hestia Weather (current name), then Niak Weather (former name).
  const WS_DOMAINS = ['hestia_weather', 'niak_weather'];
  const FORMATS = [
    ['overview','Synthèse / En ce moment','Conditions, min/max, bulletin, tendance et événements'],
    ['moon','Lune','Phase lunaire, illumination, heures et prochaines phases'],
    ['sun-home','Soleil & Ensoleillement','Soleil local, horaires et diagramme Solar Mask'],
    ['radars','Radars de pluie','Deux radars avec leurs URL à renseigner'],
  ];
  const FORMAT_SET = new Set(FORMATS.map(x => x[0]));
  const LEGACY = {summary:'overview',current:'overview'};
  // Formats of the former modular card, now provided by the Hestia Weather integration's own card.
  const RETIRED = ['full','bulletin','events','comfort','extras','solar','uv','lux','humidity','dew','rain','wind','pressure','pollen','hours','days','pollen-forecast','air'];
  const RETIRED_SET = new Set(RETIRED);
  const ACCEPTED = new Set([...FORMAT_SET,...Object.keys(LEGACY),...RETIRED]);
  function normalize(c){
    const previous=c.format||'overview',format=LEGACY[previous]||previous,defaults={};
    if(previous==='summary'&&Array.isArray(c.blocks)){
      defaults.show_bulletin=c.blocks.includes('bulletin');
      defaults.show_events=c.blocks.includes('events');
    }
    return {...defaults,...c,format};
  }
  const tagOf=(...names)=>names.find(n=>customElements.get(n))||'';
  const BACKGROUND_MODES = [['glass', 'Verre dépoli (semi-transparent)'], ['theme', 'Thème Home Assistant'], ['transparent', 'Transparent (sans fond)']];
  const OPTION_KEYS = {
    overview:['show_title','show_source','show_date','show_bulletin','show_temp_range','show_temp_trend','show_events','show_border','show_animations'],
    moon:['show_title','show_source','show_date','show_chart','show_stats','show_details','show_border'],
    'sun-home':['show_title','show_source','show_date','show_border'],
    radars:['show_title','show_source','show_border']
  };
  const OPTION_LABELS = {'show_title':'Afficher le titre','show_source':'Afficher la source','show_date':'Afficher la date','show_bulletin':'Afficher le bulletin du jour','show_temp_range':'Afficher min/max','show_temp_trend':'Afficher la tendance °C/h','show_events':'Afficher les événements','show_chart':'Afficher le visuel de la Lune','show_stats':'Afficher les statistiques','show_details':'Afficher les détails','show_border':'Afficher les bordures','show_animations':'Afficher le ciel animé (si disponible)'};
  const DEFAULTS = {sun_difference_entity:'sensor.difference_de_soleil',sun_duration_entity:'sensor.sunterrasse_sun_duration',radar_url_current:'',radar_url_forecast:'',background_mode:'glass',temperature_position:'right',overview_layout:'compact',show_title:true,show_source:true,show_date:true,show_bulletin:true,show_temp_range:true,show_temp_trend:true,show_events:true,show_chart:true,show_stats:true,show_details:true,show_border:true,show_animations:true};
  const icon = (name, cls = '') => `<ha-icon class="${cls}" icon="${esc(name || 'mdi:weather-partly-cloudy')}"></ha-icon>`;
  function esc(value) { return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function num(n, digits=1) { return Number.isFinite(Number(n)) && n !== null && n !== '' ? new Intl.NumberFormat('fr-FR',{maximumFractionDigits:digits}).format(Number(n)) : '—'; }
  const opt = (c, key) => c[key] !== false;
  const present = v => v !== undefined && v !== null;
  function label(s) { return `<span class="label">${esc(s)}</span>`; }
  function source(s,c) { return opt(c,'show_source') && s ? `<span class="source" title="${esc(s)}">${esc(s)}</span>` : ''; }
  function heading(title,iconName,s,c) { const name = opt(c,'show_title');const origin=source(s,c);return name||origin?`<header class="head">${name?icon(iconName,'head-icon')+'<strong>'+esc(title)+'</strong>':''}${origin}</header>`:''; }
  function chip(i) { return `<span class="chip" ${i.entity?`data-entity="${esc(i.entity)}"`:''}>${i.icon?icon(i.icon):''}${i.value?`<b>${esc(i.value)}</b>`:''}${esc(i.label)}</span>`; }
  const MOON_PHASES={"new_moon":"Nouvelle lune","waxing_crescent":"Premier croissant","first_quarter":"Premier quartier","waxing_gibbous":"Gibbeuse croissante","full_moon":"Pleine lune","waning_gibbous":"Gibbeuse décroissante","last_quarter":"Dernier quartier","waning_crescent":"Dernier croissant"};
  function validMoonNumber(x){return x!==undefined&&x!==null&&x!==''&&Number.isFinite(Number(x));}
  function moonTime(x, dateOnly=false){
  if(x===undefined||x===null||x==='')return '—';
  const d=new Date(x);
  if(!Number.isFinite(d.getTime()))return '—';
  return new Intl.DateTimeFormat('fr-FR',dateOnly?{day:'numeric',month:'short',year:'numeric'}:{hour:'2-digit',minute:'2-digit'}).format(d);
}
  function moonEntity(hass,c){
  const states=hass?.states||{};
  if(c.moon_entity)return {entity:c.moon_entity,state:states[c.moon_entity]};
  const hit=Object.entries(states).find(([id,s])=>id.startsWith('sensor.')&&s?.attributes?.illumination_fraction!==undefined&&s.attributes.moon_age!==undefined);
  return {entity:hit?.[0]||'',state:hit?.[1]};
}
  function moonDisk(fraction,waxing,south){
  if(!validMoonNumber(fraction))return `<div class="moon-unavailable">☾</div>`;
  const f=Math.min(1,Math.max(0,Number(fraction)/100));
  const control=100+168*(1-2*f),secondary=200-control;
  const path=waxing?`M100 16 A84 84 0 0 1 100 184 Q${control} 100 100 16 Z`:`M100 16 A84 84 0 0 0 100 184 Q${secondary} 100 100 16 Z`;
  return `<svg class="moon-disk" viewBox="0 0 200 200" role="img" aria-label="Lune éclairée à ${Math.round(f*100)} %" ${south?'style="transform:rotate(180deg)"':''}>
    <defs><radialGradient id="moon-bright"><stop offset="0" stop-color="#f2f5fb"/><stop offset=".68" stop-color="#d4dce9"/><stop offset="1" stop-color="#96a6c2"/></radialGradient>
      <radialGradient id="moon-dark"><stop offset="0" stop-color="#29334b"/><stop offset="1" stop-color="#0c1425"/></radialGradient>
      <clipPath id="moon-circle"><circle cx="100" cy="100" r="84"/></clipPath></defs>
    <circle cx="100" cy="100" r="84" fill="url(#moon-dark)"/>
    <path d="${path}" fill="url(#moon-bright)" clip-path="url(#moon-circle)"/>
    <g fill="#62708a" opacity=".13" clip-path="url(#moon-circle)"><circle cx="71" cy="61" r="12"/><circle cx="139" cy="118" r="18"/>
      <circle cx="95" cy="150" r="9"/><circle cx="157" cy="76" r="8"/><circle cx="65" cy="123" r="16"/></g>
    <circle cx="100" cy="100" r="84" fill="none" stroke="#fff" stroke-opacity=".18"/></svg>`;
}
  function lunarCard(hass,c){
  if(!hass)return `<div class="wait">Chargement des entités Home Assistant…</div>`;
  const {entity,state}=moonEntity(hass,c);
  if(!state||!state.attributes||state.state==='unavailable'||state.state==='unknown')
    return wrap(`${heading('Lune','mdi:moon-waning-crescent','',c)}<p class="note">Capteur Lunar Phase introuvable ou indisponible. Installez ngocjohn/lunar-phase, puis sélectionnez son capteur « Phase de la lune » dans l’éditeur de cette carte.</p>`,c,'moon-panel');
  const a=state.attributes,phase=String(state.state).toLowerCase(),
    age=validMoonNumber(a.moon_age)?Number(a.moon_age):null,
    fraction=validMoonNumber(a.illumination_fraction)?Number(a.illumination_fraction):null,
    waxing=phase.startsWith('waxing')||phase==='first_quarter'||
      (phase!=='waning_gibbous'&&phase!=='waning_crescent'&&phase!=='last_quarter'&&age!==null&&age<14.77),
    name=MOON_PHASES[phase]||'Phase lunaire',
    origin=source('Lunar Phase',c),
    header=opt(c,'show_title')||origin||opt(c,'show_date')?`<header class="head moon-header">
       ${opt(c,'show_title')?`${icon('mdi:moon-waning-crescent','head-icon')}<strong>Lune</strong>`:''}
       ${origin}${opt(c,'show_date')?`<span class="moon-current-date">${esc(moonTime(Date.now(),true))}</span>`:''}</header>`:'',
    stats=[
      ['Illumination',fraction!==null?`${num(fraction,1)} %`:'—'],
      ['Âge',age!==null?`${num(age,1)} jours`:'—'],
      ['Distance',validMoonNumber(a.moon_distance_km)?`${num(a.moon_distance_km,0)} km`:'—'],
      ['Lever',moonTime(a.moonrise)],['Coucher',moonTime(a.moonset)],['Culmination',moonTime(a.moon_high)]
    ].filter(([,v])=>v!=='—'),
    details=opt(c,'show_stats')?`<div class="moon-stats">${stats.map(([k,v])=>
      `<div class="moon-stat"><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('')}</div>`:'',
    nextPhases=opt(c,'show_details')?[
      ['Pleine lune',a.next_full_moon],['Nouvelle lune',a.next_new_moon],
      ['Premier quartier',a.next_first_quarter],['Dernier quartier',a.next_third_quarter]
    ].filter(([,v])=>moonTime(v,true)!=='—').map(([k,v])=>
      `<div><span>${esc(k)}</span><b>${esc(moonTime(v,true))}</b></div>`).join(''):'',
    foot=opt(c,'show_details')?`<div class="moon-future">
        ${nextPhases?`<div class="moon-future-list">${nextPhases}</div>`:''}
        ${validMoonNumber(a.moon_altitude_deg)?`<span class="moon-position">${icon('mdi:angle-acute')}Altitude : ${num(a.moon_altitude_deg,1)}°</span>`:''}
        ${validMoonNumber(a.moon_azimuth_deg)?`<span class="moon-position">${icon('mdi:compass-outline')}Azimut : ${num(a.moon_azimuth_deg,1)}°</span>`:''}
       </div>`:'',
    picture=opt(c,'show_chart')?`<div class="moon-visual" ${entity?`data-entity="${esc(entity)}"`:''}>${moonVisual(fraction,waxing,c.moon_southern_hemisphere===true,age,phase,c)}</div>`:'',
    body=`<div class="moon-info"><div class="moon-phase" ${entity?`data-entity="${esc(entity)}"`:''}>${esc(name)}</div>
      ${fraction!==null?`<div class="moon-illumination">${num(fraction,1)} <span>% éclairée</span></div>`:''}${details}</div>`;
  return wrap(`${header}<div class="moon-main ${c.moon_position==='right'?'moon-right':''}">${picture}${body}</div>${foot}`,c,'moon-panel');
}

  function moonVisual(fraction,waxing,south,age,phase,c){
    const svg=moonDisk(fraction,waxing,south),mode=['original','generated','image','svg'].includes(c.moon_visual_mode)?c.moon_visual_mode:'original';
    if(mode==='generated')return svg;
    const index=validMoonNumber(age)?Math.min(30,Math.max(0,Math.round(Number(age)/29.53058868*30))):0;
    const url0=mode==='original'?'https://cdn.jsdelivr.net/gh/ngocjohn/lunar-phase-card@1.14.0/moon_pic/'+index+'_moon.png':String(c.moon_image_url||'').trim();
    const url=url0.replaceAll('{index}',String(index)).replaceAll('{phase}',String(phase||'new_moon'));
    if(!/^(https?:\/\/|\/(?!\/))[^<>"'\s\\]*$/i.test(url))return svg;
    return '<img class="moon-photo" src="'+esc(url)+'" loading="lazy" decoding="async" alt="'+esc(MOON_PHASES[phase]||'Lune')+'" '+
      (south?'style="transform:rotate(180deg)"':'')+'/>'+
      '<div class="moon-fallback" aria-hidden="true">'+svg+'</div>';
  }
  function empty(message='Données indisponibles pour le moment.') { return `<div class="empty">${esc(message)}</div>`; }
  function wrap(panel, c, extra='') { return `<section class="inner ${extra}">${panel}</section>`; }
  function overview(v,c){
    const n=v.now||{},day=(v.days||[]).find(x=>x.today)||{},
      valid=x=>x!==undefined&&x!==null&&Number.isFinite(Number(x)),
      minmax=opt(c,'show_temp_range')&&(valid(day.low)||valid(day.high))?'<div class="ov-range">'+
        (valid(day.low)?'<span>↓ '+num(day.low,0)+'°</span>':'')+(valid(day.high)?'<span>↑ '+num(day.high,0)+'°</span>':'')+'</div>':'',
      rate=opt(c,'show_temp_trend')&&valid(n.trend)?'<div class="ov-trend">'+icon(n.trend>=0?'mdi:arrow-top-right':'mdi:arrow-bottom-right')+
        (n.trend>0?'+':n.trend<0?'−':'')+num(Math.abs(n.trend),1)+' °C/h</div>':'',
      title=(opt(c,'show_title')||opt(c,'show_date'))?'<header class="ov-head">'+(opt(c,'show_title')?'<strong>Synthèse</strong>':'')+
        (opt(c,'show_date')?'<span>'+esc([v.location,v.dateLabel].filter(Boolean).join(' · '))+'</span>':'')+
        (v.season?.news?'<span class="ov-season">'+icon(v.season?.info?.icon||'mdi:leaf')+esc(v.season.news)+'</span>':'')+'</header>':'',
      bulletin=opt(c,'show_bulletin')&&v.bulletin?.summary?'<div class="ov-bulletin">'+label('Bulletin du jour')+
        '<p>'+esc(v.bulletin.summary)+'</p></div>':'',
      alerts=(v.alerts||[]).filter(x=>x.official).map(x=>chip({icon:x.icon,label:[x.label,x.text].filter(Boolean).join(' · '),entity:x.entity})).join(''),
      current='<div class="ov-now">'+label('En ce moment')+
        '<div class="ov-condition" '+(n.conditionEntity?'data-entity="'+esc(n.conditionEntity)+'"':'')+'>'+
          icon(n.icon||'mdi:weather-partly-cloudy')+'<b>'+esc(n.label||'Météo')+'</b></div>'+
        '<div class="ov-temp" '+(n.temperatureEntity?'data-entity="'+esc(n.temperatureEntity)+'"':'')+'>'+
          (valid(n.temperature)?num(n.temperature,1):'—')+'<span>°C</span></div>'+minmax+rate+
          (source(n.temperatureSource||n.source,c)?'<div class="ov-source">'+source(n.temperatureSource||n.source,c)+'</div>':'')+'</div>',
      skyTag=tagOf('hestia-weather-sky','niak-weather-sky'),
      sky=opt(c,'show_animations')&&skyTag?'<div class="sky-layer ov-sky"><'+skyTag+'></'+skyTag+'></div>':'',
      events=opt(c,'show_events')?'<div class="ov-events">'+eventList(v,{...c,show_title:true})+'</div>':'';
    const copy='<div class="ov-copy">'+(alerts?'<div class="chips">'+alerts+'</div>':'')+bulletin+'</div>';
    const isLeft=c.temperature_position==='left',classic=c.overview_layout==='classic';
    return '<section class="overview">'+sky+title+'<div class="ov-grid '+(classic?'layout-classic':'layout-compact')+
      ' '+(isLeft?'temp-left':'temp-right')+'">'+
      (classic?current+copy:isLeft?current+copy:copy+current)+'</div>'+events+'</section>';
  }
  function eventList(v,c){
    const list=(v.timeline?.length?v.timeline:v.points||[]).slice(0,12), alerts=v.alerts||[];
    if(!list.length&&!alerts.length&&!(v.hours||[]).length)return empty('Aucun événement météo à signaler.');
    const when=x=>x.clock||(x.at?new Date(x.at*1000).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}):'Maintenant');
    const fallback=`<div class="events">${alerts.map(x=>`<div class="event alert${x.level||1}">${icon(x.icon)}<div><span class="label">${esc(x.label||'Vigilance')}</span><b>${esc(x.text)}</b></div></div>`).join('')}${list.map(x=>`<div class="event">${icon(x.icon)}<div><span class="label">${esc(when(x))}${x.label?` · ${esc(x.label)}`:''}</span><b>${esc(x.text)}</b></div></div>`).join('')}</div>`;
    const friseTag=tagOf('hestia-frise','niak-frise'),native=friseTag?'<'+friseTag+'></'+friseTag+'>':fallback;
    return wrap(`${opt(c,'show_title')?label('Événements'):''}${native}`,c,'events');
  }
  function localState(hass,id){
    const state=hass?.states?.[id];
    return !state||['unknown','unavailable','none',''].includes(String(state.state).toLowerCase())?null:state;
  }
  function localMetric(hass,id){
    const s=localState(hass,id),n=s?Number(s.state):NaN;
    return Number.isFinite(n)?n:null;
  }
  function sunTime(value){
    const d=value?new Date(value):null;
    if(!d||!Number.isFinite(d.getTime()))return '—';
    const clock=new Intl.DateTimeFormat('fr-FR',{hour:'2-digit',minute:'2-digit'}).format(d);
    const now=new Date(),today=new Date(now.getFullYear(),now.getMonth(),now.getDate());
    const tomorrow=new Date(now.getFullYear(),now.getMonth(),now.getDate()+1);
    const key=x=>[x.getFullYear(),x.getMonth(),x.getDate()].join('-');
    if(key(d)===key(today))return clock;
    return clock+' · '+(key(d)===key(tomorrow)?'demain':
      new Intl.DateTimeFormat('fr-FR',{day:'numeric',month:'short'}).format(d));
  }
  function sunMaskIds(hass,c){
    const states=hass?.states||{};
    const diagram=c.sun_diagram_entity||Object.keys(states).find(id=>/^sensor\..+_solar_diagram$/.test(id))||'';
    const live=c.sun_elevation_entity||diagram.replace(/_solar_diagram$/,'_sun_effective_elevation');
    return {diagram,elevation:states[live]?live:''};
  }
  function sunlightPanel(hass,c){
    const sun=localState(hass,'sun.sun'),attributes=sun?.attributes||{};
    const d=localMetric(hass,c.sun_difference_entity||'sensor.difference_de_soleil');
    const minutes=localMetric(hass,c.sun_duration_entity||'sensor.sunterrasse_sun_duration');
    const diff=d===null?'—':(d>0?'+':d<0?'−':'')+num(Math.abs(d),0)+' min';
    const duration=minutes===null?'—':Math.floor(Math.max(0,minutes)/60)+'h'+
      String(Math.round(Math.max(0,minutes)%60)).padStart(2,'0');
    const header='<header class="sun-head">'+
      (opt(c,'show_title')?icon('mdi:weather-sunny','head-icon')+'<strong>Soleil & Ensoleillement</strong>':'')+
      (opt(c,'show_date')?'<span class="sun-day">'+esc(new Intl.DateTimeFormat('fr-FR',{weekday:'long',day:'numeric',month:'long'}).format(new Date()))+'</span>':'')+
      source('Home Assistant · Solar Mask',c)+'</header>';
    const metrics='<div class="sun-metrics">'+
      '<div class="sun-metric" data-entity="'+esc(c.sun_difference_entity||'sensor.difference_de_soleil')+'">'+
      label('Évolution du jour')+'<b>'+esc(diff)+'</b></div>'+
      '<div class="sun-metric" data-entity="'+esc(c.sun_duration_entity||'sensor.sunterrasse_sun_duration')+'">'+
      label('Ensoleillement de la maison')+'<b>'+esc(duration)+'</b></div></div>';
    const events=[['Aube','next_dawn','mdi:weather-sunset-up'],['Lever','next_rising','mdi:weather-sunny'],
      ['Coucher','next_setting','mdi:weather-sunset-down'],['Crépuscule','next_dusk','mdi:weather-night']];
    const times=opt(c,'sun_show_times')?'<div class="sun-times">'+events.map(([name,attr,symbol])=>
      '<div class="sun-time">'+icon(symbol)+'<span>'+name+'</span><b>'+esc(sunTime(attributes[attr]))+'</b></div>').join('')+'</div>':'';
    const {diagram}=sunMaskIds(hass,c);
    const visual=opt(c,'sun_show_diagram')?'<div class="solar-chart-host">'+
      (diagram&&customElements.get('solar-mask-card')?'<solar-mask-card></solar-mask-card>':
        '<p class="sun-note">Installez Solar Mask Card et sélectionnez une entité sensor.…_solar_diagram pour afficher le diagramme solaire.</p>')+
      '</div>':'';
    return wrap(header+metrics+times+visual,c,c.sun_compact===false?'sun-home':'sun-home sun-compact');
  }
  function radarURL(value){
    const url=String(value||'').trim();
    if(!/^https?:\/\/[^\s<>"']+$/i.test(url))return '';
    try{const u=new URL(url);return /^https?:$/.test(u.protocol)?u.href:'';}catch{return '';}
  }
  function radarFrame(c,kind){
    const actual=kind==='current',name=actual?'Radar actuel':'Prévisions de pluie';
    const url=radarURL(actual?c.radar_url_current:c.radar_url_forecast);
    const h=Math.max(180,Math.min(950,Number(c.radar_height)||420));
    return '<section class="radar-frame" data-radar-panel="'+kind+'">'+
      
      (url?'<iframe loading="lazy" title="'+name+'" src="'+esc(url)+
        '" style="height:'+h+'px" referrerpolicy="no-referrer-when-downgrade" sandbox="allow-scripts allow-same-origin allow-forms allow-popups"></iframe>':
        '<p class="sun-note">Adresse à renseigner dans la configuration. Aucune URL n’est définie par défaut.</p>')+
      '</section>';
  }
  function radarPanel(c){
    const layout=['grid','stack','tabs'].includes(c.radar_layout)?c.radar_layout:'grid';
    const buttons=layout==='tabs'?'<div class="radar-tabs"><button type="button" data-radar-tab="current">Actuel</button>'+
      '<button type="button" data-radar-tab="forecast">Prévisions</button></div>':'';
    return wrap(heading('Radars de pluie','mdi:radar','',c)+buttons+
      '<div class="radar-grid radar-'+layout+'">'+radarFrame(c,'current')+radarFrame(c,'forecast')+'</div>'+
      (opt(c,'show_source')?'<p class="radar-source">Contenu fourni directement par les sites configurés.</p>':''),
      c,'radar-module');
  }
  const CSS = `
    :host{display:block;--nw-bg:var(--ha-card-background,var(--card-background-color,var(--primary-background-color,#fff)));--nw-glass-base:var(--primary-background-color,var(--nw-bg));--nw-fg:var(--primary-text-color,#26334b);--nw-fg2:var(--secondary-text-color,#5f6880);--nw-line:var(--divider-color,#dde1e9);--nw-soft:color-mix(in srgb,var(--nw-wind) 12%,transparent);--nw-wind:var(--hestia-wind-color,var(--niak-wind-color,#8798d2));--nw-wind-light:color-mix(in srgb,var(--nw-wind) 44%,transparent);--nw-pressure:var(--hestia-pressure-color,var(--niak-pressure-color,#aaa0da));--nw-pollen:var(--hestia-calm-color,var(--niak-calm-color,#69b8a2));--nw-rain:var(--hestia-rain-color,var(--niak-rain-color,#4fb3bf));
          --nw-accent:var(--primary-color,#03a9f4);--nw-radius:14px;--nw-radius-pill:999px;
          --nw-fs-label:10px;--nw-fs-small:12px;--nw-fs-text:13px;--nw-label-spacing:.6px;--nw-ink:34%;
          --nw-glass-clear:color-mix(in srgb,var(--nw-bg) 45%,transparent);
          --nw-glass-strong:color-mix(in srgb,var(--nw-bg) 84%,transparent);
          --nw-frost:blur(14px) saturate(1.6);--nw-ease:cubic-bezier(.2,.8,.2,1);
          --nw-calm:var(--hestia-calm-color,var(--niak-calm-color,oklch(.83 .075 150)));--nw-heat:var(--hestia-heat-color,var(--niak-heat-color,oklch(.83 .085 42)));
          --nw-cold:var(--hestia-cold-color,var(--niak-cold-color,oklch(.85 .05 220)));--nw-level1:var(--hestia-level1-color,var(--niak-level1-color,oklch(.88 .1 96)));
          --nw-level2:var(--hestia-level2-color,var(--niak-level2-color,oklch(.81 .105 64)));--nw-level3:var(--hestia-level3-color,var(--niak-level3-color,oklch(.74 .115 18)));
          --nw-motion:running;color:var(--nw-fg);font-family:var(--paper-font-body1_-_font-family,inherit)}
    ha-card{display:block;padding:0;--nw-card-surface:color-mix(in srgb,var(--nw-glass-base) 72%,transparent);background:var(--nw-card-surface);backdrop-filter:blur(12px) saturate(1.15);-webkit-backdrop-filter:blur(12px) saturate(1.15);color:var(--nw-fg);overflow:hidden;container-type:inline-size;border-radius:var(--ha-card-border-radius,14px);box-sizing:border-box}
    ha-card.bg-theme{--nw-card-surface:var(--nw-bg);backdrop-filter:none;-webkit-backdrop-filter:none}
    ha-card.bg-transparent{--nw-card-surface:transparent;backdrop-filter:none;-webkit-backdrop-filter:none}
    @media(prefers-reduced-transparency:reduce){ha-card.bg-glass{--nw-card-surface:var(--nw-bg);backdrop-filter:none;-webkit-backdrop-filter:none}}
    ha-card.no-border{border:0;box-shadow:none;border-radius:0}
    .inner{padding:20px 22px;display:flex;flex-direction:column;gap:15px;box-sizing:border-box;min-width:0}
    .head{display:flex;gap:12px;align-items:center;min-width:0}
    .head strong{font-size:19px;line-height:1.25;font-weight:750;letter-spacing:-.2px;flex:1}
    .head-icon{--mdc-icon-size:24px;box-sizing:content-box;padding:10px;background:var(--nw-soft);color:var(--nw-wind);border-radius:13px;flex:none}
    .source{font-size:12px;padding:6px 10px;border:1px solid var(--nw-line);border-radius:999px;white-space:nowrap;max-width:38%;overflow:hidden;text-overflow:ellipsis;color:var(--nw-fg)}
    .label{display:block;font-size:11px;letter-spacing:1px;text-transform:uppercase;font-weight:750;color:var(--nw-fg2);line-height:1.35}
    .chips{display:flex;gap:8px;flex-wrap:wrap}
    .chip{display:inline-flex;align-items:center;gap:5px;background:color-mix(in srgb,var(--nw-wind) 9%,transparent);border-radius:10px;padding:7px 10px;color:var(--nw-fg);font-size:12px;line-height:1.4}
    .chip ha-icon{--mdc-icon-size:16px;color:var(--nw-wind)}
    .chip b{font-weight:750}
    .moon-panel{gap:12px}
    .moon-header{flex-wrap:wrap}
    .moon-header .source{margin-left:auto}
    .moon-current-date{font-size:11px;color:var(--nw-fg2)}
    .moon-main{display:grid;grid-template-columns:minmax(100px,160px) minmax(0,1fr);align-items:center;gap:18px;min-width:0}
    .moon-main.moon-right{grid-template-columns:minmax(0,1fr) minmax(100px,160px)}
    .moon-right .moon-visual{order:2}
    .moon-visual{display:grid;place-items:center;min-width:0;width:100%;aspect-ratio:1;
          border-radius:50%;background:radial-gradient(circle,color-mix(in srgb,var(--nw-wind) 15%,transparent),transparent 75%)}
    .moon-disk{width:100%;height:auto;max-width:160px;filter:drop-shadow(0 8px 15px #0004)}
    .moon-unavailable{font-size:84px;color:var(--nw-fg2)}
    .moon-info{min-width:0;display:flex;flex-direction:column;gap:6px}
    .moon-phase{font-size:21px;font-weight:750;line-height:1.2;color:var(--nw-fg)}
    .moon-illumination{font-size:29px;font-weight:750;font-variant-numeric:tabular-nums}
    .moon-illumination span{font-size:12px;font-weight:500;color:var(--nw-fg2)}
    .moon-stats{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 14px;margin-top:5px}
    .moon-stat{display:flex;justify-content:space-between;align-items:baseline;gap:12px;border-bottom:1px solid var(--nw-line);padding:7px 0;font-size:12px;min-width:0}
    .moon-stat span{color:var(--nw-fg2);overflow-wrap:break-word}
    .moon-stat b{text-align:right;font-weight:700;font-variant-numeric:tabular-nums;white-space:nowrap}
    .moon-future{border-top:1px solid var(--nw-line);padding-top:12px;display:flex;gap:8px 16px;flex-wrap:wrap}
    .moon-future-list{flex:1 1 100%;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px 16px}
    .moon-future-list>div{display:flex;justify-content:space-between;gap:10px;align-items:center;font-size:12px}
    .moon-future-list>div span{color:var(--nw-fg2)}
    .moon-future-list>div b{font-weight:650;white-space:nowrap}
    .moon-position{display:inline-flex;align-items:center;gap:5px;font-size:11px;color:var(--nw-fg2)}
    .moon-position ha-icon{--mdc-icon-size:15px;color:var(--nw-wind)}
    @container(max-width:540px){.moon-main{grid-template-columns:minmax(80px,116px) minmax(0,1fr);gap:10px}
    .moon-main.moon-right{grid-template-columns:minmax(0,1fr) minmax(80px,116px)}
    .moon-phase{font-size:17px}
    .moon-illumination{font-size:24px}
    .moon-stats{grid-template-columns:1fr}
    .moon-stat{padding:4px 0;font-size:11px}
    .moon-future-list{grid-template-columns:1fr}}
    @container(max-width:320px){.moon-main{grid-template-columns:1fr;text-align:center}
    .moon-main.moon-right{grid-template-columns:1fr}
    .moon-main .moon-visual{width:min(55%,145px);margin:auto}
    .moon-right .moon-visual{order:0}
    .moon-stats{text-align:left}}
    .overview{position:relative;isolation:isolate;overflow:hidden;display:grid;gap:16px;min-width:0;padding:20px 24px 24px;background:color-mix(in srgb,var(--nw-card-surface) 40%,transparent)}
    .overview>.sky-layer{position:absolute;inset:0;opacity:.36;z-index:-1;pointer-events:none}
    .overview>:not(.sky-layer){position:relative;z-index:1}
    .ov-head{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
    .ov-head strong{font-size:22px;font-weight:800}
    .ov-head>span{font-size:12px;color:var(--nw-fg2)}
    .ov-season{display:flex;align-items:center;gap:4px;border-radius:999px;padding:5px 9px;background:color-mix(in srgb,var(--nw-calm) 22%,transparent)}
    .ov-season ha-icon{--mdc-icon-size:16px}
    .ov-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(220px,36%);gap:22px;min-width:0}
    .ov-copy{display:flex;flex-direction:column;justify-content:flex-end;gap:15px;min-width:0}
    .ov-grid.temp-left{grid-template-columns:minmax(220px,36%) minmax(0,1fr)}
    .ov-grid.temp-left .ov-now{grid-column:1;grid-row:1;align-items:flex-start;text-align:left}
    .ov-grid.temp-left .ov-copy{grid-column:2;grid-row:1}
    .ov-grid.temp-left .ov-condition{justify-content:flex-start}
    .ov-grid.temp-left .ov-now .ov-source{align-self:flex-start}
    .ov-bulletin{display:grid;gap:10px;max-width:72ch}
    .ov-bulletin p{margin:0;font-size:15px;line-height:1.6;font-weight:500}
    .ov-now{display:flex;flex-direction:column;align-items:flex-end;text-align:right;gap:8px;min-width:0}
    .ov-condition{display:flex;align-items:center;justify-content:flex-end;gap:7px}
    .ov-condition ha-icon{--mdc-icon-size:24px;color:var(--nw-wind);flex:none}
    .ov-condition b{font-size:17px;line-height:1.25;overflow-wrap:anywhere}
    .ov-temp{font-size:62px;line-height:1.05;font-weight:780;letter-spacing:-1.5px;white-space:nowrap;font-variant-numeric:tabular-nums}
    .ov-temp span{font-size:23px;font-weight:450;letter-spacing:0}
    .ov-range{display:flex;gap:14px;color:var(--nw-fg2);font-size:14px}
    .ov-trend{display:inline-flex;gap:6px;align-items:center;background:color-mix(in srgb,var(--nw-heat) 20%,transparent);border-radius:999px;padding:6px 11px;font-size:14px;font-weight:750}
    .ov-trend ha-icon{--mdc-icon-size:16px;color:var(--nw-heat)}
    .ov-source .source{max-width:100%;display:block}
    .ov-events .inner.events{padding:3px 0}
    @container(max-width:630px){.overview{padding:15px 16px}
    .ov-grid{grid-template-columns:minmax(0,1fr) minmax(130px,44%);gap:12px}
    .ov-grid.temp-left{grid-template-columns:minmax(130px,44%) minmax(0,1fr)}
    .ov-grid.temp-left .ov-now{grid-column:1;grid-row:1;align-items:flex-start;text-align:left}
    .ov-grid.temp-left .ov-copy{grid-column:2;grid-row:1}
    .ov-grid.temp-left .ov-condition{justify-content:flex-start}
    .ov-grid.temp-right .ov-now{grid-column:2;grid-row:1;align-items:flex-end;text-align:right}
    .ov-grid.temp-right .ov-copy{grid-column:1;grid-row:1}
    .ov-grid.temp-right .ov-condition{justify-content:flex-end}
    .ov-temp{font-size:clamp(34px,11cqw,48px);letter-spacing:-.8px}
    .ov-temp span{font-size:clamp(14px,4cqw,20px)}
    .ov-condition b{font-size:clamp(12px,3.5cqw,16px)}
    .ov-bulletin p{font-size:13px}}
    @container(max-width:350px){.ov-grid,.ov-grid.temp-left{grid-template-columns:minmax(0,1fr)}
    .ov-grid.temp-left .ov-now,.ov-grid.temp-right .ov-now{grid-column:1;grid-row:1}
    .ov-grid.temp-left .ov-copy,.ov-grid.temp-right .ov-copy{grid-column:1;grid-row:2}
    .ov-grid.temp-left .ov-now{align-items:flex-start;text-align:left}
    .ov-grid.temp-right .ov-now{align-items:flex-end;text-align:right}}
    .ov-grid.layout-classic{display:flex;flex-direction:column;gap:22px}
    .ov-grid.layout-classic .ov-now{flex:0 1 auto;max-width:100%;grid-column:auto;grid-row:auto}
    .ov-grid.layout-classic .ov-copy{width:100%;grid-column:auto;grid-row:auto}
    .ov-grid.layout-classic.temp-left .ov-now{align-self:flex-start;align-items:flex-start;text-align:left}
    .ov-grid.layout-classic.temp-left .ov-condition{justify-content:flex-start}
    .ov-grid.layout-classic.temp-right .ov-now{align-self:flex-end;align-items:flex-end;text-align:right}
    .ov-grid.layout-classic.temp-right .ov-condition{justify-content:flex-end}
    @container(max-width:630px){.ov-grid.layout-classic{gap:18px}
    .ov-grid.layout-classic .ov-now{grid-column:auto;grid-row:auto}
    .ov-grid.layout-classic .ov-copy{grid-column:auto;grid-row:auto}}
    @container(max-width:350px){.ov-grid.layout-classic.temp-left .ov-now,.ov-grid.layout-classic.temp-right .ov-now{grid-column:auto;grid-row:auto}
    .ov-grid.layout-classic.temp-left .ov-copy,.ov-grid.layout-classic.temp-right .ov-copy{grid-column:auto;grid-row:auto}}
    .moon-photo{width:100%;max-width:160px;height:auto;aspect-ratio:1;object-fit:contain;filter:drop-shadow(0 8px 15px #0004)}
    .moon-fallback{display:none;width:100%;height:100%;place-items:center}
    .moon-fallback.show{display:grid}
    .moon-photo[hidden]{display:none}
    .sun-home,.radar-module{gap:14px}
    .sun-head{display:flex;align-items:center;flex-wrap:wrap;gap:10px}
    .sun-head strong{font-size:19px;font-weight:750;flex:1}
    .sun-head .source{margin-left:auto}
    .sun-day{font-size:12px;color:var(--nw-fg2)}
    .sun-metrics{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
    .sun-metric{padding:10px 12px;border-radius:12px;background:transparent;display:flex;flex-direction:column;gap:5px}
    .sun-metric .label{font-size:10px;letter-spacing:.7px}
    .sun-metric b{font-size:22px;font-weight:750;line-height:1.22}
    .sun-metric b{font-variant-numeric:tabular-nums}
    .sun-metric small{font-size:11px;color:var(--nw-fg2)}
    .sun-times{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
    .sun-time{padding:10px 6px;border:1px solid var(--nw-line);border-radius:12px;display:flex;flex-direction:column;gap:5px;align-items:center;text-align:center}
    .sun-time ha-icon{--mdc-icon-size:22px;color:var(--nw-heat)}
    .sun-time span{color:var(--nw-fg2);font-size:11px}
    .sun-time b{font-size:12px;font-weight:750;font-variant-numeric:tabular-nums}
    .solar-chart-host solar-mask-card{display:block;min-width:0}
    .sun-note{padding:20px;border:1px dashed var(--nw-line);border-radius:12px;color:var(--nw-fg2);font-size:13px;line-height:1.5}
    .radar-grid{display:grid;gap:14px}
    .radar-grid.radar-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
    .radar-grid.radar-stack,.radar-grid.radar-tabs{grid-template-columns:minmax(0,1fr)}
    .radar-frame{min-width:0;display:flex;flex-direction:column;gap:0}
    .radar-frame header{display:flex;align-items:center;gap:8px}
    .radar-frame header ha-icon{--mdc-icon-size:20px;color:var(--nw-wind)}
    .radar-frame strong{font-size:14px}
    .radar-frame iframe{width:100%;border:1px solid var(--nw-line);border-radius:12px;box-sizing:border-box;background:var(--nw-bg)}
    .radar-tabs{display:flex;gap:8px}
    .radar-tabs button{flex:1;padding:9px;border:1px solid var(--nw-line);border-radius:999px;background:transparent;color:var(--nw-fg);font:inherit;cursor:pointer}
    .radar-tabs button[aria-pressed="true"]{background:var(--nw-soft);border-color:var(--nw-wind)}
    .radar-tabs .radar-frame{min-width:0}
    .radar-tabs.radar-forecast .radar-frame[data-radar-panel="current"]{display:none}
    .radar-grid.radar-tabs .radar-frame[data-radar-panel="forecast"]{display:none}
    .radar-grid.radar-tabs.radar-forecast .radar-frame[data-radar-panel="forecast"]{display:flex}
    .radar-grid.radar-tabs.radar-forecast .radar-frame[data-radar-panel="current"]{display:none}
    .radar-source{font-size:11px;color:var(--nw-fg2);margin:0}
    @container(max-width:660px){.radar-grid.radar-grid{grid-template-columns:minmax(0,1fr)}}
    @container(max-width:450px){.sun-metrics{grid-template-columns:1fr}
    .sun-times{grid-template-columns:repeat(2,minmax(0,1fr))}}
    .sun-home.sun-compact{padding:13px 14px;gap:10px}
    .sun-compact .sun-head{gap:7px}
    .sun-compact .sun-head strong{font-size:16px}
    .sun-compact .sun-head .head-icon{--mdc-icon-size:19px;padding:6px;border-radius:10px}
    .sun-compact .sun-head .source{font-size:10px;padding:3px 6px}
    .sun-compact .sun-day{font-size:10px}
    .sun-compact .sun-metrics{grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}
    .sun-compact .sun-metric{padding:8px 9px;gap:3px;border-radius:9px;min-width:0}
    .sun-compact .sun-metric .label{font-size:9px;line-height:1.3}
    .sun-compact .sun-metric b{font-size:17px;line-height:1.2}
    .sun-compact .sun-metric small{font-size:10px;line-height:1.3}
    .sun-compact .sun-times{grid-template-columns:repeat(4,minmax(0,1fr));gap:5px}
    .sun-compact .sun-time{padding:6px 2px;gap:3px;border-radius:8px;min-width:0}
    .sun-compact .sun-time ha-icon{--mdc-icon-size:17px}
    .sun-compact .sun-time span,.sun-compact .sun-time b{font-size:10px}
    .sun-compact .sun-time b{overflow-wrap:anywhere}
    .sun-compact .solar-chart-host solar-mask-card{display:block;width:100%;min-width:0}
    @container(max-width:450px){.sun-compact .sun-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}
    .sun-compact .sun-times{grid-template-columns:repeat(4,minmax(0,1fr))}}
    @container(max-width:300px){.sun-compact .sun-times{grid-template-columns:repeat(2,minmax(0,1fr))}}
    .note{color:var(--nw-fg2);font-size:12px;line-height:1.5;margin:0}
    .inner.events{padding:12px 16px 16px;gap:10px}
    .inner.events>.label{margin:0 4px}
    .inner.events>hestia-frise,.inner.events>niak-frise{display:block;min-width:0}
    .events{display:flex;gap:10px;overflow-x:auto;overscroll-behavior-x:contain;padding:4px 2px 8px;scroll-snap-type:x proximity}
    .event{display:flex;gap:8px;align-items:flex-start;min-width:165px;max-width:260px;flex:1 0 170px;border:1px solid var(--nw-line);border-radius:12px;background:color-mix(in srgb,var(--nw-wind) 5%,var(--nw-card-surface));padding:12px;scroll-snap-align:start}
    .event ha-icon{color:var(--nw-wind);--mdc-icon-size:20px}
    .event>div{display:flex;flex-direction:column;gap:5px}
    .event b{font-size:12px;line-height:1.5;font-weight:650}
    .event.alert2,.event.alert3{border-color:var(--warning-color,#edb65e)}
    .sky-layer{position:absolute;inset:0;pointer-events:none;opacity:.32;z-index:0}
    .empty{color:var(--nw-fg2);padding:22px;font-size:14px;line-height:1.6}
    .wait{display:flex;align-items:center;gap:10px;padding:22px;color:var(--nw-fg2);font-size:14px}
    .wait ha-icon{color:var(--nw-wind)}
    @container (max-width:500px){.inner{padding:15px;gap:12px}
    .head strong{font-size:17px}
    .head-icon{padding:8px}
    .source{font-size:11px}}
    @media (prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important}}
    @container (max-width:500px){.inner{padding:15px;gap:12px}.head strong{font-size:17px}.head-icon{padding:8px}.source{font-size:11px}}
  `;
  const FORMAT_NAMES = Object.fromEntries(FORMATS.map(x=>[x[0],x[1]]));
  class NiakModularCard extends HTMLElement {
    constructor(){super();this.attachShadow({mode:'open'});this._config={type:`custom:${ELEMENT}`,format:'overview'};this._view=null;this._error='';this._hass=null;this._connection=null;this._subscription=null;this._requestedEntry=null;this._generation=0;this._renderKey='';this._onEvent=e=>{const target=e.composedPath().find(x=>x?.getAttribute?.('data-entity'));const entity=target?.getAttribute('data-entity');if(entity){this.dispatchEvent(new CustomEvent('hass-more-info',{detail:{entityId:entity},bubbles:true,composed:true}));}};this.shadowRoot.addEventListener('click',this._onEvent);this.shadowRoot.addEventListener('click',e=>{const tab=e.composedPath?.().find(x=>x?.getAttribute?.('data-radar-tab'));if(tab){this._radarTab=tab.getAttribute('data-radar-tab');this._updateRadarTabs();}});}
    static getStubConfig(){return {type:`custom:${ELEMENT}`,format:'overview'};}
    static getConfigElement(){return document.createElement('hestia-weather-addon-editor');}
    setConfig(config){if(!config||!ACCEPTED.has(config.format||'overview'))throw new Error('Hestia Weather Add-on : format inconnu.');const old=this._config;const cc=normalize(config);this._config={...DEFAULTS,...cc};if(old?.entry_id!==this._config.entry_id){this._view=null;this._stopSubscription();}this._render();this._subscribe();}
    set hass(hass){const differentConnection=this._connection && hass?.connection!==this._connection;this._hass=hass;if(differentConnection){this._view=null;this._stopSubscription();}this._subscribe();if(['moon','sun-home','radars'].includes(this._config.format))this._render();}
    get hass(){return this._hass;}
    connectedCallback(){this._render();this._subscribe();}
    disconnectedCallback(){this._stopSubscription();}
    getCardSize(){return this._config.format==='moon'||this._config.format==='overview'?5:4;}
    getGridOptions(){if(this._config.format==='sun-home')return {columns:4,rows:'auto',min_columns:4};return {columns:12,rows:'auto',min_columns:3};}
    _stopSubscription(){this._generation++;const sub=this._subscription;this._subscription=null;this._requestedEntry=null;if(sub){sub.then(stop=>typeof stop==='function'?stop():null).catch(()=>{});}}
    _subscribe(){if(this._config?.format!=='overview'){if(this._subscription)this._stopSubscription();return;}if(!this.isConnected||!this._hass?.connection||!this._config)return;const entry=this._config.entry_id||'';if(this._subscription&&this._requestedEntry===entry&&this._connection===this._hass.connection)return;this._stopSubscription();this._connection=this._hass.connection;this._requestedEntry=entry;this._error='';const gen=this._generation;const body=entry?{entry_id:entry}:{};const onEvent=data=>{if(gen!==this._generation)return;if(data.reload){this._view=null;this._error='La configuration Hestia Weather a changé. Rechargez la page.';}else if(data.version!==1){this._error='Version de données Hestia Weather non compatible (attendue : 1).';this._view=null;}else{this._view=data.view;this._error='';}this._render();};const subscribeTo=domain=>this._connection.subscribeMessage(onEvent,{type:domain+'/subscribe',...body});const pending=subscribeTo(WS_DOMAINS[0]).catch(e=>{if(e?.code!=='unknown_command')throw e;return subscribeTo(WS_DOMAINS[1]);});this._subscription=pending;Promise.resolve(pending).catch(e=>{if(gen!==this._generation)return;this._subscription=null;const msg=e?.code==='choose_entry'?'Plusieurs lieux Hestia Weather : indiquez entry_id dans la carte.':e?.code==='not_configured'?'Configurez d’abord l’intégration Hestia Weather.':e?.code==='unknown_command'?'Intégration Hestia Weather (ex-Niak Weather) introuvable.':e?.message||'Impossible de recevoir les données Hestia Weather.';this._error=msg;this._render();});}
    _syncEmbeddedWidgets(c){
      // Keep the Lit timeline instance alive. Its internal 4.5s timer must survive every incoming weather update.
      this.shadowRoot.querySelectorAll('hestia-frise,niak-frise').forEach(f=>{
        const v=this._view||{};
        f.points=v.points||[];f.alerts=v.alerts||[];f.hours=v.hours||[];f.timeline=v.timeline;
      });
      this.shadowRoot.querySelectorAll('hestia-weather-sky,niak-weather-sky').forEach(s=>{
        const v=this._view||{},n=v.now||{};
        s.condition=n.condition||'unknown';s.phase=n.phase||'unknown';s.animated=opt(c,'show_animations');
        s.quality='low';s.wind=n.wind||0;s.gust=v.wind?.gust?.at(-1)?.[1]||0;
        s.detail=n.detail||'';s.season=v.season?.info?.season||'';
      });
      this.shadowRoot.querySelectorAll('.moon-photo').forEach(img=>{
        img.onerror=()=>{img.hidden=true;img.nextElementSibling?.classList.add('show');};
      });
    }
    _updateOverviewWithoutResettingFrise(body){
      const root=this.shadowRoot.querySelector?.('section.overview');
      if(!root)return false;
      const template=document.createElement('template');template.innerHTML=body;
      const next=template.content.querySelector('section.overview');
      if(!next)return false;
      const oldChildren=[...root.children],newChildren=[...next.children];
      if(oldChildren.length!==newChildren.length||!oldChildren.some(el=>el.classList.contains('ov-events')))return false;
      if(!oldChildren.every((el,i)=>el.classList.contains('ov-events')===newChildren[i].classList.contains('ov-events')))return false;
      oldChildren.forEach((el,i)=>{if(!el.classList.contains('ov-events'))el.replaceWith(newChildren[i]);});
      return true;
    }
    _updateOverviewWithoutResettingFrise(body){
      const root=this.shadowRoot.querySelector?.('section.overview');
      if(!root)return false;
      const template=document.createElement('template');template.innerHTML=body;
      const next=template.content.querySelector('section.overview');
      if(!next)return false;
      const oldChildren=[...root.children],newChildren=[...next.children];
      if(oldChildren.length!==newChildren.length||!oldChildren.some(el=>el.classList.contains('ov-events')))return false;
      if(!oldChildren.every((el,i)=>el.classList.contains('ov-events')===newChildren[i].classList.contains('ov-events')))return false;
      oldChildren.forEach((el,i)=>{if(!el.classList.contains('ov-events'))el.replaceWith(newChildren[i]);});
      return true;
    }
    _updateSolarChart(){
      const c=this._config,{diagram,elevation}=sunMaskIds(this._hass,c);
      const node=this.shadowRoot.querySelector?.('solar-mask-card');
      if(!diagram||!node||typeof node.setConfig!=='function')return;
      const cfg={entity:diagram,...(elevation?{sun_entity:elevation}:{}),
        height:Math.max(180,Math.min(c.sun_compact===false?620:260,Number(c.sun_diagram_height)||(c.sun_compact===false?320:240)))};
      const key=JSON.stringify(cfg);
      if(node._niakSolarKey!==key){node.setConfig(cfg);node._niakSolarKey=key;}
      if(this._hass)node.hass=this._hass;
      const applyMaskStyle=()=>{
        if(!node.shadowRoot?.querySelector||!node.shadowRoot?.appendChild)return;
        let style=node.shadowRoot.querySelector('#niak-compact-solar');
        if(!style){style=document.createElement('style');style.id='niak-compact-solar';node.shadowRoot.appendChild(style);}
        const borderless=c.sun_mask_border!==true?[
          ':host{--ha-card-border-width:0!important;--ha-card-box-shadow:none!important;--ha-card-background:transparent!important}',
          'ha-card{border:0!important;box-shadow:none!important;outline:none!important;background:transparent!important}'
        ]:[];
        // Remove the duplicated Solar Mask title and its opaque SVG plot background.
        // The graphic paths, labels and legend remain untouched.
        const diagramStyle=[
          '.card-header,#title{display:none!important}',
          '#chart-container svg>rect{fill:transparent!important}',
          '#chart-container{background:transparent!important}'
        ];
        style.textContent=[...borderless,...diagramStyle,...(c.sun_compact===false?[]:[
          'ha-card{padding:7px 5px 8px!important}',
          '.card-header{font-size:12px!important;padding-bottom:3px!important}',
          '.legend{font-size:10px!important;gap:3px 8px!important;margin-top:4px!important}',
          '.info-bar{margin-top:5px!important;padding:5px 0 0!important}',
          '.info-value{font-size:11px!important}'
        ])].join('');
      };
      applyMaskStyle();
      if(node.updateComplete?.then)node.updateComplete.then(applyMaskStyle).catch(()=>{});
    }
    _renderLocal(){
      const c=this._config;
      const radar=c.format==='radars',ids=radar?[]:['sun.sun',
        c.sun_difference_entity,c.sun_duration_entity,sunMaskIds(this._hass,c).diagram];
      const key=JSON.stringify(radar?c:[c,...ids.map(id=>[id,this._hass?.states?.[id]?.state,
        id==='sun.sun'?this._hass?.states?.[id]?.attributes:null])]);
      if(key!==this._localKey){
        this.shadowRoot.innerHTML='<style>'+CSS+'</style><ha-card class="bg-'+
          (BACKGROUND_MODES.some(x=>x[0]===c.background_mode)?c.background_mode:'glass')+'">'+
          (radar?radarPanel(c):sunlightPanel(this._hass,c))+'</ha-card>';
        this._localKey=key;
      }
      if(!radar)this._updateSolarChart();
      else this._updateRadarTabs();
    }
    _updateRadarTabs(){
      const panel=this.shadowRoot.querySelector?.('.radar-grid.radar-tabs');
      panel?.classList?.toggle('radar-forecast',this._radarTab==='forecast');
      this.shadowRoot.querySelectorAll('[data-radar-tab]').forEach(btn=>{
        btn.setAttribute('aria-pressed',String(btn.getAttribute('data-radar-tab')===(this._radarTab||'current')));
      });
    }
    _renderRetired(){
      const c=this._config;
      this.shadowRoot.innerHTML='<style>'+CSS+'</style><ha-card class="bg-'+(BACKGROUND_MODES.some(x=>x[0]===c.background_mode)?c.background_mode:'glass')+'"><section class="inner"><div class="empty" role="note">'+
        icon('mdi:information-outline')+' Le format « '+esc(c.format)+' » n’est plus fourni par cet add-on : la carte <b>hestia-weather-card</b> de l’intégration Hestia Weather l’affiche directement. Remplacez cette carte (ou supprimez-la).</div></section></ha-card>';
    }
    _render(){
      if(!this.shadowRoot)return;
      const c=this._config;
      if(RETIRED_SET.has(c.format)){this._renderRetired();return;}
      if(c.format==='sun-home'||c.format==='radars'){this._renderLocal();return;}
      if(c.format==='moon'){
        const info=moonEntity(this._hass,c),key=JSON.stringify([c,info.state?.state,info.state?.attributes]);
        if(this._moonRenderKey===key&&this.shadowRoot.querySelector?.('section.moon-panel'))return;
        this._moonRenderKey=key;
      }
      let body='';
      try{
        body=c.format==='moon'?lunarCard(this._hass,c):this._error?`<div class="empty" role="alert">${icon('mdi:alert-circle-outline')} ${esc(this._error)}</div>`
          :!this._view?`<div class="wait">${icon('mdi:cloud-sync-outline')} Chargement des données Hestia Weather…</div>`
          :overview(this._view,c);
      }catch(e){body=`<div class="empty" role="alert">Erreur d’affichage : ${esc(e?.message||e)}</div>`;}
      const key=JSON.stringify(c), native=this.shadowRoot.querySelectorAll('hestia-frise,niak-frise');
      if(c.format==='overview'&&this._view&&!this._error&&native.length&&this._renderKey===key&&this._updateOverviewWithoutResettingFrise(body)){
        this._syncEmbeddedWidgets(c);return;
      }
      this.shadowRoot.innerHTML=`<style>${CSS}</style><ha-card class="bg-${BACKGROUND_MODES.some(x=>x[0]===c.background_mode)?c.background_mode:'glass'} ${opt(c,'show_border')?'':'no-border'}">${body}</ha-card>`;
      this._renderKey=key;
      this._syncEmbeddedWidgets(c);
    }
  }
  function localWeatherEditor(c,hass){
    const type=c.format,sun=type==='sun-home',radar=type==='radars';
    const text=(id,name,placeholder)=>'<label>'+name+'<input name="'+id+'" type="text" value="'+esc(c[id]||'')+
      '" placeholder="'+esc(placeholder||'')+'"/></label>';
    const toggle=(id,name)=>'<label class="toggle"><input type="checkbox" name="'+id+'" '+
      (opt(c,id)?'checked':'')+'/>'+name+'</label>';
    const select=(id,name,options,defaultValue)=>'<label>'+name+'<select name="'+id+'">'+
      options.map(([value,label])=>'<option value="'+value+'" '+((c[id]||defaultValue)===value?'selected':'')+'>'+
      esc(label)+'</option>').join('')+'</select></label>';
    const solarIds=Object.keys(hass?.states||{}).filter(id=>/^sensor\..+_solar_diagram$/.test(id));
    const solarSelect='<label>Diagramme Solar Mask<select name="sun_diagram_entity">'+
      '<option value="">Détection automatique</option>'+
      solarIds.map(id=>'<option value="'+esc(id)+'" '+(c.sun_diagram_entity===id?'selected':'')+'>'+esc(id)+'</option>').join('')+
      '</select></label>';
    const sunlight=sun?'<fieldset><legend>Soleil & Ensoleillement</legend>'+
      text('sun_difference_entity','Capteur des minutes gagnées/perdues','sensor.difference_de_soleil')+
      text('sun_duration_entity','Capteur durée de soleil en minutes','sensor.sunterrasse_sun_duration')+
      solarSelect+text('sun_elevation_entity','Élévation effective (facultatif)','sensor.zone_sun_effective_elevation')+
      toggle('sun_show_times','Afficher les quatre horaires du soleil')+
      toggle('sun_show_diagram','Afficher la carte Solar Mask')+
      '<label class="toggle"><input type="checkbox" name="sun_compact" '+(c.sun_compact!==false?'checked':'')+'/>Affichage compact (recommandé)</label>'+
      '<label class="toggle"><input type="checkbox" name="sun_mask_border" '+(c.sun_mask_border===true?'checked':'')+'/>Afficher la bordure Solar Mask</label>'+
      text('sun_diagram_height','Hauteur du diagramme (px, 240 par défaut en compact)','240')+
      '<p class="hint">La carte Solar Mask et son intégration doivent être installées pour afficher le diagramme. Les horaires sont les prochains événements de sun.sun.</p></fieldset>':'';
    const radars=radar?'<fieldset><legend>Radars de pluie — URL à renseigner</legend>'+
      text('radar_url_current','Adresse URL du radar actuel','https://votre-site/radar-actuel')+
      text('radar_url_forecast','Adresse URL du radar prévisionnel','https://votre-site/radar-previsions')+
      select('radar_layout','Disposition',[['grid','Côte à côte'],['stack','Superposés'],['tabs','Onglets']], 'grid')+
      text('radar_height','Hauteur de chaque radar (px)','420')+
      '<p class="hint">Aucune URL n’est renseignée automatiquement. L’intégration par iframe doit être autorisée par le site concerné.</p></fieldset>':'';
    return sunlight+radars;
  }
  class NiakModularEditor extends HTMLElement {
    constructor(){super();this.attachShadow({mode:'open'});this._config={type:`custom:${ELEMENT}`,format:'overview'};this._entries=[];this._loadedEntries=false;this.shadowRoot.addEventListener('change',event=>this._change(event));}
    setConfig(config){const cc=normalize(config);this._config={...DEFAULTS,...cc};this._render();}
    set hass(hass){if(this._hass?.connection===hass?.connection)return;this._hass=hass;if(this._config.format==='moon'){this._render();return;}if(!this._loadedEntries&&hass?.connection?.sendMessagePromise){this._loadedEntries=true;hass.connection.sendMessagePromise({type:WS_DOMAINS[0]+'/entries'}).catch(e=>{if(e?.code!=='unknown_command')throw e;return hass.connection.sendMessagePromise({type:WS_DOMAINS[1]+'/entries'});}).then(entries=>{this._entries=Array.isArray(entries)?entries:[];this._render();}).catch(()=>{});}}
    get hass(){return this._hass;}
    _change(event){const el=event.target;const c={...this._config};if(el.type==='checkbox')c[el.name]=el.checked;else if(el.name==='entry_id')c.entry_id=el.value||undefined;else c[el.name]=el.value;this._config=c;this.dispatchEvent(new CustomEvent('config-changed',{detail:{config:c},bubbles:true,composed:true}));this._render();}
    _render(){
      const c=this._config;
      const fields=(OPTION_KEYS[c.format]||[]).map(key=>`<label class="toggle"><input type="checkbox" name="${key}" ${opt(c,key)?'checked':''}/>${esc(OPTION_LABELS[key])}</label>`).join('');
      const backgroundSelector=`<label>Fond de la carte<select name="background_mode">${BACKGROUND_MODES.map(([value,label])=>`<option value="${value}" ${c.background_mode===value?'selected':''}>${esc(label)}</option>`).join('')}</select></label>`;
      const moonStates=Object.entries(this._hass?.states||{}).filter(([id,s])=>id.startsWith('sensor.')&&s?.attributes?.moon_age!==undefined&&s.attributes.illumination_fraction!==undefined);
      const localOptions=localWeatherEditor(c,this._hass);
      const overviewLayout=c.format==='overview'?`<label>Disposition de la synthèse<select name="overview_layout">
  <option value="compact" ${c.overview_layout!=='classic'?'selected':''}>Compacte — température et bulletin côte à côte</option>
  <option value="classic" ${c.overview_layout==='classic'?'selected':''}>Classique — bulletin sous la température</option>
</select></label>`:'';
      const tempPosition=c.format==='overview'?`<label>Position du bloc température<select name="temperature_position">
  <option value="right" ${c.temperature_position!=='left'?'selected':''}>Droite (par défaut)</option>
  <option value="left" ${c.temperature_position==='left'?'selected':''}>Gauche</option>
</select></label>`:'';
      const moonVis=c.format==='moon'?`<fieldset><legend>Visuel de la Lune</legend>
   <label>Source du visuel<select name="moon_visual_mode">${[['original','Images originales (Internet)'],['generated','SVG local généré'],['image','Image PNG/JPG/WebP personnalisée'],['svg','Fichier SVG personnalisé']].map(([id,name])=>`<option value="${id}" ${(c.moon_visual_mode||'original')===id?'selected':''}>${esc(name)}</option>`).join('')}</select></label>
   <label>URL de l’image ou du SVG<input type="text" name="moon_image_url" placeholder="/local/lune/{index}_moon.svg" value="${esc(c.moon_image_url||'')}"/></label>
   <span class="hint">{index} vaut 0–30, {phase} vaut le code de la phase. Repli sur SVG si l’image échoue.</span></fieldset>`:'';const moonSettings=c.format==='moon'? `<fieldset><legend>Lunar Phase — capteur et disposition</legend>
      <label>Capteur de phase lunaire<select name="moon_entity"><option value="">Détection automatique</option>${moonStates.map(([id,s])=>`<option value="${esc(id)}" ${c.moon_entity===id?'selected':''}>${esc(s.attributes.friendly_name||id)} (${esc(id)})</option>`).join('')}</select></label>
      <label>Position de la lune<select name="moon_position"><option value="left" ${c.moon_position!=='right'?'selected':''}>Gauche</option><option value="right" ${c.moon_position==='right'?'selected':''}>Droite</option></select></label>
      <label class="toggle"><input name="moon_southern_hemisphere" type="checkbox" ${c.moon_southern_hemisphere===true?'checked':''}/>Hémisphère sud (orientation)</label>
      <span class="hint">Source : ngocjohn/lunar-phase. Informations locales, sans service tiers.</span>
    </fieldset>`:'';
      const entries=c.format==='overview'&&this._entries.length>1?`<label>Lieu Hestia Weather<select name="entry_id"><option value="">Choisir…</option>${this._entries.map(x=>`<option value="${esc(x.entry_id)}" ${c.entry_id===x.entry_id?'selected':''}>${esc(x.title)}</option>`).join('')}</select></label>`:'';
      const retired=RETIRED_SET.has(c.format)?`<option value="${esc(c.format)}" selected>${esc(c.format)} (retiré — voir hestia-weather-card)</option>`:'';
      const hint=c.format==='moon'?'La carte Lune nécessite Lunar Phase (ngocjohn), pas Hestia Weather.':c.format==='overview'?'L’intégration Hestia Weather (ex-Niak Weather) doit être installée et configurée. Le choix du lieu est nécessaire si plusieurs lieux existent.':'Cette carte lit directement les entités de Home Assistant.';
      this.shadowRoot.innerHTML=`<style>:host{display:block;color:var(--primary-text-color);font-family:inherit;padding:12px}.form{display:grid;gap:15px}label{display:grid;gap:6px;font-size:14px}select,input[type=text]{box-sizing:border-box;padding:10px;background:var(--card-background-color,var(--primary-background-color,#fff));color:var(--primary-text-color);border:1px solid var(--divider-color,#ddd);border-radius:8px;width:100%}.toggle{display:flex;align-items:center;gap:10px}.toggle input{width:18px;height:18px;accent-color:var(--primary-color,#648bb2)}fieldset{border:1px solid var(--divider-color,#ddd);border-radius:9px;display:grid;gap:10px}legend{font-weight:700}.hint{color:var(--secondary-text-color);font-size:12px}</style><div class="form"><label>Type de carte<select name="format">${retired}${FORMATS.map(x=>`<option value="${x[0]}" ${c.format===x[0]?'selected':''}>${esc(x[1])}</option>`).join('')}</select></label>${entries}${localOptions}${moonSettings}${moonVis}<fieldset><legend>Apparence et personnalisation</legend>${backgroundSelector}${overviewLayout}${tempPosition}${fields}</fieldset><p class="hint">${hint}</p></div>`;
    }
  }
  if(!customElements.get(ELEMENT))customElements.define(ELEMENT,NiakModularCard);
  // Ancien nom de carte (custom:niak-weather-modular-card) : toujours accepté, sans apparaître dans le sélecteur.
  if(!customElements.get(LEGACY_ELEMENT))customElements.define(LEGACY_ELEMENT,class extends NiakModularCard{});
  if(!customElements.get('hestia-weather-addon-editor'))customElements.define('hestia-weather-addon-editor',NiakModularEditor);
  window.customCards=window.customCards||[];
  for(const [format,name,description] of FORMATS){
    const tag=`hestia-weather-addon-${format}-card`;
    const make=()=>class extends NiakModularCard {
      static getStubConfig(){return {type:`custom:${ELEMENT}`,format};}
      setConfig(config){super.setConfig({format,...config});}
    };
    if(!customElements.get(tag))customElements.define(tag,make());
    const oldTag=`niak-weather-modular-${format}-card`;
    if(!customElements.get(oldTag))customElements.define(oldTag,make());
    if(!window.customCards.some(x=>x.type===tag))window.customCards.push({type:tag,name:`Hestia Weather · ${name}`,description,preview:true});
  }
  // Former individual card types keep working on existing dashboards: they explain where the card went.
  for(const legacy of [...Object.keys(LEGACY),...RETIRED]){
    for(const tag of [`hestia-weather-addon-${legacy}-card`,`niak-weather-modular-${legacy}-card`]){
      if(!customElements.get(tag))customElements.define(tag,class extends NiakModularCard{
        static getStubConfig(){return {type:`custom:${ELEMENT}`,format:LEGACY[legacy]||'overview'};}
        setConfig(config){super.setConfig({format:legacy,...config});}
      });
    }
  }
  console.info(`%cHESTIA WEATHER ADD-ON%c ${VERSION}`,'color:#8798d2;font-weight:bold','color:inherit');
})();
