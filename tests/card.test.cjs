const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

const script = fs.readFileSync(path.join(__dirname, '..','src','niak-weather-modular-card.js'),'utf8');
const registered = new Map();
class HTMLElementMock {
  constructor() { this.isConnected = true; this.shadowRoot=null; this.events=[]; }
  attachShadow() {
    this.shadowRoot = {innerHTML:'', addEventListener(){}, querySelectorAll(){return [];}};
    return this.shadowRoot;
  }
  dispatchEvent(event) { this.events.push(event); return true; }
}
const ctx = {HTMLElement:HTMLElementMock, customElements:{get:(n)=>registered.get(n),define:(n,v)=>registered.set(n,v)},window:{customCards:[]},console:{info(){}},document:{createElement(tag){return new (registered.get(tag))();}},CustomEvent:class {constructor(type,init){this.type=type;this.detail=init?.detail;}},Intl,Date,Number,Math,Set,Array,URL};
vm.runInNewContext(script,ctx,{timeout:2500});
const Card=registered.get('niak-weather-modular-card');

const t=Math.floor(Date.now()/1000),series=(base)=>Array.from({length:18},(_,i)=>[t-(17-i)*600,base+(i%4)]);
const forecast=Array.from({length:18},(_,i)=>({hour:(8+i)%24,day:Math.floor((8+i)/24),temperature:10+i/2,precipitation:i%3?0:0.4,wind:3+i%4,icon:'mdi:weather-cloudy',conditionLabel:'Couvert'}));
const view={
 location:'Grenoble',dateLabel:'dimanche 25 octobre',provider:'Météo-France',forecastSource:'Météo-France',weatherEntity:'weather.maison',
 now:{condition:'cloudy',phase:'day',label:'Nuageux',icon:'mdi:weather-cloudy',temperature:18,source:'Station locale',trend:0.2},
 season:{info:{season:'autumn',icon:'mdi:leaf'},news:'Automne'},
 alerts:[],points:[{label:'Pluie',text:'Pluie dans 2 h',icon:'mdi:weather-rainy',clock:'17 h'}],
 bulletin:{summary:'Quelques nuages cet après-midi.',periods:[{label:'Ce soir',icon:'mdi:weather-night',text:'Temps sec'}]},
 extras:[{theme:'level1',icon:'mdi:solar-power-variant-outline',value:'0 W/m²',label:'soleil',entity:'sensor.solar'},{theme:'level1',icon:'mdi:sun-wireless-outline',value:'0',label:'UV faible',entity:'sensor.uv'},{theme:'level1',icon:'mdi:brightness-5',value:'10',label:'lux',entity:'sensor.lux'},{theme:'rain',icon:'mdi:water-percent',value:'94 %',label:'humidité',entity:'sensor.humidity'},{theme:'cold',icon:'mdi:thermometer-water',value:'9,9 °C',label:'rosée',entity:'sensor.dew_point'},{theme:'level1',icon:'mdi:flower-pollen',value:'Pollen',label:'faible',entity:'sensor.pollen'}],
 comfort:{feels:17,temperature:18,word:'Frais',humidity:'62 %',source:'Station locale',gap:-1,factors:[{icon:'mdi:weather-windy',label:'Vent'}],example:'17 °C ressentis'},
 rain:{source:'Station locale',value:0,unit:'mm',label:'Aujourd’hui',days:[{label:'Lun',value:1},{label:'Mar',value:0.3}],stats:[{label:'Hier',value:'2 mm'}]},
 wind:{source:'Station locale',value:3,label:'Vent moyen',description:'Très légère brise',bearing:74,mean:series(2),gust:series(5),top:20,meanLabel:'Vent moyen',stats:[{label:'Rafales',value:'8 km/h'}]},
 pressure:{source:'Station locale',value:1018,description:'Stable',series:series(1014),low:1008,top:1025,stats:[{label:'Minimum',value:'1014 hPa'}]},
 hours:forecast,days:Array.from({length:7},(_,i)=>({label:'J'+i,low:6+i,high:15+i,rain:2,wind:10,icon:'mdi:weather-sunny'})),
 air:{today:[{kind:'pollen',scale:6,zone:'Isère',source:'Atmo France',primary:{value:2,label:'Faible'},details:[{label:'Graminées',reading:{label:'Faible',value:2}}]},{kind:'air',scale:6,source:'Atmo France',primary:{value:3,label:'Moyen'},details:[]}],tomorrow:[{kind:'pollen',scale:6,source:'Atmo France',primary:{value:3,label:'Moyen'},details:[]}]},
};

test('les textes météo sont échappés dans le HTML',()=>{
  const c=new Card();c.setConfig({format:'overview'});
  c._view={...view,bulletin:{summary:'<img src=x onerror=alert(1)>'}};c._render();
  assert.ok(c.shadowRoot.innerHTML.includes('&lt;img'));
  assert.ok(!c.shadowRoot.innerHTML.includes('<img src=x'));
});

test('la carte consomme la commande websocket officielle version 1',async()=>{
  let requested,callback;
  const c=new Card();c.setConfig({format:'overview'});
  c.hass={connection:{subscribeMessage(cb,msg){callback=cb;requested=msg;return Promise.resolve(()=>{});}}};
  assert.equal(requested.type,'hestia_weather/subscribe');
  callback({version:1,view});
  assert.match(c.shadowRoot.innerHTML,/Nuageux/);
  await Promise.resolve();c.disconnectedCallback();
});

test('repli sur l’ancien domaine niak_weather si hestia_weather est inconnu',async()=>{
  const asked=[];let callback;
  const c=new Card();c.setConfig({format:'overview'});
  c.hass={connection:{subscribeMessage(cb,msg){asked.push(msg.type);if(msg.type==='hestia_weather/subscribe')return Promise.reject({code:'unknown_command'});callback=cb;return Promise.resolve(()=>{});}}};
  await new Promise(r=>setTimeout(r,0));
  assert.deepEqual(asked,['hestia_weather/subscribe','niak_weather/subscribe']);
  callback({version:1,view});
  assert.match(c.shadowRoot.innerHTML,/Nuageux/);
  c.disconnectedCallback();
});

test('éditeur visuel déclaré',()=>{
  const el=Card.getConfigElement();el.setConfig({format:'overview'});
  assert.ok(el.shadowRoot.innerHTML.includes('Type de carte'));
  assert.ok(el.shadowRoot.innerHTML.includes('Afficher le bulletin du jour'));
  assert.ok(el.shadowRoot.innerHTML.includes('Afficher la source'));
});


test('fond semi-transparent par défaut, thème et transparent configurables',()=>{
  for(const [mode,expected] of [[undefined,'bg-glass'],['glass','bg-glass'],['theme','bg-theme'],['transparent','bg-transparent']]) {
    const c=new Card();c.setConfig({format:'overview',...(mode?{background_mode:mode}:{})});c._view=view;c._render();
    assert.match(c.shadowRoot.innerHTML,new RegExp('<ha-card class="'+expected+' '));
  }
  assert.match(script,/backdrop-filter:blur\(12px\)/);
  assert.match(script,/--nw-card-surface:transparent/);
  assert.match(script,/--nw-bg:var\(--ha-card-background/);
});

test('l’éditeur propose les trois modes de fond',()=>{
  const el=Card.getConfigElement();el.setConfig({format:'overview',background_mode:'theme'});
  assert.match(el.shadowRoot.innerHTML,/Verre dépoli/);
  assert.match(el.shadowRoot.innerHTML,/Thème Home Assistant/);
  assert.match(el.shadowRoot.innerHTML,/Transparent \(sans fond\)/);
  assert.match(el.shadowRoot.innerHTML,/value="theme" selected/);
});


test('la frise garde son instance et son défilement entre deux mises à jour météo',()=>{
  // Simule l’élément Lit Niak déjà chargé par l’intégration officielle.
  if(!registered.get('hestia-frise'))registered.set('hestia-frise',class {});
  const card=new Card();card.setConfig({format:'overview',show_events:true});card._view=view;card._render();
  const markup=card.shadowRoot.innerHTML;
  const frise={points:[],alerts:[],hours:[],timeline:undefined};
  card.shadowRoot.querySelectorAll=selector=>selector==='hestia-frise,niak-frise'?[frise]:[];
  const nextPoints=[...view.points,{label:'Vent',text:'Rafales ce soir',icon:'mdi:weather-windy',clock:'20 h'}];
  card._view={...view,points:nextPoints};
  card._render();
  assert.equal(card.shadowRoot.innerHTML,markup,'La DOM de la frise ne doit pas être recréée');
  assert.equal(frise.points,nextPoints,'Les données doivent être actualisées sur la même instance');
});

test('la frise reprend la charte CSS de Niak Weather',()=>{
  assert.match(script,/--nw-glass-clear:/);
  assert.match(script,/--nw-glass-strong:/);
  assert.match(script,/--nw-frost:/);
  assert.match(script,/--nw-fs-label:/);
  assert.match(script,/--nw-level3:/);
  assert.match(script,/--nw-radius-pill:/);
  assert.match(script,/label\('Événements'\)/);
});


test('Lune : fonctionne sans WebSocket Niak Weather, avec les attributs Lunar Phase',()=>{
  const moon={state:'waxing_crescent',attributes:{
    friendly_name:'Phase de la lune',illumination_fraction:34.5,moon_age:7.9,moon_distance_km:392456,
    moonrise:'2026-10-25T13:30:00+01:00',moonset:'2026-10-25T23:00:00+01:00',
    next_full_moon:'2026-11-03T12:00:00+01:00',next_new_moon:'2026-11-17T12:00:00+01:00',
    moon_altitude_deg:23,moon_azimuth_deg:137
  }};
  let subscribed=0;
  const card=new Card();card.setConfig({format:'moon',background_mode:'glass'});
  card.hass={states:{'sensor.lunar_phase_moon_phase':moon},connection:{subscribeMessage(){subscribed++;return Promise.resolve(()=>{});}}};
  const html=card.shadowRoot.innerHTML.slice(card.shadowRoot.innerHTML.indexOf('<ha-card'));
  assert.equal(subscribed,0,'La carte Lune ne doit pas s’abonner au flux météo Niak');
  assert.match(html,/Premier croissant/);
  assert.match(html,/34,5/);
  assert.match(html,/392[\s\u202f]?456/);
  assert.match(html,/moon-disk/);
  assert.match(html,/moonrise|Lever/);
  assert.match(html,/Pleine lune/);
});
test('Lune : hémisphère sud, position droite et options masquables',()=>{
  const card=new Card();
  card.setConfig({format:'moon',moon_entity:'sensor.custom_moon',moon_position:'right',
    moon_southern_hemisphere:true,show_title:false,show_date:false,show_source:false,
    show_stats:false,show_details:false,show_chart:true});
  card.hass={states:{'sensor.custom_moon':{state:'waning_gibbous',attributes:{moon_age:19,illumination_fraction:73}}}};
  let html=card.shadowRoot.innerHTML.slice(card.shadowRoot.innerHTML.indexOf('<ha-card'));
  assert.match(html,/Gibbeuse décroissante/);
  assert.match(html,/moon-right/);
  assert.match(html,/rotate\(180deg\)/);
  assert.doesNotMatch(html,/class="moon-stats"/);
  assert.doesNotMatch(html,/class="moon-future"/);
  assert.doesNotMatch(html,/<strong>Lune<\/strong>/);
  assert.doesNotMatch(html,/Lunar Phase<\/span>/);
  assert.doesNotMatch(html,/moon-current-date/);
});
test('Lune : absence de capteur et valeurs nulles gérées sans fausses informations',()=>{
  const card=new Card();card.setConfig({format:'moon'});card.hass={states:{}};
  assert.match(card.shadowRoot.innerHTML,/Capteur Lunar Phase introuvable/);
  card.hass={states:{'sensor.moon_phase':{state:'new_moon',attributes:{moon_age:0,illumination_fraction:0,moon_distance_km:0}}}};
  const html=card.shadowRoot.innerHTML.slice(card.shadowRoot.innerHTML.indexOf('<ha-card'));
  assert.match(html,/Nouvelle lune/);
  assert.match(html,/0 %/);
  assert.doesNotMatch(html,/NaN/);
});
test('Lune : l’éditeur expose le capteur et sa disposition',()=>{
  const ed=Card.getConfigElement();ed.setConfig({format:'moon'});
  ed.hass={connection:{},states:{'sensor.phase_moon':{attributes:{moon_age:5,illumination_fraction:12,friendly_name:'Phase de la lune'}}}};
  const html=ed.shadowRoot.innerHTML;
  assert.match(html,/Détection automatique/);
  assert.match(html,/sensor.phase_moon/);
  assert.match(html,/Position de la lune/);
  assert.match(html,/Hémisphère sud/);
});


test('refonte : synthèse unique, température décimale, min/max, tendance et bulletin',()=>{
 const card=new Card();card.setConfig({format:'overview',show_events:false});
 card._view={...view,now:{...view.now,temperature:13.3,trend:2.4},days:[{today:true,low:8,high:13}],bulletin:{summary:'Pluie ce soir jusqu’à 21 h.'}};
 card._render();const html=card.shadowRoot.innerHTML.slice(card.shadowRoot.innerHTML.indexOf('<ha-card'));
 assert.match(html,/13,3/);assert.match(html,/↓ 8°/);assert.match(html,/↑ 13°/);assert.match(html,/\+2,4 °C\/h/);
 assert.match(html,/Bulletin du jour/);assert.match(html,/Pluie ce soir/);
});
test('refonte : options de la synthèse et anciens formats rétrocompatibles',()=>{
 const card=new Card();card.setConfig({format:'summary',show_bulletin:false,show_temp_range:false,show_temp_trend:false,show_date:false});
 card._view=view;card._render();const html=card.shadowRoot.innerHTML.slice(card.shadowRoot.innerHTML.indexOf('<ha-card'));
 assert.match(html,/ov-now/);assert.doesNotMatch(html,/ov-bulletin|ov-range|ov-trend/);
 const old=new Card();old.setConfig({format:'uv'});old._view=view;old._render();
 assert.match(old.shadowRoot.innerHTML,/hestia-weather-card/);
 assert.ok(!ctx.window.customCards.some(x=>/-uv-card$|-solar-card$|-current-card$|-summary-card$/.test(x.type)));
});
test('Lune : images originales, personnalisées et SVG avec repli',()=>{
 const moon={state:'waxing_crescent',attributes:{moon_age:7.9,illumination_fraction:34}};
 const card=new Card();card.setConfig({format:'moon',moon_visual_mode:'original'});
 card.hass={states:{'sensor.lunar_phase':moon}};
 let html=card.shadowRoot.innerHTML.slice(card.shadowRoot.innerHTML.indexOf('<ha-card'));
 assert.match(html,/cdn.jsdelivr.net\/gh\/ngocjohn\/lunar-phase-card@1.14.0\/moon_pic\/8_moon.png/);
 assert.match(html,/moon-fallback/);
 card.setConfig({format:'moon',moon_visual_mode:'svg',moon_image_url:'/local/moon/{index}_moon.svg'});
 html=card.shadowRoot.innerHTML.slice(card.shadowRoot.innerHTML.indexOf('<ha-card'));
 assert.match(html,/\/local\/moon\/8_moon.svg/);
 card.setConfig({format:'moon',moon_visual_mode:'generated'});
 html=card.shadowRoot.innerHTML.slice(card.shadowRoot.innerHTML.indexOf('<ha-card'));
 assert.doesNotMatch(html,/class="moon-photo"/);assert.match(html,/moon-disk/);
});


test('Synthèse : température à droite par défaut, bloc complet inchangé',()=>{
  const c=new Card();c.setConfig({format:'overview'});
  c._view={...view,now:{...view.now,temperature:13.3,trend:2.4},
    days:[{today:true,low:8,high:13}],bulletin:{summary:'Bulletin test'}};
  c._render();
  const html=c.shadowRoot.innerHTML.slice(c.shadowRoot.innerHTML.indexOf('<ha-card'));
  assert.match(html,/ov-grid layout-compact temp-right/);
  const block=html.match(/<div class="ov-now">[\s\S]*?<\/div><\/div><\/section>/);
  assert.match(html,/13,3/);assert.match(html,/↓ 8°/);
  assert.match(html,/↑ 13°/);assert.match(html,/\+2,4 °C\/h/);
});

test('Synthèse : température à gauche sans séparer valeur, min\/max, tendance et source',()=>{
  const c=new Card();c.setConfig({format:'overview',temperature_position:'left'});
  c._view={...view,now:{...view.now,temperature:13.3,trend:2.4,temperatureSource:'Station locale'},
    days:[{today:true,low:8,high:13}],bulletin:{summary:'Bulletin test'}};
  c._render();
  const html=c.shadowRoot.innerHTML.slice(c.shadowRoot.innerHTML.indexOf('<ha-card'));
  assert.match(html,/ov-grid layout-compact temp-left/);
  const from=html.indexOf('<div class="ov-now">');
  assert.ok(from>0);
  const block=html.slice(from,from+1500);
  assert.match(block,/13,3/);assert.match(block,/↓ 8°/);
  assert.match(block,/↑ 13°/);assert.match(block,/\+2,4 °C\/h/);
  assert.match(block,/Station locale/);
  assert.match(html,/ov-bulletin/);
});

test('Synthèse : position du bloc température proposée dans l’éditeur',()=>{
  const editor=Card.getConfigElement();editor.setConfig({format:'overview',temperature_position:'left'});
  const html=editor.shadowRoot.innerHTML;
  assert.match(html,/Position du bloc température/);
  assert.match(html,/name="temperature_position"/);
  assert.match(html,/value="left" selected/);
  assert.match(html,/Droite \(par défaut\)/);
});


test('Synthèse : choix gauche/droite déplace vraiment le bloc dans le DOM',()=>{
  const weather={...view,now:{...view.now,temperature:13.3,trend:2.4},days:[{today:true,low:8,high:13}],bulletin:{summary:'Bulletin test'}};
  for(const [side,tempFirst] of [['left',true],['right',false]]){
    const card=new Card();card.setConfig({format:'overview',temperature_position:side});card._view=weather;card._render();
    const html=card.shadowRoot.innerHTML.slice(card.shadowRoot.innerHTML.indexOf('<ha-card'));
    const temp=html.indexOf('<div class="ov-now">'),bulletin=html.indexOf('<div class="ov-copy">');
    assert.ok(temp>-1&&bulletin>-1);
    assert.equal(temp<bulletin,tempFirst,"Ordre des blocs : "+side);
    assert.match(html,new RegExp('ov-grid layout-compact temp-'+side));
    assert.match(html,/13,3/);assert.match(html,/↓ 8°/);assert.match(html,/↑ 13°/);assert.match(html,/\+2,4 °C\/h/);
  }
});

test('Synthèse : les deux positions sont maintenues dans la règle responsive',()=>{
  const start=script.indexOf('@container(max-width:630px)'),end=script.indexOf('@container(max-width:350px)');
  assert.ok(start>0&&end>start);
  const css=script.slice(start,end);
  assert.match(css,/\.ov-grid\.temp-left\{grid-template-columns:minmax\(130px,44%\)/);
  assert.match(css,/\.ov-grid\.temp-right \.ov-now\{grid-column:2;grid-row:1/);
  assert.match(css,/\.ov-grid\.temp-left \.ov-now\{grid-column:1;grid-row:1/);
  assert.doesNotMatch(css,/\.ov-grid\{grid-template-columns:1fr/);
});


test('Synthèse : compact (par défaut) conserve la répartition sur une rangée',()=>{
  const card=new Card();card.setConfig({format:'overview',temperature_position:'right'});
  card._view={...view,bulletin:{summary:'Bulletin de test'},now:{...view.now,temperature:13.5}};
  card._render();const html=card.shadowRoot.innerHTML.slice(card.shadowRoot.innerHTML.indexOf('<ha-card'));
  assert.match(html,/ov-grid layout-compact temp-right/);
  assert.ok(html.indexOf('<div class="ov-copy">')<html.indexOf('<div class="ov-now">'));
});

test('Synthèse : mode classique affiche le bulletin sous la température à gauche ou droite',()=>{
  for(const side of ['left','right']){
    const card=new Card();card.setConfig({format:'overview',overview_layout:'classic',temperature_position:side});
    card._view={...view,now:{...view.now,temperature:13.5,trend:0.1},days:[{today:true,low:8,high:13}],bulletin:{summary:'Bulletin sous la température'}};
    card._render();const html=card.shadowRoot.innerHTML.slice(card.shadowRoot.innerHTML.indexOf('<ha-card'));
    assert.match(html,new RegExp('ov-grid layout-classic temp-'+side));
    assert.ok(html.indexOf('<div class="ov-now">')<html.indexOf('<div class="ov-copy">'));
    assert.match(html,/13,5/);assert.match(html,/↓ 8°/);assert.match(html,/↑ 13°/);assert.match(html,/\+0,1 °C\/h/);
    assert.match(html,/Bulletin sous la température/);
  }
});

test('Synthèse : éditeur propose les deux dispositions indépendamment de gauche/droite',()=>{
  const editor=Card.getConfigElement();editor.setConfig({format:'overview',overview_layout:'classic',temperature_position:'left'});
  const html=editor.shadowRoot.innerHTML;
  assert.match(html,/name="overview_layout"/);
  assert.match(html,/value="classic" selected/);
  assert.match(html,/name="temperature_position"/);
  assert.match(html,/value="left" selected/);
  const start=script.indexOf('.ov-grid.layout-classic{display:flex;flex-direction:column');
  assert.ok(start>=0);
  assert.match(script.slice(start,start+1600),/\.ov-grid\.layout-classic\.temp-right \.ov-now\{align-self:flex-end/);
  assert.match(script,/\.ov-grid\.layout-classic\{display:flex;flex-direction:column/);
  assert.match(script,/\.ov-grid\.layout-classic \.ov-copy\{width:100%;grid-column:auto;grid-row:auto/);
});


test('Soleil : capteurs réels, durée en minutes, date explicite des prochains événements',()=>{
  const card=new Card();card.setConfig({format:'sun-home',show_source:true,sun_show_diagram:false});
  card.hass={states:{
    'sensor.difference_de_soleil':{state:'-7',attributes:{}},
    'sensor.sunterrasse_sun_duration':{state:'725',attributes:{}},
    'sun.sun':{state:'below_horizon',attributes:{
      next_dawn:'2026-10-26T05:24:00Z',next_rising:'2026-10-26T06:08:00Z',
      next_setting:'2026-10-26T17:00:00Z',next_dusk:'2026-10-26T17:43:00Z'
    }}
  }};
  const html=card.shadowRoot.innerHTML;
  assert.match(html,/Soleil & Ensoleillement/);
  assert.match(html,/−7 min/);
  assert.match(html,/12h05/);
  assert.match(html,/Aube/);assert.match(html,/Lever/);assert.match(html,/Coucher/);assert.match(html,/Crépuscule/);
  assert.doesNotMatch(html.slice(html.indexOf('<ha-card')),/<solar-mask-card/);
});
test('Soleil : durée manquante non inventée, masque solaire demandé si capteur absent',()=>{
  const card=new Card();card.setConfig({format:'sun-home'});
  card.hass={states:{'sun.sun':{state:'above_horizon',attributes:{}}}};
  const html=card.shadowRoot.innerHTML;
  assert.match(html,/Installez Solar Mask Card/);
  assert.match(html,/—/);assert.doesNotMatch(html,/NaN/);
});
test('Radars : aucune URL par défaut, donc aucun iframe ni adresse imposée',()=>{
  const card=new Card();card.setConfig({format:'radars'});
  card.hass={states:{}};
  const html=card.shadowRoot.innerHTML;
  assert.match(html,/Aucune URL n’est définie par défaut/);
  assert.equal((html.match(/<iframe/g)||[]).length,0);
  assert.doesNotMatch(html,/meteo-grenoble|rain-map|https:\/\/[^"]+radar/);
});
test('Radars : URLs distinctes, intégration sécurisée et affichage en onglets',()=>{
  const card=new Card();card.setConfig({format:'radars',radar_layout:'tabs',radar_height:380,
    radar_url_current:'https://www.meteo-grenoble.com/rain-map?type=now',
    radar_url_forecast:'https://www.meteo-grenoble.com/rain-map?type=forecasts'});
  card.hass={states:{}};
  const html=card.shadowRoot.innerHTML;
  assert.equal((html.match(/<iframe/g)||[]).length,2);
  assert.match(html,/rain-map\?type=now/);
  assert.match(html,/rain-map\?type=forecasts/);
  assert.match(html,/height:380px/);assert.match(html,/sandbox="allow-scripts/);
  assert.match(html,/radar-grid radar-tabs/);
});
test('Radars : schémas dangereux non insérés dans le tableau de bord',()=>{
  const card=new Card();card.setConfig({format:'radars',
    radar_url_current:'javascript:alert(1)',radar_url_forecast:'data:text/html,<script>alert(1)</script>'});
  card.hass={states:{}};
  assert.doesNotMatch(card.shadowRoot.innerHTML,/<iframe/);
  assert.doesNotMatch(card.shadowRoot.innerHTML,/javascript:alert/);
});
test('Éditeur : Soleil et Radars configurables, sans URL préremplie',()=>{
  const sun=Card.getConfigElement();sun.setConfig({format:'sun-home'});
  for(const id of ['sun_difference_entity','sun_duration_entity','sun_diagram_entity',
      'sun_elevation_entity','sun_show_times','sun_show_diagram'])
    assert.match(sun.shadowRoot.innerHTML,new RegExp('name="'+id+'"'));
  const radar=Card.getConfigElement();radar.setConfig({format:'radars'});
  for(const id of ['radar_url_current','radar_url_forecast','radar_layout','radar_height'])
    assert.match(radar.shadowRoot.innerHTML,new RegExp('name="'+id+'"'));
  assert.doesNotMatch(radar.shadowRoot.innerHTML,/value="https:\/\/www\.meteo-grenoble/);
});
test('Soleil : mode détaillé facultatif conserve la taille du graphique',()=>{
  const c=new Card();c.setConfig({format:'sun-home',sun_compact:false});
  c.hass={states:{'sun.sun':{state:'above_horizon',attributes:{}}}};
  const html=c.shadowRoot.innerHTML.slice(c.shadowRoot.innerHTML.indexOf('<ha-card'));
  assert.match(html,/class="inner sun-home"/);
  assert.doesNotMatch(html,/sun-home sun-compact/);
});
test('Soleil : éditeur propose taille compacte et graphique Solar Mask',()=>{
  const e=Card.getConfigElement();e.setConfig({format:'sun-home'});
  const html=e.shadowRoot.innerHTML;
  assert.match(html,/name="sun_compact"/);
  assert.match(html,/Afficher la carte Solar Mask/);
  assert.match(html,/Hauteur du diagramme/);
});


test('Solar Mask : suppression de bordure indépendante du mode compact',()=>{
  const originalCreate=ctx.document.createElement;
  ctx.document.createElement=(name)=>name==='style'?{id:'',textContent:''}:originalCreate(name);
  try{
    const c=new Card();c.setConfig({format:'sun-home',sun_mask_border:false});
    let style=null;
    const node={setConfig(){},shadowRoot:{
      querySelector(){return style;},appendChild(s){style=s;},
    },set hass(x){}};
    c.shadowRoot.querySelector=()=>node;
    c._hass={states:{'sensor.terrasse_solar_diagram':{state:'ok'}}};
    c._config.sun_diagram_entity='sensor.terrasse_solar_diagram';
    c._updateSolarChart();
    assert.match(style.textContent,/border:0!important/);
    assert.match(style.textContent,/background:transparent!important/);
    c._config.sun_mask_border=true;c._updateSolarChart();
    assert.doesNotMatch(style.textContent,/border:0!important/);
  }finally{ctx.document.createElement=originalCreate;}
});
test('Radars : sous-titres redondants absents, iframes toujours accessibles',()=>{
  const c=new Card();c.setConfig({format:'radars',radar_layout:'stack',
    radar_url_current:'https://example.org/radar',
    radar_url_forecast:'https://example.org/forecast'});
  c.hass={states:{}};
  const html=c.shadowRoot.innerHTML.slice(c.shadowRoot.innerHTML.indexOf('<ha-card'));
  assert.equal((html.match(/<iframe/g)||[]).length,2);
  assert.doesNotMatch(html,/<strong>Radar actuel<\/strong>|<strong>Prévisions de pluie<\/strong>/);
  assert.match(html,/title="Radar actuel"/);
  assert.match(html,/title="Prévisions de pluie"/);
});

test('Solar Mask : titre masqué, fond SVG transparent, courbes non modifiées',()=>{
  const create=ctx.document.createElement;
  ctx.document.createElement=(name)=>name==='style'?{id:'',textContent:''}:create(name);
  try{
    const c=new Card();c.setConfig({format:'sun-home',sun_mask_border:true});
    let style=null,config=null;
    const node={setConfig(cfg){config=cfg;},shadowRoot:{querySelector(){return style;},appendChild(s){style=s;}},set hass(x){}};
    c.shadowRoot.querySelector=()=>node;
    c._hass={states:{'sensor.terrasse_solar_diagram':{state:'ok'}}};
    c._config.sun_diagram_entity='sensor.terrasse_solar_diagram';
    c._updateSolarChart();
    assert.equal(config.height,240);
    assert.match(style.textContent,/\.card-header,#title\{display:none!important\}/);
    assert.match(style.textContent,/#chart-container svg>rect\{fill:transparent!important\}/);
    assert.doesNotMatch(style.textContent,/ha-card\{border:0!important/);
    c._config.sun_mask_border=false;c._updateSolarChart();
    assert.match(style.textContent,/ha-card\{border:0!important/);
    assert.match(style.textContent,/#chart-container svg>rect\{fill:transparent!important\}/);
  }finally{ctx.document.createElement=create;}
});

test('Soleil compact : indicateurs réduits, Solar Mask conservé',()=>{
  const existing=registered.get('solar-mask-card');registered.set('solar-mask-card',class {});
  try{
    const c=new Card();c.setConfig({format:'sun-home',sun_diagram_entity:'sensor.terrasse_solar_diagram'});
    c.hass={states:{'sensor.terrasse_solar_diagram':{state:'available',attributes:{}},
      'sensor.difference_de_soleil':{state:'-3',attributes:{}},
      'sensor.sunterrasse_sun_duration':{state:'390',attributes:{}},
      'sun.sun':{state:'above_horizon',attributes:{}}}};
    const html=c.shadowRoot.innerHTML.slice(c.shadowRoot.innerHTML.indexOf('<ha-card'));
    assert.match(html,/sun-home sun-compact/);
    assert.match(html,/−3 min/);assert.match(html,/6h30/);
    assert.match(html,/<solar-mask-card><\/solar-mask-card>/);
    assert.equal(c.getGridOptions().columns,4);
    assert.match(script,/\.sun-compact \.sun-metric b\{font-size:17px/);
    assert.match(script,/c\.sun_compact===false\?620:260/);
  }finally{if(existing)registered.set('solar-mask-card',existing);else registered.delete('solar-mask-card');}
});

test('Soleil : indicateurs allégés sans fond coloré ni sous-texte',()=>{
  const c=new Card();c.setConfig({format:'sun-home'});
  c.hass={states:{
    'sun.sun':{state:'above_horizon',attributes:{}},
    'sensor.difference_de_soleil':{state:'-3',attributes:{}},
    'sensor.sunterrasse_sun_duration':{state:'380',attributes:{}}
  }};
  const html=c.shadowRoot.innerHTML.slice(c.shadowRoot.innerHTML.indexOf('<ha-card'));
  assert.match(html,/Évolution du jour/);assert.match(html,/Ensoleillement de la maison/);
  assert.doesNotMatch(html,/Durée gagnée ou perdue|Durée de la zone mesurée/);
  assert.match(script,/\.sun-metric\{[^}]*background:transparent/);
  assert.match(script,/\.sun-compact \.sun-metric b\{font-size:17px/);
});

test('add-on : seulement Synthèse, Lune, Soleil et Radars dans le sélecteur',()=>{
  assert.deepEqual(ctx.window.customCards.map(x=>x.type).sort(),
    ['niak-weather-modular-moon-card','niak-weather-modular-overview-card','niak-weather-modular-radars-card','niak-weather-modular-sun-home-card']);
});

test('anciens formats : message clair vers la carte hestia-weather-card, sans erreur',()=>{
  for(const f of ['full','wind','rain','pressure','air','pollen','hours','days','comfort','extras','bulletin','events']){
    const c=new Card();c.setConfig({format:f});c._render();
    assert.match(c.shadowRoot.innerHTML,/hestia-weather-card/,f);
    assert.ok(registered.get('niak-weather-modular-'+f+'-card'),f);
  }
  assert.throws(()=>new Card().setConfig({format:'inconnu'}));
});

test('thème : couleurs Hestia Weather en priorité, anciennes variables Niak en repli',()=>{
  assert.match(script,/--nw-wind:var\(--hestia-wind-color,var\(--niak-wind-color,#8798d2\)\)/);
  assert.match(script,/--nw-heat:var\(--hestia-heat-color,var\(--niak-heat-color,/);
});

test('Synthèse : le ciel animé et la frise de l’intégration Hestia sont reconnus',()=>{
  registered.set('hestia-weather-sky',class {});
  const c=new Card();c.setConfig({format:'overview',show_events:true});c._view=view;c._render();
  assert.match(c.shadowRoot.innerHTML,/<hestia-weather-sky><\/hestia-weather-sky>/);
  assert.match(c.shadowRoot.innerHTML,/<hestia-frise><\/hestia-frise>/);
});

test('Synthèse seule : les autres cartes ne s’abonnent pas au flux météo',()=>{
  let called=0;
  for(const format of ['moon','sun-home','radars']){
    const c=new Card();c.setConfig({format});c.hass={states:{},connection:{subscribeMessage(){called++;return Promise.resolve(()=>{});}}};
  }
  assert.equal(called,0);
});

test('overview shows the events timeline by default', () => {
  const c=new Card();c.setConfig({format:'overview'});c._view=view;c._render();
  assert.ok(c.shadowRoot.innerHTML.includes('ov-events'));
});
