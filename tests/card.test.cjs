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

test('les 13 formats sont déclarés dans le sélecteur Home Assistant',()=>{
  assert.equal(ctx.window.customCards.length,17);
  for(const {type} of ctx.window.customCards) assert.ok(registered.get(type));
});

test('chaque format produit un rendu autonome sans erreur',()=>{
  for(const f of ['summary','current','bulletin','events','comfort','extras','solar','uv','lux','humidity','dew','rain','wind','pressure','pollen','hours','days','pollen-forecast','air','moon','sun-home','radars']){
    const c=new Card(); c.setConfig({type:'custom:niak-weather-modular-card',format:f}); c._view=view;c._render();
    assert.ok(!c.shadowRoot.innerHTML.includes('Erreur d’affichage :'),f);
    assert.ok(c.shadowRoot.innerHTML.includes('<ha-card'),f);
    assert.ok(c.shadowRoot.innerHTML.includes('</ha-card>'),f);
    assert.ok(!c.shadowRoot.innerHTML.includes('Aujourd’hui – Mesures et ressenti'),f);
  }
});

test('vent indépendant : titre/source masquables et mesures présentes',()=>{
  const c=new Card();c.setConfig({format:'wind',show_title:false,show_source:false});c._view=view;c._render();
  const out=c.shadowRoot.innerHTML;
  assert.ok(out.includes('km/h'));
  assert.ok(out.includes('Rafales'));
  assert.ok(!out.includes('<strong>Vent</strong>'));
  assert.ok(!out.includes('Station locale'));
});

test('les prévisions pollens utilisent demain, pas aujourd’hui',()=>{
  const c=new Card();c.setConfig({format:'pollen-forecast'});c._view=view;c._render();
  assert.ok(c.shadowRoot.innerHTML.includes('Indice de demain'));
  assert.ok(!c.shadowRoot.innerHTML.includes('Graminées'));
});

test('les textes météo sont échappés dans le HTML',()=>{
  const c=new Card();c.setConfig({format:'bulletin'});
  c._view={...view,bulletin:{summary:'<img src=x onerror=alert(1)>'}};c._render();
  assert.ok(c.shadowRoot.innerHTML.includes('&lt;img'));
  assert.ok(!c.shadowRoot.innerHTML.includes('<img src=x'));
});

test('la carte consomme la commande websocket officielle version 1',async()=>{
  let requested,callback;
  const c=new Card();c.setConfig({format:'pressure'});
  c.hass={connection:{subscribeMessage(cb,msg){callback=cb;requested=msg;return Promise.resolve(()=>{});}}};
  assert.equal(requested.type,'niak_weather/subscribe');
  callback({version:1,view});
  assert.match(c.shadowRoot.innerHTML,/1[\u202f\s]?018/);
  await Promise.resolve();c.disconnectedCallback();
});

test('éditeur visuel déclaré',()=>{
  const el=Card.getConfigElement();el.setConfig({format:'overview'});
  assert.ok(el.shadowRoot.innerHTML.includes('Type de carte'));
  assert.ok(el.shadowRoot.innerHTML.includes('Afficher le bulletin du jour'));
  assert.ok(el.shadowRoot.innerHTML.includes('Afficher la source'));
});


test('fond semi-transparent par défaut, thème et transparent configurables',()=>{
  for(const [mode,expected] of [[undefined,'bg-glass'],['glass','bg-glass'],['theme','bg-theme'],['transparent','bg-transparent']]) {
    const c=new Card();c.setConfig({format:'wind',...(mode?{background_mode:mode}:{})});c._view=view;c._render();
    assert.match(c.shadowRoot.innerHTML,new RegExp('<ha-card class="'+expected+' '));
  }
  assert.match(script,/backdrop-filter:blur\(12px\)/);
  assert.match(script,/--nw-card-surface:transparent/);
  assert.match(script,/--nw-bg:var\(--ha-card-background/);
});

test('l’éditeur propose les trois modes de fond',()=>{
  const el=Card.getConfigElement();el.setConfig({format:'wind',background_mode:'theme'});
  assert.match(el.shadowRoot.innerHTML,/Verre dépoli/);
  assert.match(el.shadowRoot.innerHTML,/Thème Home Assistant/);
  assert.match(el.shadowRoot.innerHTML,/Transparent \(sans fond\)/);
  assert.match(el.shadowRoot.innerHTML,/value="theme" selected/);
});


test('la frise garde son instance et son défilement entre deux mises à jour météo',()=>{
  // Simule l’élément Lit Niak déjà chargé par l’intégration officielle.
  if(!registered.get('niak-frise'))registered.set('niak-frise',class {});
  const card=new Card();card.setConfig({format:'events'});card._view=view;card._render();
  const markup=card.shadowRoot.innerHTML;
  const frise={points:[],alerts:[],hours:[],timeline:undefined};
  card.shadowRoot.querySelectorAll=selector=>selector==='niak-frise'?[frise]:[];
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


test('ressenti individuel : jauge dégradée avec repères de température et valeur',()=>{
  const c=new Card();c.setConfig({format:'comfort'});c._view={...view,station:true};c._render();
  const out=c.shadowRoot.innerHTML;
  assert.match(out,/comfort-rail-line/);
  assert.match(out,/comfort-thermo" style="left:46%"/);
  assert.match(out,/comfort-feel" style="left:44%"/);
  assert.match(out,/−5°/);
  assert.match(out,/45°/);
  assert.match(out,/−1 °C par rapport au thermomètre/);
  assert.match(out,/Explication du ressenti/);
});

test('ressenti individuel : graphiques détails titre et source masquables',()=>{
  const c=new Card();c.setConfig({format:'comfort',show_title:false,show_source:false,show_chart:false,show_details:false});
  c._view={...view,station:true};c._render();
  const out=c.shadowRoot.innerHTML;
  const main=out.slice(out.indexOf('<ha-card'));
  assert.doesNotMatch(main,/comfort-rail-line/);
  assert.doesNotMatch(main,/Station locale/);
  assert.doesNotMatch(main,/<strong>Ressenti<\/strong>/);
  assert.doesNotMatch(main,/comfort-help/);
  assert.match(main,/km\/h|17/);
});

test('ressenti individuel : le repère thermomètre est optionnel',()=>{
  const c=new Card();c.setConfig({format:'comfort'});c._view={...view,comfort:{...view.comfort,temperature:undefined}};c._render();
  const main=c.shadowRoot.innerHTML.slice(c.shadowRoot.innerHTML.indexOf('<ha-card'));
  assert.match(main,/class="comfort-feel"/);
  assert.doesNotMatch(main,/class="comfort-thermo"/);
});


test('les 5 cartes indicateurs présentent uniquement leur mesure',()=>{
  for(const [format,needed,excluded] of [['solar','0 W/m²','94 %'],['uv','UV faible','9,9 °C'],['lux','lux','94 %'],['humidity','94 %','0 W/m²'],['dew','9,9 °C','94 %']]) {
    const c=new Card();c.setConfig({format});c._view=view;c._render();const v=c.shadowRoot.innerHTML.slice(c.shadowRoot.innerHTML.indexOf('<ha-card'));
    assert.ok(v.includes(needed),format);assert.ok(!v.includes(excluded),format);assert.ok(!v.includes('>Indicateurs<'),format);
  }
});

test('indicateurs groupés : 5 pastilles Niak, sans pollen dupliqué',()=>{
  const c=new Card();c.setConfig({format:'extras',background_mode:'transparent'});c._view=view;c._render();
  const v=c.shadowRoot.innerHTML.slice(c.shadowRoot.innerHTML.indexOf('<ha-card'));
  assert.equal((v.match(/class="extra-chip"/g)||[]).length,5);
  assert.ok(v.includes('sensor.solar'));assert.ok(v.includes('sensor.dew_point'));assert.ok(!v.includes('sensor.pollen'));
  assert.ok(v.includes('bg-transparent'));assert.ok(!v.includes('>Indicateurs<'));
});

test('indicateurs groupés : filtrer humidité et rosée',()=>{
  const c=new Card();c.setConfig({format:'extras',extras_blocks:['humidity','dew']});c._view=view;c._render();
  const v=c.shadowRoot.innerHTML.slice(c.shadowRoot.innerHTML.indexOf('<ha-card'));
  assert.equal((v.match(/class="extra-chip"/g)||[]).length,2);
  assert.ok(v.includes('94 %'));assert.ok(v.includes('9,9 °C'));assert.ok(!v.includes('solar-power'));
});

test('éditeur indicateurs et protection HTML',()=>{
  const ed=Card.getConfigElement();ed.setConfig({format:'extras',extras_blocks:['uv']});
  assert.match(ed.shadowRoot.innerHTML,/Indicateurs à afficher/);assert.match(ed.shadowRoot.innerHTML,/data-extra="1"/);
  assert.match(ed.shadowRoot.innerHTML,/value="uv" checked/);
  const c=new Card();c.setConfig({format:'solar'});c._view={...view,extras:[{theme:'level1',icon:'mdi:solar-power-variant-outline',value:'<script>alert(1)</script>',label:'soleil'}]};c._render();
  const v=c.shadowRoot.innerHTML.slice(c.shadowRoot.innerHTML.indexOf('<ha-card'));
  assert.match(v,/&lt;script&gt;/);assert.doesNotMatch(v,/<script>alert/);
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
 assert.match(old.shadowRoot.innerHTML,/UV faible/);
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


test('Air extérieur : jauge ATMO, polluants complets et publication',()=>{
  const item={kind:'air',tomorrow:false,scale:6,source:'Atmo France',zone:'Isère',updated:'25 octobre',
    primary:{entityId:'sensor.atmo',value:3,label:'Moyen'},
    worse:{label:'PM2,5',reading:{value:4,label:'Dégradé',entityId:'sensor.pm25'}},
    details:[{label:'NO₂',reading:{entityId:'sensor.no2',value:2,label:'Faible'},
      concentration:{value:12.5,unit:'µg/m³'}}]};
  const card=new Card();card.setConfig({format:'air',air_details_open:true});
  card._view={...view,air:{today:[item],tomorrow:[]}};card._render();
  const html=card.shadowRoot.innerHTML.slice(card.shadowRoot.innerHTML.indexOf('<ha-card'));
  assert.match(html,/atmo-gauge/);assert.match(html,/Niveau 3 sur 6/);assert.match(html,/12,5 µg\/m³/);
  assert.match(html,/NO₂/);assert.match(html,/PM2,5/);assert.match(html,/25 octobre/);
  assert.match(html,/details class="atmo-details" open/);
});

test('Air extérieur : panneaux Aujourd’hui et Demain, ordre et position configurables',()=>{
  const today={kind:'air',tomorrow:false,scale:6,primary:{value:3,label:'Moyen'},details:[]};
  const tomorrow={kind:'air',tomorrow:true,scale:6,primary:{value:2,label:'Bon'},details:[]};
  const card=new Card();card.setConfig({format:'air',air_period:'both',air_order:'tomorrow-first',
    air_layout:'grid',air_gauge_position:'right',air_source_position:'footer'});
  card._view={...view,air:{today:[today],tomorrow:[tomorrow]}};card._render();
  const html=card.shadowRoot.innerHTML.slice(card.shadowRoot.innerHTML.indexOf('<ha-card'));
  assert.match(html,/atmo-layout-grid/);assert.match(html,/gauge-right/);
  assert.ok(html.indexOf('Indice de demain')<html.indexOf('Indice du jour'));
  assert.equal((html.match(/class="atmo-panel"/g)||[]).length,2);
  assert.match(html,/atmo-foot/);
});

test('Air extérieur : masquer titre/date/source/jauge/détails et gérer indice hors échelle',()=>{
  const card=new Card();card.setConfig({format:'air',show_date:false,show_title:false,show_source:false,
    show_chart:false,show_details:false,air_show_zone:false,air_show_updated:false});
  card._view={...view,air:{today:[{kind:'air',source:'Atmo France',zone:'Isère',
    primary:{value:7,label:'Événement signalé'},details:[]}]}};card._render();
  const html=card.shadowRoot.innerHTML.slice(card.shadowRoot.innerHTML.indexOf('<ha-card'));
  assert.match(html,/Code 7 · hors échelle/);
  assert.doesNotMatch(html,/atmo-gauge|Atmo France|dimanche 25 octobre|Isère/);
});

test('Air extérieur : mode source personnalisée et texte échappé',()=>{
  const card=new Card();card.setConfig({format:'air',air_source_mode:'custom',
    air_source_custom:'<img src=x onerror=alert(1)>',air_source_position:'footer'});
  card._view=view;card._render();
  const html=card.shadowRoot.innerHTML.slice(card.shadowRoot.innerHTML.indexOf('<ha-card'));
  assert.match(html,/&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.doesNotMatch(html,/<img src=x/);
  assert.match(html,/atmo-foot/);
});

test('Air extérieur : éditeur visuel expose les sélections et options du format',()=>{
  const editor=Card.getConfigElement();editor.setConfig({format:'air',air_layout:'stack',
    air_period:'both',air_source_mode:'custom',air_details_open:true});
  const html=editor.shadowRoot.innerHTML;
  for(const key of ['air_period','air_layout','air_order','air_gauge_position','air_source_mode','air_source_custom',
    'air_source_position','air_show_zone','air_show_updated','air_show_worse','air_details_open'])
      assert.ok(html.includes('name="'+key+'"'),key);
  assert.match(html,/value="stack" selected/);
  assert.match(html,/value="both" selected/);
  assert.match(html,/value="custom" selected/);
});


test('Carte complète : format officiel disponible, attend le composant Niak Weather',()=>{
  const card=new Card();card.setConfig({format:'full',full_show_moon:true});
  assert.match(card.shadowRoot.innerHTML,/Niak Weather officiel est introuvable/);
  assert.equal(card.getCardSize(),13);
  assert.ok(ctx.window.customCards.some(x=>x.type==='niak-weather-modular-full-card'));
});

test('Carte complète : éditeur expose l’ordre des blocs, fond, sources, date et Lune',()=>{
  const editor=Card.getConfigElement();
  editor.setConfig({format:'full',full_show_moon:true,full_moon_position:'before'});
  const html=editor.shadowRoot.innerHTML;
  for(const key of ['full_show_banner','full_show_moon','full_modules_position','temperature_position',
    'full_source_position','banner_blocks','today_blocks','forecast_blocks','show_date','show_source','background_mode',
    'moon_visual_mode','moon_entity']){
    assert.ok(html.includes(key),key);
  }
  assert.match(html,/Carte complète Niak Weather/);
  assert.match(html,/Au-dessus de la météo complète/);
});

test('Carte complète : changement de rang dans l’éditeur enregistré',()=>{
  const editor=Card.getConfigElement();editor.setConfig({format:'full'});
  editor._change({target:{dataset:{fullGroup:'today_blocks',fullBlock:'pressure'},value:'1'}});
  assert.equal(editor._config.today_blocks[0],'pressure');
  editor._change({target:{dataset:{fullGroup:'today_blocks',fullBlock:'pressure'},value:'off'}});
  assert.ok(!editor._config.today_blocks.includes('pressure'));
});

test('Carte complète : ne crée pas de seconde souscription météo',()=>{
  let called=0;
  const card=new Card();card.setConfig({format:'full'});
  card.hass={connection:{subscribeMessage(){called++;return Promise.resolve(()=>{});}}};
  assert.equal(called,0);
  assert.match(script,/fullOriginalConfig\(c\)/);
  assert.match(script,/orderedFullModules\(c\)/);
  assert.match(script,/fullOriginalCSS\(c\)/);
});


test('Carte complète : réutilise Niak officiel et affiche Lune, Soleil et Radars dans la même grille',()=>{
  const existing=registered.get('niak-weather-card');
  registered.set('niak-weather-card',class {});
  const originalCreate=ctx.document.createElement;
  let style=null, seen=null, updates=0, grid=null;
  const native={shadowRoot:{querySelector(s){return s==='#niak-full-custom-style'?style:null;},
    appendChild(s){style=s;}},setConfig(c){seen=c;updates++;}};
  const wrapper={querySelector(sel){
    if(sel==='niak-weather-card')return native;
    if(sel==='.full-addon-grid')return grid;
    return null;
  },appendChild(child){grid=child;child.parentElement=this;}};
  ctx.document.createElement=tag=>{
    if(tag==='style')return {textContent:'',id:''};
    if(tag==='div'){
      const children=new Map(),classes=new Set();
      const g={className:'full-addon-grid',classList:{toggle(k,v){v?classes.add(k):classes.delete(k);},contains(k){return classes.has(k);}},
        querySelector(s){return children.get(s)||null;},
        appendChild(c){children.set('.'+c.className,c);c.parentElement=this;c.remove=()=>children.delete('.'+c.className);},
        remove(){grid=null;},_children:children};
      return g;
    }
    return originalCreate(tag);
  };
  try{
    const card=new Card();
    card.setConfig({format:'full',temperature_position:'left',show_date:false,show_source:false,
      background_mode:'transparent',full_show_sun:true,full_show_moon:true,full_show_radars:true,
      full_modules_position:'before',full_modules_order:['moon','sun','radars'],
      radar_url_current:'',radar_url_forecast:'',
      today_blocks:['pressure','wind'],forecast_blocks:['days'],banner_blocks:['events']});
    card.shadowRoot.querySelector=s=>s==='.full-native-wrapper'?wrapper:null;
    const hass={states:{'sensor.lunar_phase':{state:'full_moon',attributes:{moon_age:14.7,illumination_fraction:100}}},connection:{}};
    card.hass=hass;
    assert.equal(seen.type,'custom:niak-weather-card');
    assert.equal(seen.format,'full');
    assert.equal(seen.today_blocks.join(','),'pressure,wind');
    assert.equal(seen.forecast_blocks.join(','),'days');
    assert.equal(seen.banner_blocks.join(','),'events');
    assert.equal(updates,1,'ne reconfigure pas inutilement Niak officiel');
    assert.ok(grid?.classList.contains('addons-before'));
    assert.equal(grid._children.size,3);
    const moon=grid.querySelector('.full-native-moon'),sun=grid.querySelector('.full-native-sun'),
      radars=grid.querySelector('.full-native-radars');
    assert.equal(moon.style.order,0);
    assert.equal(sun.style.order,1);
    assert.equal(radars.style.order,2);
    assert.equal(moon._config.format,'moon');
    assert.equal(sun._config.format,'sun-home');
    assert.equal(radars._config.format,'radars');
    assert.equal(radars._config.radar_layout,'tabs','Onglets lisibles dans un tiers de largeur');
    assert.equal(moon.hass,hass);
    assert.match(style.textContent,/nw-now/);
    assert.match(style.textContent,/transparent/);
    card.setConfig({...card._config,full_modules_position:'after',
      full_modules_order:['radars','moon','sun'],full_show_moon:false});
    assert.ok(!grid.classList.contains('addons-before'));
    assert.equal(grid._children.size,2);
    assert.equal(grid.querySelector('.full-native-radars').style.order,0);
    assert.equal(grid.querySelector('.full-native-sun').style.order,2);
  }finally{
    ctx.document.createElement=originalCreate;
    if(existing)registered.set('niak-weather-card',existing);else registered.delete('niak-weather-card');
  }
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
test('Carte complète : grille des trois modules et ordre personnalisable dans l’éditeur',()=>{
  const editor=Card.getConfigElement();
  editor.setConfig({format:'full',full_show_sun:true,full_show_moon:true,
    full_show_radars:true,full_modules_order:['sun','moon','radars']});
  const html=editor.shadowRoot.innerHTML;
  for(const id of ['full_show_sun','full_show_radars','full_show_moon','full_modules_position',
    'radar_url_current','radar_url_forecast','sun_diagram_entity'])
    assert.match(html,new RegExp('name="'+id+'"'));
  for(const i of [0,1,2])assert.match(html,new RegExp('data-module-order="'+i+'"'));
  assert.match(html,/Au-dessus de la météo complète/);
  editor._change({target:{dataset:{moduleOrder:'0'},value:'radars'}});
  assert.equal(editor._config.full_modules_order.join(','),'radars,moon,sun');
  editor._change({target:{dataset:{moduleOrder:'1'},value:'sun'}});
  assert.equal(editor._config.full_modules_order.join(','),'radars,sun,moon');
});
test('Grille des modules : 3 cartes maximum sur PC, deux sur tablette, une sur mobile',()=>{
  assert.match(script,/\.full-native-wrapper>\.full-addon-grid\{grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(script,/\.full-native-wrapper>\.full-addon-grid\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(script,/\.full-native-wrapper>\.full-addon-grid\{\s*display:grid;grid-template-columns:minmax\(0,1fr\)/);
  assert.doesNotMatch(script,/this\._syncFullSun\(native,wrapper\)/);
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
    assert.match(script,/\.sun-compact \.sun-metric b\{font-size:18px/);
    assert.match(script,/c\.sun_compact===false\?620:260/);
  }finally{if(existing)registered.set('solar-mask-card',existing);else registered.delete('solar-mask-card');}
});
test('Soleil : mode détaillé facultatif conserve la taille du graphique',()=>{
  const c=new Card();c.setConfig({format:'sun-home',sun_compact:false});
  c.hass={states:{'sun.sun':{state:'above_horizon',attributes:{}}}};
  const html=c.shadowRoot.innerHTML.slice(c.shadowRoot.innerHTML.indexOf('<ha-card'));
  assert.match(html,/class="inner sun-home"/);
  assert.doesNotMatch(html,/sun-home sun-compact/);
});
test('Carte complète : Air et Pollens partagent une seule colonne de météo',()=>{
  assert.match(script,/\.panels-two\{box-sizing:border-box;width:calc\(\(100% - 32px\)\/3\)/);
  assert.match(script,/\.panels-two\{grid-template-columns:minmax\(0,1fr\)!important/);
  assert.match(script,/\.panels-two \.aq \.disc\{width:52px!important/);
  const e=Card.getConfigElement();e.setConfig({format:'full',full_show_sun:true});
  const html=e.shadowRoot.innerHTML;
  assert.match(html,/name="full_compact_air"/);
  assert.match(html,/Air extérieur \+ Pollens : largeur d’une carte/);
});
test('Aujourd’hui : Ressenti et Air/Pollens partagent deux colonnes sur PC et tablette',()=>{
  assert.match(script,/\.fm-body:has\(>\.nw-panel\):has\(>\.panels-two\)>\.nw-panel\{grid-column:1;order:0/);
  assert.match(script,/\.fm-body:has\(>\.nw-panel\):has\(>\.panels-two\)>\.panels-two\{grid-column:1;order:1;width:100%!important/);
  assert.match(script,/@container \(min-width:560px\)\{\.fm-section\[aria-labelledby\$="-today"\] \.fm-body:has\(>\.nw-panel\):has\(>\.panels-two\)\{grid-template-columns:repeat\(2/);
  assert.match(script,/@container \(min-width:860px\)\{\.fm-section\[aria-labelledby\$="-today"\] \.fm-body:has\(>\.nw-panel\):has\(>\.panels-two\)\{grid-template-columns:repeat\(3/);
  assert.match(script,/\.fm-body:has\(>\.nw-panel\):has\(>\.panels-two\)>\.grid3\{grid-column:1\/-1;order:2/);
  const e=Card.getConfigElement();e.setConfig({format:'full'});
  assert.match(e.shadowRoot.innerHTML,/name="full_air_position"/);
  assert.match(e.shadowRoot.innerHTML,/À côté de Ressenti/);
});
test('Soleil : éditeur propose taille compacte et graphique Solar Mask',()=>{
  const e=Card.getConfigElement();e.setConfig({format:'full',full_show_sun:true});
  const html=e.shadowRoot.innerHTML;
  assert.match(html,/Position de la ligne Soleil \/ Lune \/ Radars/);
  assert.match(html,/name="sun_compact"/);
  assert.match(html,/Afficher la carte Solar Mask/);
  assert.match(html,/Hauteur du diagramme/);
});


test('Air et Pollens : CSS compact appliqué à Aujourd’hui et aux Prévisions',()=>{
  assert.match(script,/\.fm-section \.fm-body>\.panels-two\{box-sizing:border-box/);
  assert.doesNotMatch(script,/\.fm-section\[aria-labelledby\$="-today"\] \.fm-body \.panels-two\{box-sizing:border-box/);
  assert.match(script,/\.fm-body:has\(>\.nw-panel\):has\(>\.panels-two\)>\.panels-two\{grid-column:1;order:1;width:100%!important/);
  assert.match(script,/\.fm-section \.panels-two>\.nw-panel\{border:0!important;box-shadow:none!important;background:transparent!important/);
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
test('Éditeur : options de bordures séparées pour Soleil et Air/Pollens',()=>{
  const e=Card.getConfigElement();e.setConfig({format:'full',full_show_sun:true});
  assert.match(e.shadowRoot.innerHTML,/name="sun_mask_border"/);
  assert.match(e.shadowRoot.innerHTML,/name="full_air_border"/);
  assert.match(e.shadowRoot.innerHTML,/aujourd’hui et demain/);
});


test('Air/Pollens : désactiver le placement à côté de Ressenti reste disponible',()=>{
  const e=Card.getConfigElement();e.setConfig({format:'full',full_air_position:'after_measures'});
  assert.match(e.shadowRoot.innerHTML,/value="after_measures" selected/);
  assert.match(e.shadowRoot.innerHTML,/Après Pluie \/ Vent \/ Pression/);
  assert.match(script,/c\.full_air_position!=='after_measures'/);
});
test('Ordre des trois modules : migration des anciennes positions numériques',()=>{
  const e=Card.getConfigElement();
  e.setConfig({format:'full',full_sun_order:'3',full_moon_order:'1',full_radars_order:'2',
    full_show_sun:true,full_show_moon:true,full_show_radars:true});
  const html=e.shadowRoot.innerHTML;
  assert.match(html,/data-module-order="0"/);
  assert.match(html,/data-module-order="1"/);
  assert.match(html,/data-module-order="2"/);
  const q=html.indexOf('data-module-order="0"'),option=html.slice(q,q+330);
  assert.match(option,/value="moon" selected/);
});
