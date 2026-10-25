/**
 * Niak Weather Modular Card — 0.2.8-beta.1
 * Standalone dashboard card consuming the original Niak Weather websocket view.
 * Inspired by Niak Weather by Niakman13 (MIT); see LICENSE and README.md.
 * No Python integration replacement, cloud calls or external JavaScript dependencies.
 */
(() => {
  'use strict';
  const VERSION = '0.2.8-beta.1';
  const ELEMENT = 'niak-weather-modular-card';
  const FORMATS = [
    ['full','Carte complète Niak Weather','Carte officielle complète, personnalisable, avec Lune facultative'],
    ['overview','Synthèse / En ce moment','Conditions, min/max, bulletin, tendance et événements'],
    ['bulletin', 'Bulletin', 'Texte du bulletin Niak Weather'],
    ['events', 'Événements', 'Frise et prochains événements'],
    ['comfort', 'Ressenti', 'Température ressentie et facteurs'],
    ['extras','Indicateurs','Mesures complémentaires'],
    ['rain', 'Pluie', 'Précipitations présentes et à venir'],
    ['wind', 'Vent', 'Vent, rafales et direction'],
    ['pressure', 'Pression', 'Pression et tendance'],
    ['pollen', 'Pollens', 'Indices polliniques actuels'],
    ['hours', 'Prévisions 18 h', 'Températures, pluie et vent à 18 heures'],
    ['days', 'Prévisions 7 jours', 'Tendances des prochains jours'],
    ['pollen-forecast', 'Prévisions pollens', 'Pollens du lendemain'],
    ['air', 'Air extérieur', 'Indice ATMO, polluants et prévisions personnalisables'],
    ['moon','Lune','Phase lunaire, illumination, heures et prochaines phases'],
    ['sun-home','Soleil & Ensoleillement','Soleil local, horaires et diagramme Solar Mask'],
    ['radars','Radars de pluie','Deux radars avec leurs URL à renseigner'],
  ];
  const FORMAT_SET = new Set(FORMATS.map(x => x[0]));
  const LEGACY={summary:'overview',current:'overview',solar:'extras',uv:'extras',lux:'extras',humidity:'extras',dew:'extras'};
  const ACCEPTED=new Set([...FORMAT_SET,...Object.keys(LEGACY)]);
  function normalize(c){
    const previous=c.format||'wind',format=LEGACY[previous]||previous,defaults={};
    if(['solar','uv','lux','humidity','dew'].includes(previous))defaults.extras_blocks=[previous];
    if(previous==='summary'&&Array.isArray(c.blocks)){
      defaults.show_bulletin=c.blocks.includes('bulletin');
      defaults.show_events=c.blocks.includes('events');
    }
    return {...defaults,...c,format};
  }
  const SUMMARY = ['current', 'bulletin', 'events'];
  const EXTRA_TYPES=[['solar','Soleil'],['uv','Indice UV'],['lux','Luminosité'],['humidity','Humidité'],['dew','Point de rosée'],['other','Autres pastilles']];
  const EXTRA_DEFAULT=['solar','uv','lux','humidity','dew'];
  const EXTRA_FORMATS=new Set(['extras','solar','uv','lux','humidity','dew']);
  const BACKGROUND_MODES = [['glass', 'Verre dépoli (semi-transparent)'], ['theme', 'Thème Home Assistant'], ['transparent', 'Transparent (sans fond)']];
  const OPTIONS = ['show_title','show_source','show_date','show_bulletin','show_temp_range','show_temp_trend','show_events','show_chart','show_stats','show_details','show_border','show_animations'];
  const DEFAULTS = {sun_difference_entity:'sensor.difference_de_soleil',sun_duration_entity:'sensor.sunterrasse_sun_duration',radar_url_current:'',radar_url_forecast:'',background_mode:'glass',temperature_position:'right',overview_layout:'compact',show_title:true,show_source:true,show_date:true,show_bulletin:true,show_temp_range:true,show_temp_trend:true,show_events:false,show_chart:true,show_stats:true,show_details:true,show_border:true,show_animations:true};
  const icon = (name, cls = '') => `<ha-icon class="${cls}" icon="${esc(name || 'mdi:weather-partly-cloudy')}"></ha-icon>`;
  function esc(value) { return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function num(n, digits=1) { return Number.isFinite(Number(n)) && n !== null && n !== '' ? new Intl.NumberFormat('fr-FR',{maximumFractionDigits:digits}).format(Number(n)) : '—'; }
  const opt = (c, key) => c[key] !== false;
  const present = v => v !== undefined && v !== null;
  function label(s) { return `<span class="label">${esc(s)}</span>`; }
  function source(s,c) { return opt(c,'show_source') && s ? `<span class="source" title="${esc(s)}">${esc(s)}</span>` : ''; }
  function heading(title,iconName,s,c) { const name = opt(c,'show_title');const origin=source(s,c);return name||origin?`<header class="head">${name?icon(iconName,'head-icon')+'<strong>'+esc(title)+'</strong>':''}${origin}</header>`:''; }
  function stats(values,c) { return opt(c,'show_stats') && Array.isArray(values) && values.length ? `<div class="stats">${values.map(x=>`<div ${x.entity?`data-entity="${esc(x.entity)}"`:''}><span class="label">${esc(x.label)}</span><b>${esc(x.value)}</b></div>`).join('')}</div>`:''; }
  function chip(i) { return `<span class="chip" ${i.entity?`data-entity="${esc(i.entity)}"`:''}>${i.icon?icon(i.icon):''}${i.value?`<b>${esc(i.value)}</b>`:''}${esc(i.label)}</span>`; }
  function extraType(item){
    const ico=String(item?.icon||'').toLowerCase(),text=String(item?.label||'').toLowerCase();
    if(ico.includes('solar-power')||text==='soleil')return 'solar';
    if(ico.includes('sun-wireless')||text==='uv'||text.startsWith('uv '))return 'uv';
    if(ico.includes('brightness-5')||text==='lux')return 'lux';
    if(ico.includes('water-percent')||text.includes('humidité'))return 'humidity';
    if(ico.includes('thermometer-water')||text.startsWith('rosée'))return 'dew';
    return 'other';
  }
  function extraChip(item) {
    const valid=['rain','wind','heat','cold','calm','pressure','level1','level2','level3'];
    const tone=valid.includes(item.theme)?item.theme:'calm';
    return `<span class="extra-chip" style="--c:var(--nw-${tone})" ${item.entity?`data-entity="${esc(item.entity)}" role="button" tabindex="0"`:''}>${item.icon?icon(item.icon):''}${present(item.value)?`<b>${esc(item.value)}</b>`:''}<span>${esc(item.label)}</span></span>`;
  }
  function extras(v,c) {
    const selected=(Array.isArray(v.extras)?v.extras:[]).filter(p=>(c.format==='extras'?(Array.isArray(c.extras_blocks)?c.extras_blocks:EXTRA_DEFAULT):[c.format]).includes(extraType(p)));
    if(!selected.length)return empty('Aucun indicateur sélectionné disponible.');
    const title=c.format==='extras'?'Indicateurs':FORMATS.find(([f])=>f===c.format)?.[1]||'Indicateurs';
    return wrap(`${opt(c,'show_title')?heading(title,'mdi:gauge','',c):''}<div class="extra-chips">${selected.map(extraChip).join('')}</div>`,c,'extras-card');
  }
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
      sky=opt(c,'show_animations')&&customElements.get('niak-weather-sky')?'<div class="sky-layer ov-sky"><niak-weather-sky></niak-weather-sky></div>':'',
      events=opt(c,'show_events')?'<div class="ov-events">'+eventList(v,{...c,show_title:true})+'</div>':'';
    const copy='<div class="ov-copy">'+(alerts?'<div class="chips">'+alerts+'</div>':'')+bulletin+'</div>';
    const isLeft=c.temperature_position==='left',classic=c.overview_layout==='classic';
    return '<section class="overview">'+sky+title+'<div class="ov-grid '+(classic?'layout-classic':'layout-compact')+
      ' '+(isLeft?'temp-left':'temp-right')+'">'+
      (classic?current+copy:isLeft?current+copy:copy+current)+'</div>'+events+'</section>';
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
  function chart(series, opts={}) {
    const validSeries = series.map(s=>({...s, points:(s.points || []).filter(p=>Array.isArray(p) && Number.isFinite(p[0]) && (p[1]===null || Number.isFinite(p[1])))}));
    const usable = validSeries.flatMap(s=>s.points.filter(p=>p[1]!==null));
    if(usable.length<2) return empty(opts.empty || 'Historique insuffisant pour dessiner la courbe.');
    const xmax=Math.max(...usable.map(p=>p[0]));
    const xmin=xmax-21600;
    const values=usable.map(p=>p[1]);
    let lo=present(opts.low)?opts.low:Math.min(0,...values), hi=present(opts.high)?opts.high:Math.max(...values);
    if(hi<=lo) hi=lo+1;
    const X=x=>Math.max(0,Math.min(100,(x-xmin)/21600*100));
    const Y=y=>Math.max(4,Math.min(46,46-(y-lo)/(hi-lo)*39));
    const paths=validSeries.map(s=>{
      let sequences=[], current=[];
      for(const [x,y] of s.points){if(y===null){if(current.length>=2) sequences.push(current);current=[];}else current.push([x,y]);}
      if(current.length>=2) sequences.push(current);
      return sequences.map(seq=>`<path d="${seq.map(([x,y],i)=>(i?'L':'M')+X(x).toFixed(2)+','+Y(y).toFixed(2)).join(' ')}" fill="none" stroke="${s.color}" stroke-width="2.4" ${s.dash?'stroke-dasharray="3 3"':''} vector-effect="non-scaling-stroke" stroke-linejoin="round" stroke-linecap="round"/>`).join('');
    });
    const main=validSeries[0].points.filter(p=>p[1]!==null);
    const min=main.length?main.reduce((a,b)=>b[1]<a[1]?b:a):null,max=main.length?main.reduce((a,b)=>b[1]>a[1]?b:a):null;
    const pill=(p)=>`<span class="plot-pill" style="left:${X(p[0]).toFixed(2)}%;top:${(Y(p[1])/50*100).toFixed(2)}%">${num(p[1],opts.digits??0)}</span>`;
    return `<div class="graph"><div class="graph-title">6 dernières heures · ${esc(opts.unit||'')}</div><div class="plot"><svg viewBox="0 0 100 50" preserveAspectRatio="none" role="img" aria-label="Historique des 6 dernières heures">${paths.join('')}</svg>${max?pill(max):''}${min && max && Math.abs(min[1]-max[1])>0.15?pill(min):''}</div><div class="axis"><span>−6 H</span><span>−3 H</span><span>MAINTENANT</span></div><div class="legend">${validSeries.map(s=>`<span><i style="--line:${s.color}" class="${s.dash?'dash':''}"></i>${esc(s.label)}</span>`).join('')}</div></div>`;
  }
  function compass(bearing){if(!present(bearing))return '';const bearingSafe=((Number(bearing)+180)%360+360)%360;return `<svg class="compass" viewBox="0 0 72 72" role="img" aria-label="Direction ${num(bearing,0)} degrés"><circle cx="36" cy="36" r="30" fill="var(--nw-soft)" stroke="var(--nw-line)"/><text x="36" y="16" font-size="10" font-weight="700" text-anchor="middle" fill="currentColor">N</text><path d="M36 16 44 46 36 40 28 46Z" fill="var(--nw-wind)" transform="rotate(${bearingSafe} 36 36)"/></svg>`;}
  function wind(v,c){const w=v.wind;if(!w)return empty('Aucune donnée de vent fournie par Niak Weather.');return wrap(`${heading('Vent','mdi:weather-windy',w.source,c)}<div class="metric-row"><div class="metric" ${w.entity?`data-entity="${esc(w.entity)}"`:''}><div class="big">${num(w.value,0)}<span>km/h</span></div><div class="subtitle">${esc([w.label,w.description].filter(Boolean).join(' · '))}</div></div>${compass(w.bearing)}</div>${w.status?`<div class="chips">${chip({label:w.status,icon:'mdi:weather-windy'})}</div>`:''}${opt(c,'show_chart')?chart([{points:w.mean,color:'var(--nw-wind)',label:w.meanLabel||'Vent moyen'},{points:w.gust,color:'var(--nw-wind-light)',dash:true,label:'Rafales'}],{unit:'km/h',high:w.top,low:0,empty:w.empty}):''}${stats(w.stats,c)}`,c,'wind');}
  function pressure(v,c){const p=v.pressure;if(!p)return empty('Aucune donnée de pression fournie par Niak Weather.');return wrap(`${heading('Pression','mdi:gauge',p.source,c)}<div class="metric-row"><div class="metric" ${p.entity?`data-entity="${esc(p.entity)}"`:''}><div class="big">${num(p.value,0)}<span>hPa</span></div><div class="subtitle">${esc(p.description)}</div></div>${p.trend?`<div class="chips">${chip(p.trend)}</div>`:''}</div>${opt(c,'show_chart')?chart([{points:p.series,color:'var(--nw-pressure)',label:'Pression'}],{unit:'hPa',high:p.top,low:p.low,empty:p.empty}):''}${stats(p.stats,c)}`,c,'pressure');}
  function comfort(v,c){
    const p=v.comfort;
    if(!p)return empty('Le ressenti n’est pas disponible.');
    const fmt=val=>num(Math.abs(val));
    const reference=v.station?'au thermomètre':'à la température du bulletin';
    const gap=present(p.gap)&&Math.abs(p.gap)>=0.1?`${p.gap>0?'+':'−'}${fmt(p.gap)} °C par rapport ${reference}`:'';
    const showTitle=opt(c,'show_title');
    const help=showTitle&&opt(c,'show_details')
      ?`<details class="comfort-help"><summary aria-label="Explication du ressenti" title="Qu’est-ce que le ressenti ?">i</summary>
        <div class="comfort-explain"><strong>Ressenti</strong><p>C’est la température que le corps perçoit. L’humidité et le soleil la font monter, le vent la fait baisser. C’est une estimation, pas un indice officiel.</p>
        ${p.example?`<p><strong>En ce moment :</strong> ${esc(p.example)}</p>`:''}</div></details>`:'';
    const head=showTitle||opt(c,'show_source')&&p.source
      ?`<header class="head comfort-head">${showTitle?`${icon('mdi:thermometer','head-icon')}<strong>Ressenti</strong>${help}`:''}${source(p.source,c)}</header>`:'';
    const text=[p.word?`<b>${esc(p.word)}</b>`:'',p.humidity?esc(p.humidity):'',gap?esc(gap):''].filter(Boolean).join(' · ');
    const factors=Array.isArray(p.factors)?p.factors:[];
    const position=t=>Math.min(100,Math.max(0,((t+5)/50)*100));
    const gauge=opt(c,'show_chart')&&present(p.feels)
      ?`<div class="comfort-rail-line"><span>−5°</span><div class="comfort-rail" role="img" aria-label="Échelle du ressenti de moins 5 à 45 degrés. Ressenti : ${num(p.feels)} degrés.">
        ${present(p.temperature)?`<i class="comfort-thermo" style="left:${position(p.temperature)}%" title="${v.station?'Thermomètre':'Bulletin'} : ${num(p.temperature)} °C"></i>`:''}
        <i class="comfort-feel" style="left:${position(p.feels)}%" title="Ressenti : ${num(p.feels)} °C"></i>
      </div><span>45°</span></div>`:'';
    return wrap(`${head}<div class="comfort-metric-row"><div class="comfort-metric" ${p.entity?`data-entity="${esc(p.entity)}"`:''}>
      <div class="big">${num(p.feels)}<span>°C</span></div>${text?`<div class="comfort-subtitle">${text}</div>`:''}</div>
      ${factors.length?`<div class="comfort-factors">${factors.map(chip).join('')}</div>`:''}
      </div>${gauge}`,c,'comfort');
  }
  function rain(v,c){const r=v.rain;if(!r)return empty('Aucune donnée de pluie disponible.');const forecast=v.hours||[],next=forecast.find(h=>h.precipitation>=.3),hour=forecast.slice(0,1).reduce((s,h)=>s+Number(h.precipitation||0),0),six=forecast.slice(0,6).reduce((s,h)=>s+Number(h.precipitation||0),0);return wrap(`${heading('Pluie','mdi:weather-rainy',r.source,c)}${forecast.length?`<div class="rain-next">${label('À venir')}<div class="chips">${chip({icon:'mdi:clock-outline',value:num(hour)+' mm',label:'dans l’heure'})}${chip({icon:'mdi:timer-sand',value:num(six)+' mm',label:'sur 6 h'})}${next?chip({icon:'mdi:weather-rainy',label:'prochaine pluie vers '+next.hour+' h'}):''}</div></div>`:''}<div class="metric-row"><div class="metric" ${r.entity?`data-entity="${esc(r.entity)}"`:''}><div class="big">${r.text?esc(r.text):num(r.value)}${r.text?'':`<span>${esc(r.unit)}</span>`}</div><div class="subtitle">${esc(r.label)}</div></div></div>${r.status?`<div class="chips">${chip({label:r.status,icon:'mdi:weather-rainy'})}</div>`:''}${opt(c,'show_chart')&&Array.isArray(r.days)&&r.days.length?`<div class="rain-days">${label('7 derniers jours')}${r.days.map(d=>`<div><span>${esc(d.label||d.date)}</span><i style="height:${Math.max(3,Math.min(100,100*Number(d.value||0)/Math.max(1,...r.days.map(x=>Number(x.value||0)))))}%"></i><b>${present(d.value)?num(d.value)+' mm':'—'}</b></div>`).join('')}</div>`:''}${r.daysNote?`<p class="note">${esc(r.daysNote)}</p>`:''}${stats(r.stats,c)}`,c,'rain');}
  function current(v,c){const n=v.now||{};const alert=(v.alerts||[]).filter(x=>x.official);const season=v.season?.news;const sky=opt(c,'show_animations')&&customElements.get('niak-weather-sky')?'<div class="sky-layer"><niak-weather-sky></niak-weather-sky></div>':'';return wrap(`${sky}<div class="current-top">${opt(c,'show_title')?`<strong>En ce moment</strong>`:''}${opt(c,'show_date')&&v.dateLabel?`<span class="date">${esc(v.dateLabel)}</span>`:''}</div><div class="current-grid"><div class="condition">${icon(n.icon||'mdi:weather-partly-cloudy','weather-icon')}<div><b>${esc(n.label||'Météo')}</b>${source(n.source,c)}</div></div><div class="temp" ${n.temperatureEntity?`data-entity="${esc(n.temperatureEntity)}"`:''}>${num(n.temperature,0)}<span>°C</span></div></div>${present(n.trend)?`<div class="subtitle">${n.trend>0?'↗':'↘'} ${num(Math.abs(n.trend))} °C/h</div>`:''}${season?`<div class="chips">${chip({label:season,icon:v.season?.info?.icon||'mdi:leaf'})}</div>`:''}${alert.length?`<div class="chips">${alert.map(a=>chip({label:[a.label,a.text].filter(Boolean).join(' · '),icon:a.icon,entity:a.entity})).join('')}</div>`:''}`,c,'current');}
  function bulletin(v,c){if(!v.bulletin?.summary)return empty('Bulletin Niak Weather indisponible.');return wrap(`${heading('Bulletin du jour','mdi:text-box-outline',v.provider,c)}<p class="bulletin">${esc(v.bulletin.summary)}</p>${opt(c,'show_details')&&v.bulletin.periods?.length?`<div class="periods">${v.bulletin.periods.map(p=>`<div>${icon(p.icon)}<span><b>${esc(p.label)}</b><small>${esc(p.text||p.phrase||'')}</small></span></div>`).join('')}</div>`:''}`,c,'bulletin');}
  function eventList(v,c){
    const list=(v.timeline?.length?v.timeline:v.points||[]).slice(0,12), alerts=v.alerts||[];
    if(!list.length&&!alerts.length&&!(v.hours||[]).length)return empty('Aucun événement météo à signaler.');
    const when=x=>x.clock||(x.at?new Date(x.at*1000).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}):'Maintenant');
    const fallback=`<div class="events">${alerts.map(x=>`<div class="event alert${x.level||1}">${icon(x.icon)}<div><span class="label">${esc(x.label||'Vigilance')}</span><b>${esc(x.text)}</b></div></div>`).join('')}${list.map(x=>`<div class="event">${icon(x.icon)}<div><span class="label">${esc(when(x))}${x.label?` · ${esc(x.label)}`:''}</span><b>${esc(x.text)}</b></div></div>`).join('')}</div>`;
    const native=customElements.get('niak-frise')?'<niak-frise></niak-frise>':fallback;
    return wrap(`${opt(c,'show_title')?label('Événements'):''}${native}`,c,'events');
  }
  function summary(v,c){const blocks=Array.isArray(c.blocks)?c.blocks:SUMMARY;const chosen=blocks.filter(b=>SUMMARY.includes(b));if(!chosen.length)return empty('Choisissez au moins un bloc pour la synthèse.');return `<section class="summary">${opt(c,'show_title')?`<header class="summary-head"><strong>Synthèse</strong>${opt(c,'show_date')?`<span>${esc([v.location,v.dateLabel].filter(Boolean).join(' · '))}</span>`:''}</header>`:''}<div class="summary-parts">${chosen.map(b=>b==='current'?current(v,{...c,show_title:false}):b==='bulletin'?bulletin(v,c):eventList(v,c)).join('')}</div></section>`;}

  function atmoValue(r,max){
    const n=r?.value;
    if(n===undefined||n===null||r.stale||!Number.isFinite(Number(n)))return null;
    const value=Number(n);return value>=(max===6?1:0)&&value<=max?value:null;
  }
  function atmoGauge(r,max){
    const v=atmoValue(r,max),colors=max===4?['calm','level1','level2','level3']:['calm','calm','level1','level2','level3','pressure'];
    const arcs=colors.map((color,i)=>{
      const a=(i*360/max-88)*Math.PI/180,b=((i+1)*360/max-92)*Math.PI/180;
      const x=38+32*Math.cos(a),y=38+32*Math.sin(a),xx=38+32*Math.cos(b),yy=38+32*Math.sin(b);
      return '<path d="M'+x.toFixed(2)+' '+y.toFixed(2)+' A32 32 0 0 1 '+xx.toFixed(2)+' '+yy.toFixed(2)+'" '+
        'stroke="'+(v!==null&&i<v?'var(--nw-'+color+')':'var(--nw-air-empty)')+'" fill="none" stroke-width="9" stroke-linecap="round"/>';
    }).join('');
    return '<svg class="atmo-gauge" viewBox="0 0 76 76" role="img" aria-label="Indice '+(v===null?'indisponible':v+' sur '+max)+'">'+
      arcs+'<text x="38" y="44" text-anchor="middle" font-size="17" font-weight="750" fill="currentColor">'+(v??'–')+'</text></svg>';
  }
  function atmoSource(p,c){
    if(!opt(c,'show_source'))return '';
    const name=c.air_source_mode==='custom'?String(c.air_source_custom||'').trim():p.source||'Atmo France';
    return name?'<span class="atmo-source">'+esc(name)+'</span>':'';
  }
  function atmoDetail(item){
    const r=item.reading||{},con=item.concentration;
    const metric=q=>q?.value===undefined||q.value===null||!Number.isFinite(Number(q.value))?'Indisponible':
      num(q.value,2)+(q.unit?' '+esc(q.unit):'');
    return (r.unit!==undefined?metric(r):esc(r.label||'—')+(con?' · '+metric(con):''))+(r.stale?' · données anciennes':'');
  }
  function atmoPanel(p,c){
    const max=p.scale===4?4:6,r=p.primary||{},value=atmoValue(r,max),name=p.tomorrow?'Demain':'Aujourd’hui';
    const info=r.stale?'Données anciennes':r.value===7&&max===6?'Événement signalé':r.label||'Indice indisponible';
    const caption=value!==null?'Niveau '+value+' sur '+max:r.value===7&&max===6?'Code 7 · hors échelle':'Niveau indisponible';
    const src=atmoSource(p,c);
    const meta='<div class="atmo-panel-heading"><strong>'+name+'</strong>'+(c.air_source_position==='footer'?'':src)+'</div>';
    const gauge='<div class="atmo-index '+(c.air_gauge_position==='right'?'gauge-right':'gauge-left')+'" '+(r.entityId?'data-entity="'+esc(r.entityId)+'"':'')+'>'+
      (opt(c,'show_chart')?atmoGauge(r,max):'')+
      '<div class="atmo-index-info">'+label(p.tomorrow?'Indice de demain':'Indice du jour')+'<strong>'+esc(info)+'</strong>'+
      (opt(c,'show_stats')?'<small>'+esc(caption)+'</small>':'')+'</div></div>';
    const worse=p.worse?.reading&&opt(c,'air_show_worse')?
      '<div class="chips">'+chip({icon:'mdi:alert-circle-outline',value:p.worse.label,
      label:p.worse.reading.label,entity:p.worse.reading.entityId})+'</div>':'';
    const rows=(p.details||[]).map(x=>'<li '+(x.reading?.entityId?'data-entity="'+esc(x.reading.entityId)+'"':'')+
      '><span>'+esc(x.label)+'</span><b>'+atmoDetail(x)+'</b></li>').join('');
    const updated=opt(c,'air_show_updated')&&p.updated?'<p class="atmo-updated">'+
      esc((p.source?'Mise à jour '+p.source:'Publication Atmo')+' : '+p.updated+(p.stale?' · données anciennes à vérifier':''))+'</p>':'';
    const details=opt(c,'show_details')&&(rows||updated)?'<details class="atmo-details" '+(c.air_details_open===true?'open':'')+'>'+
      '<summary>'+icon('mdi:chevron-right')+'Détail des polluants</summary>'+(rows?'<ul>'+rows+'</ul>':'')+
      updated+'</details>':updated;
    return '<section class="atmo-panel">'+meta+
      (opt(c,'air_show_zone')&&p.zone?'<p class="atmo-zone">'+esc(p.zone)+'</p>':'')+gauge+worse+details+
      (c.air_source_position==='footer'&&src?'<div class="atmo-foot">'+src+'</div>':'')+'</section>';
  }
  function outdoorAir(v,c){
    const today=(v.air?.today||[]).filter(x=>x.kind==='air'),tomorrow=(v.air?.tomorrow||[]).filter(x=>x.kind==='air');
    const period=['today','tomorrow','both'].includes(c.air_period)?c.air_period:'today';
    const cards=period==='today'?today:period==='tomorrow'?tomorrow:c.air_order==='tomorrow-first'?[...tomorrow,...today]:[...today,...tomorrow];
    const header=opt(c,'show_title')||opt(c,'show_date')?'<header class="atmo-head">'+
      (opt(c,'show_title')?icon('mdi:air-filter','head-icon')+'<strong>Air extérieur</strong>':'')+
      (opt(c,'show_date')&&v.dateLabel?'<span class="atmo-date">'+esc([v.location,v.dateLabel].filter(Boolean).join(' · '))+'</span>':'')+'</header>':'';
    const layout=['auto','grid','stack'].includes(c.air_layout)?c.air_layout:'auto';
    const blocks=cards.length?cards.map(x=>atmoPanel(x,c)).join(''):
      '<div class="empty">Aucune donnée de qualité de l’air disponible'+(period==='tomorrow'?' pour demain':'')+'.</div>';
    const absent=period==='both'&&today.length&&!tomorrow.length?'<p class="atmo-updated">Prévision de demain indisponible.</p>':'';
    return wrap(header+'<div class="atmo-panels atmo-layout-'+layout+'">'+blocks+'</div>'+absent,c,'air-complete');
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
      label('Évolution du jour')+'<b>'+esc(diff)+'</b><small>Durée gagnée ou perdue</small></div>'+
      '<div class="sun-metric" data-entity="'+esc(c.sun_duration_entity||'sensor.sunterrasse_sun_duration')+'">'+
      label('Ensoleillement de la maison')+'<b>'+esc(duration)+'</b><small>Durée de la zone mesurée</small></div></div>';
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
      '<header>'+icon(actual?'mdi:weather-rainy':'mdi:cloud-clock')+'<strong>'+name+'</strong></header>'+
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
  function pollenCards(v,c,tomorrow=false,kind='pollen'){
    const list=(tomorrow?v.air?.tomorrow:v.air?.today)||[];const panels=list.filter(x=>x.kind===kind);
    if(!panels.length)return empty(tomorrow?'Aucune prévision de pollens fournie pour demain.':kind==='air'?'Aucune donnée de qualité de l’air disponible.':'Aucune donnée de pollens disponible.');
    return `<div class="pollen-stack">${panels.map(p=>{
      const r=p.primary||{},scale=Number(p.scale)||6,valid=present(r.value)&&!r.stale&&(Number(r.value)<=scale)&&(scale!==6||Number(r.value)>=1),value=valid?Number(r.value):null,level=Math.max(0,Math.min(scale,value??0)),stroke=level/scale*215.2;
      const disc=`<svg class="disc" viewBox="0 0 80 80" role="img" aria-label="Indice ${value??'indisponible'} sur ${scale}"><circle cx="40" cy="40" r="33" stroke="var(--nw-line)" stroke-width="8" fill="none"/><circle cx="40" cy="40" r="33" stroke="var(--nw-pollen)" stroke-width="8" stroke-dasharray="${stroke} 215.2" fill="none" transform="rotate(-90 40 40)" stroke-linecap="round"/><text x="40" y="47" fill="currentColor" text-anchor="middle" font-weight="750" font-size="19">${value??'–'}</text></svg>`;
      const details=opt(c,'show_details')&&(p.details?.length||p.updated)?`<details class="details"><summary>Détail des ${kind==='pollen'?'pollens':'polluants'}</summary>${(p.details||[]).map(d=>`<div class="detail-line" ${d.reading?.entityId?`data-entity="${esc(d.reading.entityId)}"`:''}><span>${esc(d.label)}</span><b>${esc(d.reading?.label||'—')}${present(d.concentration?.value)?' · '+num(d.concentration.value)+' '+esc(d.concentration.unit||''):''}</b></div>`).join('')}${p.updated?`<p class="note">Mise à jour : ${esc(p.updated)}</p>`:''}</details>`:'';
      return wrap(`${heading(kind==='air'?'Air extérieur':tomorrow?'Pollens · demain':'Pollens',kind==='air'?'mdi:air-filter':'mdi:flower-pollen-outline',p.source||'',c)}<p class="note">${esc([tomorrow?'Demain':'Aujourd’hui',p.zone].filter(Boolean).join(' · '))}</p><div class="pollen-main" ${r.entityId?`data-entity="${esc(r.entityId)}"`:''}>${disc}<div><span class="label">${tomorrow?'Indice de demain':'Indice du jour'}</span><b>${esc(r.stale?'Données anciennes':r.label||'Indice indisponible')}</b><span class="subtitle">${valid?`Niveau ${value} sur ${scale}`:r.unavailableReason==='no_index'?'Indice pollen non fourni':'Niveau indisponible'}</span></div></div>${p.worse?`<div class="chips">${chip({label:p.worse.label+' · '+p.worse.reading.label,icon:'mdi:alert-circle-outline',entity:p.worse.reading.entityId})}</div>`:''}${details}`,c,'pollen');
    }).join('')}</div>`;
  }
  function hours(v,c){const raw=v.hours||[],h=raw.slice(0,18);if(h.length<3)return empty('Prévisions horaires indisponibles.');const temperatures=h.map((x,i)=>({...x,i})).filter(x=>present(x.temperature));if(temperatures.length<2)return empty('Températures horaires indisponibles.');let lo=Math.min(...temperatures.map(x=>x.temperature))-1.5,hi=Math.max(...temperatures.map(x=>x.temperature))+1.5;const X=i=>h.length===1?0:(i/(h.length-1))*100, Y=t=>9+(hi-t)/(hi-lo)*75;const d=temperatures.map((p,i)=>(i?'L':'M')+X(p.i).toFixed(2)+' '+Y(p.temperature).toFixed(2)).join(' ');const maxRain=Math.max(1,...h.map(x=>Number(x.precipitation||0)));let rain=h.map((x,i)=>Number(x.precipitation||0)>=.1?`<rect x="${(X(i)-1).toFixed(2)}" y="${(99-30*x.precipitation/maxRain).toFixed(2)}" width="2.1" height="${(30*x.precipitation/maxRain).toFixed(2)}" fill="var(--nw-rain)" opacity=".85"/>`:'').join('');const marks=h.filter((_,i)=>i%3===0).map((x,j)=>`<span><b>${esc(x.hour)} h</b>${icon(x.icon)}<small>${present(x.temperature)?num(x.temperature,0)+'°':'—'}</small>${present(x.wind)?`<small>${num(x.wind,0)} km/h</small>`:''}</span>`).join('');return wrap(`${heading('18 prochaines heures','mdi:chart-bell-curve-cumulative',v.provider,c)}${opt(c,'show_chart')?`<div class="hours-plot"><svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="Prévision température et précipitations">${rain}<path d="${d}" stroke="var(--nw-wind)" fill="none" stroke-width="2.3" vector-effect="non-scaling-stroke" stroke-linecap="round" stroke-linejoin="round"/></svg></div>`:''}<div class="hour-marks">${marks}</div><div class="legend"><span><i style="--line:var(--nw-wind)"></i>Température</span><span><i style="--line:var(--nw-rain)"></i>Pluie</span></div>`,c,'hours');}
  function days(v,c){const days=(v.days||[]).slice(0,7);if(!days.length)return empty('Prévisions journalières indisponibles.');const temps=days.flatMap(x=>[x.low,x.high]).filter(present);const lo=temps.length?Math.min(...temps):0,hi=temps.length?Math.max(...temps):1,span=Math.max(1,hi-lo);return wrap(`${heading('7 prochains jours','mdi:calendar-week',v.provider,c)}<div class="days-table"><div class="day-head"><span>Jour</span><span>Temps</span><span>Min / max</span><span>Pluie</span><span>Vent</span></div>${days.map(x=>`<div class="day-row"><b>${esc(x.label)}</b>${icon(x.icon)}<div class="day-temp"><div><span>${present(x.low)?num(x.low,0)+'°':'—'}</span><span>${present(x.high)?num(x.high,0)+'°':'—'}</span></div>${present(x.low)&&present(x.high)?`<i style="--left:${(x.low-lo)/span*100}%;--width:${Math.max(3,(x.high-x.low)/span*100)}%"></i>`:''}</div><span>${num(x.rain)} mm</span><span>${present(x.wind)?num(x.wind,0)+' km/h':'—'}</span></div>`).join('')}</div>`,c,'days');}
  function display(v,c){switch(c.format){case 'overview':case 'summary':case 'current':return overview(v,c);case 'bulletin':return bulletin(v,c);case 'events':return eventList(v,c);case 'comfort':return comfort(v,c);case 'extras':case 'solar':case 'uv':case 'lux':case 'humidity':case 'dew':return extras(v,c);case 'rain':return rain(v,c);case 'wind':return wind(v,c);case 'pressure':return pressure(v,c);case 'pollen':return pollenCards(v,c,false);case 'hours':return hours(v,c);case 'days':return days(v,c);case 'pollen-forecast':return pollenCards(v,c,true);case 'air':return outdoorAir(v,c);default:return empty('Format inconnu.');}}
  const CSS = `
    :host{display:block;--nw-bg:var(--ha-card-background,var(--card-background-color,var(--primary-background-color,#fff)));--nw-glass-base:var(--primary-background-color,var(--nw-bg));--nw-fg:var(--primary-text-color,#26334b);--nw-fg2:var(--secondary-text-color,#5f6880);--nw-line:var(--divider-color,#dde1e9);--nw-soft:color-mix(in srgb,var(--nw-wind) 12%,transparent);--nw-wind:var(--niak-wind-color,#8798d2);--nw-wind-light:color-mix(in srgb,var(--nw-wind) 44%,transparent);--nw-pressure:var(--niak-pressure-color,#aaa0da);--nw-pollen:var(--niak-calm-color,#69b8a2);--nw-rain:var(--niak-rain-color,#4fb3bf);
      --nw-accent:var(--primary-color,#03a9f4);--nw-radius:14px;--nw-radius-pill:999px;
      --nw-fs-label:10px;--nw-fs-small:12px;--nw-fs-text:13px;--nw-label-spacing:.6px;--nw-ink:34%;
      --nw-glass-clear:color-mix(in srgb,var(--nw-bg) 45%,transparent);
      --nw-glass-strong:color-mix(in srgb,var(--nw-bg) 84%,transparent);
      --nw-frost:blur(14px) saturate(1.6);--nw-ease:cubic-bezier(.2,.8,.2,1);
      --nw-calm:var(--niak-calm-color,oklch(.83 .075 150));--nw-heat:var(--niak-heat-color,oklch(.83 .085 42));
      --nw-cold:var(--niak-cold-color,oklch(.85 .05 220));--nw-level1:var(--niak-level1-color,oklch(.88 .1 96));
      --nw-level2:var(--niak-level2-color,oklch(.81 .105 64));--nw-level3:var(--niak-level3-color,oklch(.74 .115 18));
      --nw-motion:running;color:var(--nw-fg);font-family:var(--paper-font-body1_-_font-family,inherit)}
    ha-card{display:block;padding:0;--nw-card-surface:color-mix(in srgb,var(--nw-glass-base) 72%,transparent);background:var(--nw-card-surface);backdrop-filter:blur(12px) saturate(1.15);-webkit-backdrop-filter:blur(12px) saturate(1.15);color:var(--nw-fg);overflow:hidden;container-type:inline-size;border-radius:var(--ha-card-border-radius,14px);box-sizing:border-box}
    ha-card.bg-theme{--nw-card-surface:var(--nw-bg);backdrop-filter:none;-webkit-backdrop-filter:none}
    ha-card.bg-transparent{--nw-card-surface:transparent;backdrop-filter:none;-webkit-backdrop-filter:none}
    ha-card.bg-transparent .current{background:none}
    @media(prefers-reduced-transparency:reduce){ha-card.bg-glass{--nw-card-surface:var(--nw-bg);backdrop-filter:none;-webkit-backdrop-filter:none}}
    ha-card.no-border{border:0;box-shadow:none;border-radius:0}
    .inner{padding:20px 22px;display:flex;flex-direction:column;gap:15px;box-sizing:border-box;min-width:0}
    .head{display:flex;gap:12px;align-items:center;min-width:0}.head strong{font-size:19px;line-height:1.25;font-weight:750;letter-spacing:-.2px;flex:1}.head-icon{--mdc-icon-size:24px;box-sizing:content-box;padding:10px;background:var(--nw-soft);color:var(--nw-wind);border-radius:13px;flex:none}.source{font-size:12px;padding:6px 10px;border:1px solid var(--nw-line);border-radius:999px;white-space:nowrap;max-width:38%;overflow:hidden;text-overflow:ellipsis;color:var(--nw-fg)}
    .metric-row{display:flex;align-items:center;justify-content:space-between;gap:20px;min-width:0}.metric{flex:1;min-width:0}.big{font-size:42px;font-weight:760;line-height:1.2;white-space:normal;font-variant-numeric:tabular-nums}.big span{font-size:19px;font-weight:400;margin-left:7px;color:var(--nw-fg2)}.subtitle{font-size:14px;line-height:1.45;color:var(--nw-fg2)}.compass{width:88px;height:88px;flex:none;color:var(--nw-fg2)}
    .label{display:block;font-size:11px;letter-spacing:1px;text-transform:uppercase;font-weight:750;color:var(--nw-fg2);line-height:1.35}.graph{display:flex;flex-direction:column;gap:12px;margin-top:10px;min-width:0}.graph-title{color:var(--nw-fg2);font-size:13px}.plot{position:relative;height:130px}.plot svg{width:100%;height:100%;overflow:visible}.plot-pill{position:absolute;transform:translate(-50%,-50%);background:var(--nw-bg);border:1px solid var(--nw-line);box-shadow:0 2px 7px #0001;border-radius:22px;padding:3px 7px;font-size:13px;font-weight:700;pointer-events:none}.axis{display:flex;justify-content:space-between;gap:10px;color:var(--nw-fg2);font-size:11px;font-weight:750;letter-spacing:1px}.legend{display:flex;flex-wrap:wrap;gap:16px;justify-content:center;color:var(--nw-fg2);font-size:12px}.legend span{display:inline-flex;align-items:center;gap:7px}.legend i{display:inline-block;width:21px;height:4px;border-radius:4px;background:var(--line)}.legend i.dash{background:repeating-linear-gradient(90deg,var(--line) 0 4px,transparent 4px 8px)}
    .stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));border-top:1px solid var(--nw-line);padding-top:15px;gap:10px}.stats>div{display:flex;flex-direction:column;gap:6px;min-width:0}.stats b{font-size:16px;line-height:1.25;overflow-wrap:anywhere}.chips{display:flex;gap:8px;flex-wrap:wrap}.chip{display:inline-flex;align-items:center;gap:5px;background:color-mix(in srgb,var(--nw-wind) 9%,transparent);border-radius:10px;padding:7px 10px;color:var(--nw-fg);font-size:12px;line-height:1.4}.chip ha-icon{--mdc-icon-size:16px;color:var(--nw-wind)}.chip b{font-weight:750}
    /* Niak-inspired standalone 'Ressenti': metric + factors + -5..45°C rail. */
    .comfort-head{gap:10px}
    .comfort-head strong{flex:0 1 auto}
    .comfort-head .source{margin-left:auto}
    .comfort-help{position:relative;flex:none}
    .comfort-help summary{list-style:none;cursor:pointer;display:grid;place-items:center;border:1px solid var(--nw-line);border-radius:50%;width:24px;height:24px;font-size:15px;font-weight:700;font-style:italic;color:var(--nw-fg2);background:color-mix(in srgb,var(--nw-bg) 60%,transparent)}
    .comfort-help summary::-webkit-details-marker{display:none}
    .comfort-help summary:focus-visible{outline:2px solid var(--nw-accent);outline-offset:2px}
    .comfort-explain{position:absolute;z-index:5;top:calc(100% + 8px);left:-42px;width:min(300px,70vw);max-width:75vw;padding:12px 14px;border:1px solid var(--nw-line);border-radius:12px;background:var(--nw-bg);color:var(--nw-fg);box-shadow:0 8px 24px #0002;font-size:12px;line-height:1.5}
    .comfort-explain p{margin:7px 0 0}
    .comfort-metric-row{display:flex;justify-content:space-between;align-items:center;gap:16px;min-width:0;flex-wrap:wrap}
    .comfort-metric{min-width:0;flex:1 1 160px;display:flex;flex-direction:column;gap:7px}
    .comfort-subtitle{font-size:13px;line-height:1.5;color:var(--nw-fg2)}
    .comfort-subtitle b{font-weight:700;color:var(--nw-fg)}
    .comfort-factors{display:flex;gap:8px;align-items:center;justify-content:flex-end;flex-wrap:wrap;max-width:100%}
    .comfort-factors .chip{border-radius:999px;white-space:normal}
    .comfort-rail-line{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:10px;font-size:12px;color:var(--nw-fg2);padding:6px 0 2px}
    .comfort-rail{position:relative;height:9px;border-radius:999px;background:linear-gradient(90deg,var(--nw-cold),var(--nw-rain) 28%,var(--nw-calm) 45%,var(--nw-level1) 62%,var(--nw-heat) 78%,var(--nw-level3))}
    .comfort-rail .comfort-thermo{position:absolute;top:50%;width:3px;height:18px;margin:-9px 0 0 -1.5px;border-radius:2px;background:var(--nw-bg);box-shadow:0 0 0 1px var(--nw-line)}
    .comfort-rail .comfort-feel{position:absolute;top:50%;box-sizing:border-box;width:20px;height:20px;margin:-10px 0 0 -10px;border-radius:50%;background:var(--nw-bg);border:4px solid var(--nw-calm);box-shadow:0 1px 4px #0002}
    .comfort .big{font-size:42px}
    @container(max-width:500px){.comfort-head .source{max-width:48%;margin-left:auto}.comfort-metric-row{gap:12px}.comfort .big{font-size:38px}.comfort-factors{justify-content:flex-start}.comfort-rail-line{gap:7px}.comfort-explain{left:-95px}}
    .extras-card{padding:13px 16px;gap:10px;min-width:0}
    .extra-chips{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:8px}
    .extra-chip{display:inline-flex;align-items:center;gap:6px;padding:6px 13px;border-radius:999px;border:1px solid transparent;max-width:100%;box-sizing:border-box;white-space:nowrap;
      background:color-mix(in oklab,var(--c) 24%,transparent);color:color-mix(in oklab,var(--c) 34%,var(--nw-fg));font-size:13px;line-height:20px;font-weight:600}
    .extra-chip b{font-weight:750;font-variant-numeric:tabular-nums}
    .extra-chip ha-icon{--mdc-icon-size:18px;flex:none}
    .extra-chip[data-entity]{cursor:pointer}
    .extra-chip[data-entity]:focus-visible{outline:2px solid var(--nw-accent);outline-offset:2px}
    @container(max-width:420px){.extras-card{padding:10px}.extra-chip{font-size:12px;padding:5px 10px}.extra-chips{gap:7px}}

    /* Moon layout inspired by ngocjohn/lunar-phase-card, with Niak's theme tokens. */
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
      .moon-phase{font-size:17px}.moon-illumination{font-size:24px}
      .moon-stats{grid-template-columns:1fr}.moon-stat{padding:4px 0;font-size:11px}
      .moon-future-list{grid-template-columns:1fr}}
    @container(max-width:320px){.moon-main{grid-template-columns:1fr;text-align:center}
      .moon-main.moon-right{grid-template-columns:1fr}
      .moon-main .moon-visual{width:min(55%,145px);margin:auto}
      .moon-right .moon-visual{order:0}.moon-stats{text-align:left}}

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
    /* Le bloc température est toujours indivisible : valeur, mini/maxi, tendance, source. */
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
    /* Tablet & mobile: preserve the two genuinely different positions. */
    @container(max-width:630px){
      .overview{padding:15px 16px}
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
      .ov-bulletin p{font-size:13px}
    }
    @container(max-width:350px){
      .ov-grid,.ov-grid.temp-left{grid-template-columns:minmax(0,1fr)}
      .ov-grid.temp-left .ov-now,.ov-grid.temp-right .ov-now{grid-column:1;grid-row:1}
      .ov-grid.temp-left .ov-copy,.ov-grid.temp-right .ov-copy{grid-column:1;grid-row:2}
      .ov-grid.temp-left .ov-now{align-items:flex-start;text-align:left}
      .ov-grid.temp-right .ov-now{align-items:flex-end;text-align:right}
    }
    /* Classic overview: one full-width information region below the temperature block.
       Compact overview: temperature and bulletin share a row (existing behaviour). */
    .ov-grid.layout-classic{display:flex;flex-direction:column;gap:22px}
    .ov-grid.layout-classic .ov-now{flex:0 1 auto;max-width:100%;grid-column:auto;grid-row:auto}
    .ov-grid.layout-classic .ov-copy{width:100%;grid-column:auto;grid-row:auto}
    .ov-grid.layout-classic.temp-left .ov-now{align-self:flex-start;align-items:flex-start;text-align:left}
    .ov-grid.layout-classic.temp-left .ov-condition{justify-content:flex-start}
    .ov-grid.layout-classic.temp-right .ov-now{align-self:flex-end;align-items:flex-end;text-align:right}
    .ov-grid.layout-classic.temp-right .ov-condition{justify-content:flex-end}
    @container(max-width:630px){
      .ov-grid.layout-classic{gap:18px}
      .ov-grid.layout-classic .ov-now{grid-column:auto;grid-row:auto}
      .ov-grid.layout-classic .ov-copy{grid-column:auto;grid-row:auto}
    }
    @container(max-width:350px){
      .ov-grid.layout-classic.temp-left .ov-now,.ov-grid.layout-classic.temp-right .ov-now{grid-column:auto;grid-row:auto}
      .ov-grid.layout-classic.temp-left .ov-copy,.ov-grid.layout-classic.temp-right .ov-copy{grid-column:auto;grid-row:auto}
    }
    .moon-photo{width:100%;max-width:160px;height:auto;aspect-ratio:1;object-fit:contain;filter:drop-shadow(0 8px 15px #0004)}
    .moon-fallback{display:none;width:100%;height:100%;place-items:center}
    .moon-fallback.show{display:grid}
    .moon-photo[hidden]{display:none}

    .full-native-wrapper{display:flex;flex-direction:column;gap:16px;min-width:0;width:100%}
    .full-native-wrapper>niak-weather-card{display:block;order:0;min-width:0}
    .full-native-wrapper>.full-native-moon{display:block;order:1;min-width:0}
    .full-native-wrapper.moon-before>.full-native-moon{order:-1}
    .full-native-wrapper>.full-native-sun,.full-native-wrapper>.full-native-radars{display:block;min-width:0}

    .sun-home,.radar-module{gap:14px}
    .sun-head{display:flex;align-items:center;flex-wrap:wrap;gap:10px}
    .sun-head strong{font-size:19px;font-weight:750;flex:1}
    .sun-head .source{margin-left:auto}
    .sun-day{font-size:12px;color:var(--nw-fg2)}
    .sun-metrics{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
    .sun-metric{padding:14px;border-radius:12px;background:color-mix(in srgb,var(--nw-calm) 12%,transparent);display:flex;flex-direction:column;gap:6px}
    .sun-metric b{font-size:24px;font-weight:750;font-variant-numeric:tabular-nums}
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
    .radar-frame{min-width:0;display:flex;flex-direction:column;gap:8px}
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
    @container(max-width:450px){.sun-metrics{grid-template-columns:1fr}.sun-times{grid-template-columns:repeat(2,minmax(0,1fr))}}

    /* Sun occupies the footprint of one Niak weather panel, keeping Solar Mask visible. */
    .sun-home.sun-compact{padding:13px 14px;gap:10px}
    .sun-compact .sun-head{gap:7px}
    .sun-compact .sun-head strong{font-size:16px}
    .sun-compact .sun-head .head-icon{--mdc-icon-size:19px;padding:6px;border-radius:10px}
    .sun-compact .sun-head .source{font-size:10px;padding:3px 6px}
    .sun-compact .sun-day{font-size:10px}
    .sun-compact .sun-metrics{grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}
    .sun-compact .sun-metric{padding:8px 9px;gap:3px;border-radius:9px;min-width:0}
    .sun-compact .sun-metric .label{font-size:9px;line-height:1.3}
    .sun-compact .sun-metric b{font-size:18px;line-height:1.2}
    .sun-compact .sun-metric small{font-size:10px;line-height:1.3}
    .sun-compact .sun-times{grid-template-columns:repeat(4,minmax(0,1fr));gap:5px}
    .sun-compact .sun-time{padding:6px 2px;gap:3px;border-radius:8px;min-width:0}
    .sun-compact .sun-time ha-icon{--mdc-icon-size:17px}
    .sun-compact .sun-time span,.sun-compact .sun-time b{font-size:10px}
    .sun-compact .sun-time b{overflow-wrap:anywhere}
    .sun-compact .solar-chart-host solar-mask-card{display:block;width:100%;min-width:0}
    @container(max-width:450px){
      .sun-compact .sun-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}
      .sun-compact .sun-times{grid-template-columns:repeat(4,minmax(0,1fr))}
    }
    @container(max-width:300px){.sun-compact .sun-times{grid-template-columns:repeat(2,minmax(0,1fr))}}
    .full-native-wrapper{container-type:inline-size}
    .full-native-wrapper>.full-native-sun:not(.in-today){width:calc((100% - 32px)/3);max-width:100%;align-self:flex-start}
    @container(max-width:859px){.full-native-wrapper>.full-native-sun:not(.in-today){width:calc((100% - 16px)/2)}}
    @container(max-width:559px){.full-native-wrapper>.full-native-sun:not(.in-today){width:100%}}
    .note{color:var(--nw-fg2);font-size:12px;line-height:1.5;margin:0}.bulletin{font-size:15px;line-height:1.65;margin:0}.periods{display:grid;gap:9px;padding-top:10px;border-top:1px solid var(--nw-line)}.periods>div{display:flex;gap:9px;align-items:flex-start}.periods ha-icon{color:var(--nw-wind)}.periods span{display:grid;gap:2px}.periods small{color:var(--nw-fg2);font-size:12px}.inner.events{padding:12px 16px 16px;gap:10px}.inner.events>.label{margin:0 4px}.inner.events>niak-frise{display:block;min-width:0}.events{display:flex;gap:10px;overflow-x:auto;overscroll-behavior-x:contain;padding:4px 2px 8px;scroll-snap-type:x proximity}.event{display:flex;gap:8px;align-items:flex-start;min-width:165px;max-width:260px;flex:1 0 170px;border:1px solid var(--nw-line);border-radius:12px;background:color-mix(in srgb,var(--nw-wind) 5%,var(--nw-card-surface));padding:12px;scroll-snap-align:start}.event ha-icon{color:var(--nw-wind);--mdc-icon-size:20px}.event>div{display:flex;flex-direction:column;gap:5px}.event b{font-size:12px;line-height:1.5;font-weight:650}.event.alert2,.event.alert3{border-color:var(--warning-color,#edb65e)}
    .current{position:relative;isolation:isolate;overflow:hidden;background:radial-gradient(circle at 95% 0%,color-mix(in srgb,var(--nw-wind) 15%,transparent),transparent 60%),var(--nw-card-surface)}.sky-layer{position:absolute;inset:0;pointer-events:none;opacity:.32;z-index:0}.current>:not(.sky-layer){position:relative;z-index:1}.current-top,.summary-head{display:flex;align-items:center;justify-content:space-between;gap:12px}.current-top strong,.summary-head strong{font-size:19px}.date{font-size:12px;color:var(--nw-fg2)}.current-grid{display:flex;align-items:center;justify-content:space-between;gap:14px}.condition{display:flex;gap:11px;align-items:center;min-width:0}.condition>div{display:flex;flex-direction:column;gap:4px}.condition b{font-size:15px}.condition .weather-icon{--mdc-icon-size:40px;color:var(--nw-wind)}.temp{font-size:47px;line-height:1.15;font-weight:770;white-space:nowrap}.temp span{font-size:18px;font-weight:450}.current .source{max-width:100%;align-self:flex-start}.summary{padding:15px;display:grid;gap:8px}.summary-parts{display:grid;gap:8px}.summary .inner{padding:15px 16px;border:1px solid var(--nw-line);border-radius:14px}.summary .summary-head{padding:6px 9px 12px}.summary-head span{font-size:12px;color:var(--nw-fg2)}
    .rain-next{display:grid;gap:9px}.rain-days{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px;align-items:end;min-height:120px}.rain-days>.label{grid-column:1/-1}.rain-days>div{display:flex;flex-direction:column;gap:5px;justify-content:flex-end;align-items:center;height:85px;font-size:10px;min-width:0}.rain-days i{display:block;background:var(--nw-rain);border-radius:4px 4px 0 0;width:35%;min-height:2px}.rain-days b{white-space:nowrap;font-size:9px}
    .air-complete{--nw-air-empty:color-mix(in srgb,var(--nw-fg) 12%,transparent)}
    .atmo-head{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
    .atmo-head strong{font-size:19px;font-weight:750;flex:1}
    .atmo-date,.atmo-zone,.atmo-updated{font-size:12px;color:var(--nw-fg2)}
    .atmo-panels{display:grid;gap:14px}
    .atmo-layout-grid,.atmo-layout-auto{grid-template-columns:repeat(2,minmax(0,1fr))}
    .atmo-layout-stack{grid-template-columns:minmax(0,1fr)}
    .atmo-panels>.atmo-panel:only-child{grid-column:1/-1}
    .atmo-panel{display:flex;flex-direction:column;gap:12px;min-width:0;padding:16px;border:1px solid var(--nw-line);
      border-radius:var(--nw-radius,14px);background:color-mix(in srgb,var(--nw-card-surface) 75%,transparent)}
    .atmo-panel-heading{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:9px}
    .atmo-panel-heading strong{font-size:16px;font-weight:750}
    .atmo-source{font-size:11px;border:1px solid var(--nw-line);border-radius:999px;padding:5px 10px;color:var(--nw-fg2)}
    .atmo-zone{margin:-7px 0 0}
    .atmo-index{display:grid;grid-template-columns:auto minmax(0,1fr);align-items:center;gap:16px}
    .atmo-index.gauge-right{grid-template-columns:minmax(0,1fr) auto}
    .atmo-index.gauge-right .atmo-gauge{grid-column:2;grid-row:1}
    .atmo-index.gauge-right .atmo-index-info{grid-column:1;grid-row:1}
    .atmo-gauge{width:76px;height:76px;overflow:visible}
    .atmo-index-info{display:flex;flex-direction:column;gap:5px}
    .atmo-index-info strong{font-size:20px;font-weight:750;line-height:1.25}
    .atmo-index-info small{font-size:12px;color:var(--nw-fg2)}
    .atmo-details{border-top:1px solid var(--nw-line);padding-top:10px}
    .atmo-details summary{cursor:pointer;display:flex;align-items:center;gap:6px;font-size:13px;color:var(--nw-fg2);font-weight:700}
    .atmo-details summary ha-icon{--mdc-icon-size:16px}
    .atmo-details[open] summary ha-icon{transform:rotate(90deg)}
    .atmo-details ul{list-style:none;margin:7px 0 0;padding:0;display:grid}
    .atmo-details li{display:flex;justify-content:space-between;gap:12px;border-bottom:1px solid var(--nw-line);padding:8px 0;font-size:13px}
    .atmo-details li b{text-align:right;font-weight:600;overflow-wrap:anywhere}
    .atmo-updated{line-height:1.5;margin:5px 0 0}
    .atmo-foot{display:flex;justify-content:flex-end}
    @container(max-width:640px){.atmo-layout-auto{grid-template-columns:minmax(0,1fr)}}
    @container(max-width:470px){.atmo-layout-grid{grid-template-columns:minmax(0,1fr)}
      .atmo-panel{padding:12px}.atmo-index{gap:9px}.atmo-gauge{width:66px;height:66px}}
.pollen-stack{display:grid;gap:12px}.pollen-main{display:flex;gap:15px;align-items:center}.pollen-main .disc{height:80px;width:80px;flex:none}.pollen-main>div{display:grid;gap:4px}.pollen-main b{font-size:20px}.details{border-top:1px solid var(--nw-line);padding-top:10px}.details summary{cursor:pointer;font-size:13px;font-weight:650;color:var(--nw-fg2)}.detail-line{display:flex;justify-content:space-between;gap:12px;border-bottom:1px solid var(--nw-line);padding:9px 0;font-size:13px}.detail-line b{font-weight:600;text-align:right}.details .note{margin-top:10px}
    .hours-plot{height:160px;position:relative;border-radius:12px;overflow:hidden;background:repeating-linear-gradient(0deg,transparent 0 32px,color-mix(in srgb,var(--nw-line) 55%,transparent) 32px 33px)}.hours-plot svg{width:100%;height:100%}.hour-marks{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:4px;margin-top:2px}.hour-marks>span{display:flex;align-items:center;flex-direction:column;gap:4px;color:var(--nw-fg2);font-size:11px;min-width:0}.hour-marks ha-icon{--mdc-icon-size:22px;color:var(--nw-wind)}.hour-marks small{font-size:10px;text-align:center}
    .days-table{display:grid;font-size:12px}.day-row,.day-head{display:grid;grid-template-columns:minmax(48px,.8fr) 34px minmax(92px,2.5fr) minmax(58px,.8fr) minmax(62px,1fr);gap:7px;align-items:center;border-bottom:1px solid var(--nw-line);padding:12px 0}.day-head{font-size:10px;letter-spacing:.5px;text-transform:uppercase;color:var(--nw-fg2);font-weight:700}.day-row ha-icon{--mdc-icon-size:23px;color:var(--nw-wind)}.day-temp{height:31px;position:relative;min-width:0}.day-temp>div{display:flex;justify-content:space-between;gap:10px}.day-temp i{position:absolute;left:var(--left);bottom:0;width:var(--width);height:5px;background:linear-gradient(90deg,var(--nw-wind),var(--nw-rain));border-radius:4px}.empty{color:var(--nw-fg2);padding:22px;font-size:14px;line-height:1.6}.wait{display:flex;align-items:center;gap:10px;padding:22px;color:var(--nw-fg2);font-size:14px}.wait ha-icon{color:var(--nw-wind)}[data-entity]{cursor:pointer}[data-entity]:focus-visible{outline:2px solid var(--nw-wind);outline-offset:2px}
    @container (max-width:500px){.inner{padding:15px;gap:12px}.head strong{font-size:17px}.head-icon{padding:8px}.source{font-size:11px}.big{font-size:37px}.stats b{font-size:13px}.compass{width:70px;height:70px}.days-table{font-size:11px}.day-row,.day-head{grid-template-columns:minmax(36px,.9fr) 26px minmax(70px,2fr) minmax(45px,1fr) minmax(48px,1fr);gap:4px}.day-row ha-icon{--mdc-icon-size:19px}.hour-marks ha-icon{--mdc-icon-size:18px}.hour-marks small{font-size:9px}.summary{padding:9px}.summary .inner{padding:12px}}
    @media (prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important}}
  `;


  const FULL_BANNER=['bulletin','events'], FULL_TODAY=['comfort','rain','wind','pressure','extras','air'], FULL_FORECAST=['hours','days','air'];
  const FULL_CHOICES={
    banner_blocks:[['bulletin','Bulletin'],['events','Événements'],['moments','Moments à venir'],['forecast','Prévisions en tuiles']],
    today_blocks:[['comfort','Ressenti'],['rain','Pluie'],['wind','Vent'],['pressure','Pression'],['extras','Indicateurs'],['air','Air et pollens']],
    forecast_blocks:[['hours','Prévisions 18 heures'],['days','Prévisions 7 jours'],['air','Air et pollens de demain']]
  };
  function fullOriginalConfig(c){
    const list=(key,defaults)=>(Array.isArray(c[key])?c[key]:defaults).filter(item=>FULL_CHOICES[key].some(([id])=>id===item));
    const config={
      type:'custom:niak-weather-card',format:'full',
      ...(c.entry_id?{entry_id:c.entry_id}:{}),
      today_blocks:list('today_blocks',FULL_TODAY),
      forecast_blocks:list('forecast_blocks',FULL_FORECAST).filter(x=>opt(c,'full_show_atmo_tomorrow')||x!=='air'),
      weather_animations:opt(c,'show_animations'),glass_effect:c.background_mode!=='transparent',
      show_atmo_details:opt(c,'show_details'),
      clock:['left','right','none'].includes(c.full_clock)?c.full_clock:'none',
      collapse_today:c.collapse_today===true,collapse_predictions:c.collapse_predictions===true
    };
    if(c.full_show_banner===false)config.show_synthesis=false;
    else config.banner_blocks=list('banner_blocks',FULL_BANNER).filter(x=>opt(c,'show_bulletin')||x!=='bulletin');
    return config;
  }
  function fullOriginalCSS(c){
    const rules=[];
    if(c.background_mode==='glass')rules.push(
      ':host{--nw-bg:color-mix(in srgb,var(--ha-card-background,var(--card-background-color,#fff)) 76%,transparent)!important}',
      'ha-card{background:var(--nw-bg)!important;backdrop-filter:blur(10px) saturate(1.15)}');
    if(c.background_mode==='transparent')rules.push(':host{--nw-bg:transparent!important;--ha-card-background:transparent!important}',
      'ha-card,.nw-panel{background:transparent!important;backdrop-filter:none!important;box-shadow:none!important}');
    if(!opt(c,'show_border'))rules.push('ha-card,.nw-panel{border:0!important;box-shadow:none!important}');
    if(!opt(c,'show_title'))rules.push('.nw-hero>.fm-head h2,.fm-section>.fm-head h2{display:none!important}');
    if(!opt(c,'show_date'))rules.push('.nw-hero>.fm-head>span:not(.nw-chip){display:none!important}');
    if(!opt(c,'show_source'))rules.push('.nw-panel-head .nw-badge,.nw-now .nw-badge{display:none!important}');
    else if(c.full_source_position==='footer')rules.push('.nw-panel{position:relative;padding-bottom:46px!important}',
      '.nw-panel-head .nw-badge{position:absolute;right:16px;bottom:12px;margin:0!important}');
    if(!opt(c,'show_temp_range'))rules.push('.nw-hero .nw-now .range{display:none!important}');
    if(!opt(c,'show_temp_trend'))rules.push('.nw-hero .nw-now .nw-chip{display:none!important}');
    if(c.temperature_position==='left')rules.push(
      '.nw-hero{grid-template-columns:minmax(185px,36%) minmax(0,1fr)!important;grid-template-areas:"head head" "now main" "blocks blocks"!important}',
      '.nw-hero>.nw-now{align-items:flex-start!important;text-align:left!important;grid-area:now!important}',
      '.nw-hero>.hero-main{grid-area:main!important}',
      '@container(max-width:650px){.nw-hero{grid-template-columns:minmax(0,1fr)!important;grid-template-areas:"head" "now" "main" "blocks"!important}}');

    if(c.full_compact_air!==false)rules.push(
      /* Same compact Air + Pollens for Today AND Tomorrow. */
      '.fm-section .fm-body>.panels-two{box-sizing:border-box;width:calc((100% - 32px)/3);grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:7px!important;align-items:stretch}',
      '.fm-section .panels-two>.nw-panel{min-width:0;padding:10px 8px!important;border-radius:12px}',
      '.fm-section .panels-two .nw-panel-head{gap:5px!important}',
      '.fm-section .panels-two .nw-panel-head h3{font-size:12px!important;line-height:1.25;white-space:normal!important;max-width:none!important}',
      '.fm-section .panels-two .nw-panel-icon{width:25px!important;height:25px!important}',
      '.fm-section .panels-two .nw-panel-icon ha-icon{--mdc-icon-size:15px}',
      '.fm-section .panels-two .nw-badge{font-size:9px!important;margin-left:0!important;max-width:100%;overflow-wrap:anywhere}',
      '.fm-section .panels-two .nw-sub{font-size:10px!important}',
      '.fm-section .panels-two .aq{grid-template-columns:minmax(0,1fr)!important;justify-items:center;text-align:center;gap:5px!important}',
      '.fm-section .panels-two .aq .disc{width:52px!important;height:52px!important}',
      '.fm-section .panels-two .aq strong{font-size:12px!important}',
      '.fm-section .panels-two .aq .nw-label,.fm-section .panels-two .aq small{font-size:9px!important}',
      '.fm-section .panels-two .nw-details{font-size:10px!important}',
      '@container(min-width:560px) and (max-width:859px){.fm-section .fm-body>.panels-two{width:calc((100% - 16px)/2)}}',
      '@container(max-width:559px){.fm-section .fm-body>.panels-two{width:100%}}',
      '@container(max-width:339px){.fm-section .fm-body>.panels-two{grid-template-columns:minmax(0,1fr)!important}}');
    // The border setting applies to both Today's and Tomorrow's air/pollen panels.
    if(c.full_air_border!==true)rules.push(
      '.fm-section .panels-two>.nw-panel{border:0!important;box-shadow:none!important;background:transparent!important}');
    if(c.full_show_sun===true)rules.push(
      '.fm-section[aria-labelledby$="-today"] .fm-body.niak-sun-air-row{grid-template-columns:minmax(0,1fr)!important;align-items:start}',
      '.fm-body.niak-sun-air-row>.full-native-sun{grid-column:1;order:1;min-width:0;width:100%}',
      '.fm-body.niak-sun-air-row>.panels-two{grid-column:1;order:2;width:100%!important;min-width:0}',
      '.fm-body.niak-sun-air-row>:not(.full-native-sun):not(.panels-two){grid-column:1/-1;order:0}',
      '@container(min-width:560px){.fm-section[aria-labelledby$="-today"] .fm-body.niak-sun-air-row{grid-template-columns:repeat(2,minmax(0,1fr))!important}}',
      '@container(min-width:860px){.fm-section[aria-labelledby$="-today"] .fm-body.niak-sun-air-row{grid-template-columns:repeat(3,minmax(0,1fr))!important}}');
    return rules.join('\n');
  }
  function fullEditor(c){
    if(c.format!=='full')return '';
    const select=(name,title,values,value)=>'<label>'+esc(title)+'<select name="'+name+'">'+
      values.map(([id,text])=>'<option value="'+id+'" '+(value===id?'selected':'')+'>'+esc(text)+'</option>').join('')+'</select></label>';
    const check=(name,title,value)=>'<label class="toggle"><input type="checkbox" name="'+name+'" '+(value?'checked':'')+'/>'+esc(title)+'</label>';
    const ranks=(group,title,defaults)=>{
      const choices=FULL_CHOICES[group],chosen=(Array.isArray(c[group])?c[group]:defaults).filter(x=>choices.some(([id])=>id===x));
      const all=[...chosen,...choices.map(([id])=>id).filter(id=>!chosen.includes(id))];
      return '<fieldset><legend>'+esc(title)+'</legend><span class="hint">Choisir une position, ou masquer le bloc.</span>'+
        all.map(id=>'<label>'+esc(choices.find(x=>x[0]===id)?.[1]||id)+
          '<select data-full-group="'+group+'" data-full-block="'+id+'">'+
          '<option value="off" '+(!chosen.includes(id)?'selected':'')+'>Masquer</option>'+
          Array.from({length:choices.length},(_,i)=>'<option value="'+(i+1)+'" '+(chosen.indexOf(id)===i?'selected':'')+'>Position '+(i+1)+'</option>').join('')+
          '</select></label>').join('')+'</fieldset>';
    };
    return '<fieldset><legend>Options de la carte complète</legend>'+
      select('temperature_position','Bloc température',[['right','À droite'],['left','À gauche']],c.temperature_position||'right')+
      select('full_source_position','Position des sources',[['header','En haut des panneaux'],['footer','En bas des panneaux']],c.full_source_position||'header')+
      select('full_clock','Horloge',[['none','Masquée'],['left','Gauche'],['right','Droite']],c.full_clock||'none')+
      check('full_show_banner','Afficher le bandeau météo',c.full_show_banner!==false)+
      check('collapse_today','Replier Aujourd’hui au départ',c.collapse_today===true)+
      check('collapse_predictions','Replier Prévisions au départ',c.collapse_predictions===true)+
      check('full_show_atmo_tomorrow','Air et pollens de demain',opt(c,'full_show_atmo_tomorrow'))+
      '<label class="toggle"><input type="checkbox" name="full_compact_air" '+(c.full_compact_air!==false?'checked':'')+'/>Air extérieur + Pollens : largeur d’une carte</label>'+
      '<label class="toggle"><input type="checkbox" name="full_air_border" '+(c.full_air_border===true?'checked':'')+'/>Afficher la bordure Air / Pollens (aujourd’hui et demain)</label>'+
      '</fieldset>'+ranks('banner_blocks','Bandeau — ordre et visibilité',FULL_BANNER)+
      ranks('today_blocks','Aujourd’hui — ordre et visibilité',FULL_TODAY)+
      ranks('forecast_blocks','Prévisions — ordre et visibilité',FULL_FORECAST)+
      '<fieldset><legend>Carte Lune en option</legend>'+
      check('full_show_moon','Ajouter la carte Lune',c.full_show_moon===true)+
      (c.full_show_moon===true?select('full_moon_position','Position de la carte Lune',
        [['after','Après la carte météo'],['before','Avant la carte météo']],c.full_moon_position||'after'):'')+
      '<span class="hint">Lunar Phase est nécessaire uniquement pour afficher la Lune.</span></fieldset>';
  }
  class NiakModularCard extends HTMLElement {
    constructor(){super();this.attachShadow({mode:'open'});this._config={type:`custom:${ELEMENT}`,format:'wind'};this._view=null;this._error='';this._hass=null;this._connection=null;this._subscription=null;this._requestedEntry=null;this._generation=0;this._lastKey='';this._renderKey='';this._onEvent=e=>{const target=e.composedPath().find(x=>x?.getAttribute?.('data-entity'));const entity=target?.getAttribute('data-entity');if(entity){this.dispatchEvent(new CustomEvent('hass-more-info',{detail:{entityId:entity},bubbles:true,composed:true}));}};this.shadowRoot.addEventListener('click',this._onEvent);this.shadowRoot.addEventListener('click',e=>{const tab=e.composedPath?.().find(x=>x?.getAttribute?.('data-radar-tab'));if(tab){this._radarTab=tab.getAttribute('data-radar-tab');this._updateRadarTabs();}});}
    static getStubConfig(){return {type:`custom:${ELEMENT}`,format:'wind'};}
    static getConfigElement(){return document.createElement('niak-weather-modular-editor');}
    setConfig(config){if(!config||!ACCEPTED.has(config.format||'wind'))throw new Error('Niak Weather Modular : format inconnu.');const old=this._config;const cc=normalize(config);this._config={...DEFAULTS,...(EXTRA_FORMATS.has(cc.format)?{show_title:false}:{}),...cc};if(old?.entry_id!==this._config.entry_id){this._view=null;this._stopSubscription();}this._render();this._subscribe();}
    set hass(hass){const differentConnection=this._connection && hass?.connection!==this._connection;this._hass=hass;if(differentConnection){this._view=null;this._stopSubscription();}this._subscribe();if(['moon','full','sun-home','radars'].includes(this._config.format))this._render();}
    get hass(){return this._hass;}
    connectedCallback(){this._render();this._subscribe();}
    disconnectedCallback(){this._stopSubscription();}
    getCardSize(){if(this._config.format==='full')return 13;if(this._config.format==='moon'||this._config.format==='overview')return 5;if(['current','bulletin','comfort'].includes(this._config.format))return 3;if(['hours','days','summary','events'].includes(this._config.format))return 5;return 4;}
    getGridOptions(){if(this._config.format==='full')return {columns:'full',rows:'auto'};if(this._config.format==='sun-home')return {columns:4,rows:'auto',min_columns:4};return {columns:12,rows:'auto',min_columns:3};}
    _stopSubscription(){this._generation++;const sub=this._subscription;this._subscription=null;this._requestedEntry=null;if(sub){sub.then(stop=>typeof stop==='function'?stop():null).catch(()=>{});}}
    _subscribe(){if(['moon','full','sun-home','radars'].includes(this._config?.format)){if(this._subscription)this._stopSubscription();return;}if(!this.isConnected||!this._hass?.connection||!this._config)return;const entry=this._config.entry_id||'';if(this._subscription&&this._requestedEntry===entry&&this._connection===this._hass.connection)return;this._stopSubscription();this._connection=this._hass.connection;this._requestedEntry=entry;this._error='';const gen=this._generation;const payload={type:'niak_weather/subscribe',...(entry?{entry_id:entry}:{})};const pending=this._connection.subscribeMessage(data=>{if(gen!==this._generation)return;if(data.reload){this._view=null;this._error='La configuration Niak Weather a changé. Rechargez la page.';}else if(data.version!==1){this._error='Version de données Niak Weather non compatible (attendue : 1).';this._view=null;}else{this._view=data.view;this._error='';}this._render();},payload);this._subscription=pending;Promise.resolve(pending).catch(e=>{if(gen!==this._generation)return;this._subscription=null;const msg=e?.code==='choose_entry'?'Plusieurs lieux Niak Weather : indiquez entry_id dans la carte.':e?.code==='not_configured'?'Configurez d’abord l’intégration Niak Weather.':e?.code==='unknown_command'?'Intégration Niak Weather introuvable.':e?.message||'Impossible de recevoir les données Niak Weather.';this._error=msg;this._render();});}
    _syncEmbeddedWidgets(c){
      // Keep the Lit timeline instance alive. Its internal 4.5s timer must survive every incoming weather update.
      this.shadowRoot.querySelectorAll('niak-frise').forEach(f=>{
        const v=this._view||{};
        f.points=v.points||[];f.alerts=v.alerts||[];f.hours=v.hours||[];f.timeline=v.timeline;
      });
      this.shadowRoot.querySelectorAll('niak-weather-sky').forEach(s=>{
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
    _updateSummaryWithoutResettingFrise(body){
      // Update current weather and the bulletin without detaching the timeline from the document.
      const root=this.shadowRoot.querySelector?.('section.summary');
      const oldParts=root?.querySelector('.summary-parts');
      if(!oldParts)return false;
      const template=document.createElement('template');template.innerHTML=body;
      const fresh=template.content.querySelector('section.summary');
      const newParts=fresh?.querySelector('.summary-parts');
      if(!newParts||oldParts.children.length!==newParts.children.length)return false;
      const oldChildren=[...oldParts.children],newChildren=[...newParts.children];
      if(!oldChildren.every((el,i)=>el.classList.contains('events')===newChildren[i].classList.contains('events')))return false;
      const oldHead=root.querySelector('.summary-head'),newHead=fresh.querySelector('.summary-head');
      if(Boolean(oldHead)!==Boolean(newHead))return false;
      if(oldHead&&newHead)oldHead.replaceWith(newHead);
      oldChildren.forEach((el,i)=>{if(!el.classList.contains('events'))el.replaceWith(newChildren[i]);});
      return true;
    }


    _syncFullSun(native,wrapper){
      const c=this._config,sun=this._fullSunElement,root=native?.shadowRoot;
      const body=root?.querySelector?.('.fm-section[aria-labelledby$="-today"] .fm-body');
      const inline=c.full_show_sun===true&&(c.full_sun_position===undefined||c.full_sun_position==='today');
      // Leave native Lit-managed grid3 and panels-two in their own DOM positions.
      root?.querySelectorAll?.('.fm-body.niak-sun-air-row')?.forEach(el=>{
        if(!inline||el!==body)el.classList.remove('niak-sun-air-row');
      });
      if(!sun||c.full_show_sun!==true){body?.classList?.remove('niak-sun-air-row');return;}
      if(inline){
        if(!body){sun.remove?.();return;} // A folded Today section must also hide sunlight.
        if(sun.parentElement!==body)body.appendChild(sun);
        body.classList.add('niak-sun-air-row');
        sun.classList?.add('in-today');
        if(sun.style)sun.style.order='1';
      }else{
        body?.classList?.remove('niak-sun-air-row');
        if(sun.parentElement!==wrapper)wrapper.appendChild(sun);
        sun.classList?.remove('in-today');
        if(sun.style)sun.style.order=(c.full_sun_position==='before'?-10:10)+Math.max(1,Math.min(3,Number(c.full_sun_order)||1));
      }
    }
    _renderFullOfficial(){
      const c=this._config;
      if(!customElements.get('niak-weather-card')){
        this.shadowRoot.innerHTML='<style>'+CSS+'</style><ha-card><div class="inner">'+
          'Niak Weather officiel est introuvable. Vérifiez son intégration et rechargez Home Assistant.</div></ha-card>';
        if(!this._waitingFull&&typeof customElements.whenDefined==='function'){
          this._waitingFull=true;
          customElements.whenDefined('niak-weather-card').then(()=>{
            this._waitingFull=false;if(this.isConnected&&this._config.format==='full')this._render();
          }).catch(()=>{this._waitingFull=false;});
        }
        return;
      }
      let wrapper=this.shadowRoot.querySelector?.('.full-native-wrapper');
      if(!wrapper){
        this.shadowRoot.innerHTML='<style>'+CSS+'</style><div class="full-native-wrapper">'+
          '<niak-weather-card></niak-weather-card></div>';
        wrapper=this.shadowRoot.querySelector?.('.full-native-wrapper');
      }
      if(!wrapper)return;
      const native=wrapper.querySelector?.('niak-weather-card');
      if(!native)return;
      const cfg=fullOriginalConfig(c),key=JSON.stringify(cfg);
      if(this._fullOriginalKey!==key){
        try{native.setConfig(cfg);this._fullOriginalKey=key;}
        catch(e){console.warn('Niak Modular: configuration de la carte complète',e);}
      }
      if(this._hass)native.hass=this._hass;
      const apply=()=>{
        const root=native.shadowRoot;if(!root?.querySelector||!root?.appendChild)return;
        let style=root.querySelector('#niak-full-custom-style');
        if(!style){style=document.createElement('style');style.id='niak-full-custom-style';root.appendChild(style);}
        const css=fullOriginalCSS(c);if(style.textContent!==css)style.textContent=css;
      };
      apply();if(native.updateComplete?.then)native.updateComplete.then(()=>{apply();this._syncFullSun(native,wrapper);}).catch(()=>{});
      const addModule=(kind,enabled,config,position,rank)=>{
        let card=kind==='sun'?(this._fullSunElement||wrapper.querySelector?.('.full-native-sun')):wrapper.querySelector?.('.full-native-'+kind);
        if(enabled){
          if(!card){card=document.createElement(ELEMENT);card.className='full-native-'+kind;wrapper.appendChild(card);}if(kind==='sun')this._fullSunElement=card;
          const hash=JSON.stringify(config);
          if(card._fullExtraKey!==hash){card.setConfig(config);card._fullExtraKey=hash;}
          if(this._hass)card.hass=this._hass;
          if(card.style)card.style.order=(position==='before'?-10:10)+Math.max(1,Math.min(3,Number(rank)||1));
        }else if(card){if(card.remove)card.remove();if(kind==='sun')this._fullSunElement=null;}
      };
      addModule('sun',c.full_show_sun===true,{
        type:'custom:'+ELEMENT,format:'sun-home',background_mode:c.background_mode,
        show_title:true,show_date:c.show_date,show_source:c.show_source,
        sun_difference_entity:c.sun_difference_entity,sun_duration_entity:c.sun_duration_entity,
        sun_diagram_entity:c.sun_diagram_entity,sun_elevation_entity:c.sun_elevation_entity,
        sun_show_times:c.sun_show_times,sun_show_diagram:c.sun_show_diagram,
        sun_diagram_height:c.sun_diagram_height,sun_compact:c.sun_compact,sun_mask_border:c.sun_mask_border
      },c.full_sun_position,c.full_sun_order||1);
      addModule('radars',c.full_show_radars===true,{
        type:'custom:'+ELEMENT,format:'radars',background_mode:c.background_mode,
        show_title:true,show_source:c.show_source,radar_layout:c.radar_layout,
        radar_url_current:c.radar_url_current,radar_url_forecast:c.radar_url_forecast,
        radar_height:c.radar_height
      },c.full_radars_position,c.full_radars_order||2);
      this._syncFullSun(native,wrapper);
      let moon=wrapper.querySelector?.('.full-native-moon');
      if(c.full_show_moon===true){
        if(!moon){moon=document.createElement(ELEMENT);moon.className='full-native-moon';wrapper.appendChild(moon);}
        const moonConfig={
          type:'custom:'+ELEMENT,format:'moon',background_mode:c.background_mode,
          show_title:true,show_date:false,show_source:c.show_source,show_stats:true,
          show_details:true,show_chart:true,
          moon_entity:c.moon_entity,moon_position:c.moon_position||'left',
          moon_visual_mode:c.moon_visual_mode||'original',moon_image_url:c.moon_image_url,
          moon_southern_hemisphere:c.moon_southern_hemisphere===true
        };
        const mk=JSON.stringify(moonConfig);
        if(moon._fullMoonKey!==mk){moon.setConfig(moonConfig);moon._fullMoonKey=mk;}
        if(this._hass)moon.hass=this._hass;
        if(moon.style)moon.style.order=(c.full_moon_position==='before'?-10:10)+Math.max(1,Math.min(3,Number(c.full_moon_order)||3));
      }else if(moon)moon.remove();
      wrapper.classList.toggle('moon-before',c.full_show_moon===true&&c.full_moon_position==='before');
    }
    _updateSolarChart(){
      const c=this._config,{diagram,elevation}=sunMaskIds(this._hass,c);
      const node=this.shadowRoot.querySelector?.('solar-mask-card');
      if(!diagram||!node||typeof node.setConfig!=='function')return;
      const cfg={entity:diagram,...(elevation?{sun_entity:elevation}:{}),
        height:Math.max(180,Math.min(c.sun_compact===false?620:260,Number(c.sun_diagram_height)||(c.sun_compact===false?320:220)))};
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
        style.textContent=[...borderless,...(c.sun_compact===false?[]:[
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
    _render(){
      if(!this.shadowRoot)return;
      const c=this._config;
      if(c.format==='sun-home'||c.format==='radars'){this._renderLocal();return;}
      if(c.format==='full'){this._renderFullOfficial();return;}
      if(c.format==='moon'){
        const info=moonEntity(this._hass,c),key=JSON.stringify([c,info.state?.state,info.state?.attributes]);
        if(this._moonRenderKey===key&&this.shadowRoot.querySelector?.('section.moon-panel'))return;
        this._moonRenderKey=key;
      }
      let body='';
      try{
        body=c.format==='moon'?lunarCard(this._hass,c):this._error?`<div class="empty" role="alert">${icon('mdi:alert-circle-outline')} ${esc(this._error)}</div>`
          :!this._view?`<div class="wait">${icon('mdi:cloud-sync-outline')} Chargement des données Niak Weather…</div>`
          :display(this._view,c);
      }catch(e){body=`<div class="empty" role="alert">Erreur d’affichage : ${esc(e?.message||e)}</div>`;}
      const key=JSON.stringify(c), native=this.shadowRoot.querySelectorAll('niak-frise');
      if(this._view&&!this._error&&native.length&&this._renderKey===key){
        if(c.format==='events'){
          this._syncEmbeddedWidgets(c);return;
        }
        if(c.format==='overview'&&this._updateOverviewWithoutResettingFrise(body)){
          this._syncEmbeddedWidgets(c);return;
        }
      }
      this.shadowRoot.innerHTML=`<style>${CSS}</style><ha-card class="bg-${BACKGROUND_MODES.some(x=>x[0]===c.background_mode)?c.background_mode:'glass'} ${opt(c,'show_border')?'':'no-border'}">${body}</ha-card>`;
      this._renderKey=key;
      this._syncEmbeddedWidgets(c);
    }
  }


  function airEditorOptions(c){
    if(c.format!=='air')return '';
    const select=(name,title,opts,value)=>'<label>'+title+'<select name="'+name+'">'+opts.map(([id,label])=>
      '<option value="'+id+'" '+(value===id?'selected':'')+'>'+esc(label)+'</option>').join('')+'</select></label>';
    const toggle=(name,title,checked)=>'<label class="toggle"><input type="checkbox" name="'+name+'" '+
      (checked?'checked':'')+'/>'+esc(title)+'</label>';
    return '<fieldset><legend>Air extérieur — options avancées</legend>'+
      select('air_period','Période', [['today','Aujourd’hui'],['tomorrow','Demain'],['both','Aujourd’hui et demain']],c.air_period||'today')+
      select('air_layout','Disposition des panneaux',[['auto','Automatique'],['grid','Côte à côte'],['stack','Superposés']],c.air_layout||'auto')+
      select('air_order','Ordre des panneaux',[['today-first','Aujourd’hui puis demain'],['tomorrow-first','Demain puis aujourd’hui']],c.air_order||'today-first')+
      select('air_gauge_position','Position de la jauge',[['left','Gauche'],['right','Droite']],c.air_gauge_position||'left')+
      select('air_source_mode','Source',[['provider','Nom du fournisseur'],['custom','Texte personnalisé']],c.air_source_mode||'provider')+
      '<label>Texte personnalisé<input type="text" name="air_source_custom" placeholder="Ex. Atmo France" value="'+esc(c.air_source_custom||'')+'"/></label>'+
      select('air_source_position','Position de la source',[['header','En haut'],['footer','En bas']],c.air_source_position||'header')+
      toggle('air_show_zone','Afficher la zone',opt(c,'air_show_zone'))+
      toggle('air_show_updated','Afficher la date de mise à jour',opt(c,'air_show_updated'))+
      toggle('air_show_worse','Afficher le polluant le plus défavorable',opt(c,'air_show_worse'))+
      toggle('air_details_open','Déplier les détails par défaut',c.air_details_open===true)+
      '<p class="hint">Les données de demain sont affichées uniquement si Niak Weather les fournit.</p></fieldset>';
  }

  function localWeatherEditor(c,hass){
    const type=c.format,full=type==='full',sun=type==='sun-home'||(full&&c.full_show_sun===true),
      radar=type==='radars'||(full&&c.full_show_radars===true);
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
      text('sun_diagram_height','Hauteur du diagramme (px, 220 par défaut en compact)','220')+
      '<p class="hint">La carte Solar Mask et son intégration doivent être installées pour afficher le diagramme. Les horaires sont les prochains événements de sun.sun.</p></fieldset>':'';
    const radars=radar?'<fieldset><legend>Radars de pluie — URL à renseigner</legend>'+
      text('radar_url_current','Adresse URL du radar actuel','https://votre-site/radar-actuel')+
      text('radar_url_forecast','Adresse URL du radar prévisionnel','https://votre-site/radar-previsions')+
      select('radar_layout','Disposition',[['grid','Côte à côte'],['stack','Superposés'],['tabs','Onglets']], 'grid')+
      text('radar_height','Hauteur de chaque radar (px)','420')+
      '<p class="hint">Aucune URL n’est renseignée automatiquement. L’intégration par iframe doit être autorisée par le site concerné.</p></fieldset>':'';
    const addonOrder=full?'<fieldset><legend>Modules supplémentaires</legend>'+
      '<label class="toggle"><input type="checkbox" name="full_show_sun" '+(c.full_show_sun===true?'checked':'')+'/>Ajouter le module Soleil</label>'+
      '<label class="toggle"><input type="checkbox" name="full_show_radars" '+(c.full_show_radars===true?'checked':'')+'/>Ajouter les radars de pluie</label>'+
      (c.full_show_sun===true?
        select('full_sun_position','Soleil — emplacement',[['today','Dans Aujourd’hui (3 max par ligne)'],['after','Après la météo'],['before','Avant la météo']],'today')+
        select('full_sun_order','Soleil — ordre',[['1','1er'],['2','2e'],['3','3e']],'1'):'')+
      (c.full_show_radars===true?
        select('full_radars_position','Radars — emplacement',[['after','Après la météo'],['before','Avant la météo']],'after')+
        select('full_radars_order','Radars — ordre',[['1','1er'],['2','2e'],['3','3e']],'2'):'')+
      (c.full_show_moon===true?
        select('full_moon_order','Lune — ordre',[['1','1re'],['2','2e'],['3','3e']],'3'):'')+
      '<p class="hint">Lune, Soleil et Radars peuvent être placés avant ou après la météo officielle, avec un ordre de 1 à 3.</p></fieldset>':'';
    return addonOrder+sunlight+radars;
  }
  class NiakModularEditor extends HTMLElement {
    constructor(){super();this.attachShadow({mode:'open'});this._config={type:`custom:${ELEMENT}`,format:'wind'};this._entries=[];this._loadedEntries=false;this.shadowRoot.addEventListener('change',event=>this._change(event));}
    setConfig(config){const cc=normalize(config);this._config={...DEFAULTS,...(EXTRA_FORMATS.has(cc.format)?{show_title:false}:{}),...cc};this._render();}
    set hass(hass){if(this._hass?.connection===hass?.connection)return;this._hass=hass;if(this._config.format==='moon'){this._render();return;}if(!this._loadedEntries&&hass?.connection?.sendMessagePromise){this._loadedEntries=true;hass.connection.sendMessagePromise({type:'niak_weather/entries'}).then(entries=>{this._entries=Array.isArray(entries)?entries:[];this._render();}).catch(()=>{});}}
    get hass(){return this._hass;}
    _change(event){const el=event.target;let c={...this._config};if(el.dataset.fullGroup){
      const group=el.dataset.fullGroup,item=el.dataset.fullBlock;
      if(FULL_CHOICES[group]?.some(([id])=>id===item)){
        const def=group==='banner_blocks'?FULL_BANNER:group==='today_blocks'?FULL_TODAY:FULL_FORECAST;
        const current=(Array.isArray(c[group])?c[group]:def).filter(x=>x!==item);
        if(el.value!=='off')current.splice(Math.max(0,Math.min(current.length,Number(el.value)-1)),0,item);
        c[group]=current;
      }
    }else if(el.dataset.extra){const kinds=new Set(c.extras_blocks||EXTRA_DEFAULT);el.checked?kinds.add(el.value):kinds.delete(el.value);c.extras_blocks=EXTRA_TYPES.map(([id])=>id).filter(id=>kinds.has(id));}else if(el.dataset.summary){const set=new Set(c.blocks||SUMMARY);el.checked?set.add(el.value):set.delete(el.value);c.blocks=SUMMARY.filter(x=>set.has(x));}else if(el.type==='checkbox')c[el.name]=el.checked;else if(el.name==='entry_id')c.entry_id=el.value||undefined;else c[el.name]=el.value;this._config=c;this.dispatchEvent(new CustomEvent('config-changed',{detail:{config:c},bubbles:true,composed:true}));this._render();}
    _render(){const c=this._config;const fields=OPTIONS.filter(key=>c.format==='full'?!['show_events','show_chart','show_stats'].includes(key):c.format==='overview'||!['show_bulletin','show_temp_range','show_temp_trend','show_events'].includes(key)).map(key=>`<label class="toggle"><input type="checkbox" name="${key}" ${opt(c,key)?'checked':''}/>${esc({'show_title':'Afficher le titre','show_source':'Afficher la source','show_date':'Afficher la date','show_bulletin':'Afficher le bulletin du jour','show_temp_range':'Afficher min/max','show_temp_trend':'Afficher la tendance °C/h','show_events':'Afficher les événements','show_chart':'Afficher le graphique','show_stats':'Afficher les statistiques','show_details':'Afficher les détails','show_border':'Afficher les bordures','show_animations':'Afficher le ciel animé (si disponible)'}[key])}</label>`).join('');const extraOptions=c.format==='extras'?`<fieldset><legend>Indicateurs à afficher</legend>${EXTRA_TYPES.map(([id,title])=>`<label class="toggle"><input type="checkbox" data-extra="1" value="${id}" ${(c.extras_blocks||EXTRA_DEFAULT).includes(id)?'checked':''}/>${esc(title)}</label>`).join('')}</fieldset>`:'';const summaries=c.format==='summary'?`<fieldset><legend>Contenu de la synthèse</legend>${SUMMARY.map(x=>`<label class="toggle"><input data-summary="1" type="checkbox" value="${x}" ${(c.blocks||SUMMARY).includes(x)?'checked':''}/>${esc(FORMATS.find(a=>a[0]===x)[1])}</label>`).join('')}</fieldset>`:'';const backgroundSelector=`<label>Fond de la carte<select name="background_mode">${BACKGROUND_MODES.map(([value,label])=>`<option value="${value}" ${c.background_mode===value?'selected':''}>${esc(label)}</option>`).join('')}</select></label>`;const moonStates=Object.entries(this._hass?.states||{}).filter(([id,s])=>id.startsWith('sensor.')&&s?.attributes?.moon_age!==undefined&&s.attributes.illumination_fraction!==undefined);
    const localOptions=localWeatherEditor(c,this._hass);const fullOptions=fullEditor(c);const airOptions=airEditorOptions(c);const overviewLayout=c.format==='overview'?`<label>Disposition de la synthèse<select name="overview_layout">
  <option value="compact" ${c.overview_layout!=='classic'?'selected':''}>Compacte — température et bulletin côte à côte</option>
  <option value="classic" ${c.overview_layout==='classic'?'selected':''}>Classique — bulletin sous la température</option>
</select></label>`:'';const tempPosition=c.format==='overview'?`<label>Position du bloc température<select name="temperature_position">
  <option value="right" ${c.temperature_position!=='left'?'selected':''}>Droite (par défaut)</option>
  <option value="left" ${c.temperature_position==='left'?'selected':''}>Gauche</option>
</select></label>`:'';const moonVis=(c.format==='moon'||(c.format==='full'&&c.full_show_moon===true))?`<fieldset><legend>Visuel de la Lune</legend>
   <label>Source du visuel<select name="moon_visual_mode">${[['original','Images originales (Internet)'],['generated','SVG local généré'],['image','Image PNG/JPG/WebP personnalisée'],['svg','Fichier SVG personnalisé']].map(([id,name])=>`<option value="${id}" ${(c.moon_visual_mode||'original')===id?'selected':''}>${esc(name)}</option>`).join('')}</select></label>
   <label>URL de l’image ou du SVG<input type="text" name="moon_image_url" placeholder="/local/lune/{index}_moon.svg" value="${esc(c.moon_image_url||'')}"/></label>
   <span class="hint">{index} vaut 0–30, {phase} vaut le code de la phase. Repli sur SVG si l’image échoue.</span></fieldset>`:'';const moonSettings=(c.format==='moon'||(c.format==='full'&&c.full_show_moon===true))? `<fieldset><legend>Lunar Phase — capteur et disposition</legend>
      <label>Capteur de phase lunaire<select name="moon_entity"><option value="">Détection automatique</option>${moonStates.map(([id,s])=>`<option value="${esc(id)}" ${c.moon_entity===id?'selected':''}>${esc(s.attributes.friendly_name||id)} (${esc(id)})</option>`).join('')}</select></label>
      <label>Position de la lune<select name="moon_position"><option value="left" ${c.moon_position!=='right'?'selected':''}>Gauche</option><option value="right" ${c.moon_position==='right'?'selected':''}>Droite</option></select></label>
      <label class="toggle"><input name="moon_southern_hemisphere" type="checkbox" ${c.moon_southern_hemisphere===true?'checked':''}/>Hémisphère sud (orientation)</label>
      <span class="hint">Source : ngocjohn/lunar-phase. Informations locales, sans service tiers.</span>
    </fieldset>`:'';const entries=this._entries.length>1?`<label>Lieu Niak Weather<select name="entry_id"><option value="">Choisir…</option>${this._entries.map(x=>`<option value="${esc(x.entry_id)}" ${c.entry_id===x.entry_id?'selected':''}>${esc(x.title)}</option>`).join('')}</select></label>`:'';this.shadowRoot.innerHTML=`<style>:host{display:block;color:var(--primary-text-color);font-family:inherit;padding:12px}.form{display:grid;gap:15px}label{display:grid;gap:6px;font-size:14px}select,input[type=text]{box-sizing:border-box;padding:10px;background:var(--card-background-color,var(--primary-background-color,#fff));color:var(--primary-text-color);border:1px solid var(--divider-color,#ddd);border-radius:8px;width:100%}.toggle{display:flex;align-items:center;gap:10px}.toggle input{width:18px;height:18px;accent-color:var(--primary-color,#648bb2)}fieldset{border:1px solid var(--divider-color,#ddd);border-radius:9px;display:grid;gap:10px}legend{font-weight:700}.hint{color:var(--secondary-text-color);font-size:12px}</style><div class="form"><label>Type de carte<select name="format">${FORMATS.map(x=>`<option value="${x[0]}" ${c.format===x[0]?'selected':''}>${esc(x[1])}</option>`).join('')}</select></label>${entries}${summaries}${extraOptions}${fullOptions}${localOptions}${airOptions}${moonSettings}${moonVis}<fieldset><legend>Apparence et personnalisation</legend>${backgroundSelector}${overviewLayout}${tempPosition}${fields}</fieldset><p class="hint">${c.format==='moon'?'La carte Lune nécessite Lunar Phase (ngocjohn), pas Niak Weather.':'Niak Weather officiel doit être installé et configuré. Le choix du lieu est nécessaire si plusieurs lieux existent.'}</p></div>`;}
  }
  if(!customElements.get(ELEMENT))customElements.define(ELEMENT,NiakModularCard);
  if(!customElements.get('niak-weather-modular-editor'))customElements.define('niak-weather-modular-editor',NiakModularEditor);
  window.customCards=window.customCards||[];
  for(const [format,name,description] of FORMATS){
    const tag=`niak-weather-modular-${format}-card`;
    if(!customElements.get(tag))customElements.define(tag,class extends NiakModularCard {
      static getStubConfig(){return {type:`custom:${ELEMENT}`,format};}
      setConfig(config){super.setConfig({format,...config});}
    });
    if(!window.customCards.some(x=>x.type===tag))window.customCards.push({type:tag,name:`Niak Modular · ${name}`,description,preview:true});
  }
  for(const legacy of Object.keys(LEGACY)){
    const tag=`niak-weather-modular-${legacy}-card`;
    if(!customElements.get(tag))customElements.define(tag,class extends NiakModularCard{
      static getStubConfig(){return {type:`custom:${ELEMENT}`,format:legacy};}
      setConfig(config){super.setConfig({format:legacy,...config});}
    });
  }
  console.info(`%cNIAK WEATHER MODULAR%c ${VERSION}`,'color:#8798d2;font-weight:bold','color:inherit');
})();