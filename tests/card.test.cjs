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
const ctx = {HTMLElement:HTMLElementMock, customElements:{get:(n)=>registered.get(n),define:(n,v)=>registered.set(n,v)},window:{customCards:[]},console:{info(){}},document:{createElement(tag){return new (registered.get(tag))();}},CustomEvent:class {constructor(type,init){this.type=type;this.detail=init?.detail;}},Intl,Date,Number,Math,Set,Array};
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
 comfort:{feels:17,word:'Frais',humidity:'62 %',source:'Station locale',gap:-1,factors:[{icon:'mdi:weather-windy',label:'Vent'}],example:'17 °C ressentis'},
 rain:{source:'Station locale',value:0,unit:'mm',label:'Aujourd’hui',days:[{label:'Lun',value:1},{label:'Mar',value:0.3}],stats:[{label:'Hier',value:'2 mm'}]},
 wind:{source:'Station locale',value:3,label:'Vent moyen',description:'Très légère brise',bearing:74,mean:series(2),gust:series(5),top:20,meanLabel:'Vent moyen',stats:[{label:'Rafales',value:'8 km/h'}]},
 pressure:{source:'Station locale',value:1018,description:'Stable',series:series(1014),low:1008,top:1025,stats:[{label:'Minimum',value:'1014 hPa'}]},
 hours:forecast,days:Array.from({length:7},(_,i)=>({label:'J'+i,low:6+i,high:15+i,rain:2,wind:10,icon:'mdi:weather-sunny'})),
 air:{today:[{kind:'pollen',scale:6,zone:'Isère',source:'Atmo France',primary:{value:2,label:'Faible'},details:[{label:'Graminées',reading:{label:'Faible',value:2}}]},{kind:'air',scale:6,source:'Atmo France',primary:{value:3,label:'Moyen'},details:[]}],tomorrow:[{kind:'pollen',scale:6,source:'Atmo France',primary:{value:3,label:'Moyen'},details:[]}]},
};

test('les 13 formats sont déclarés dans le sélecteur Home Assistant',()=>{
  assert.equal(ctx.window.customCards.length,13);
  for(const {type} of ctx.window.customCards) assert.ok(registered.get(type));
});

test('chaque format produit un rendu autonome sans erreur',()=>{
  for(const f of ['summary','current','bulletin','events','comfort','rain','wind','pressure','pollen','hours','days','pollen-forecast','air']){
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
  const el=Card.getConfigElement();el.setConfig({format:'summary'});
  assert.ok(el.shadowRoot.innerHTML.includes('Type de carte'));
  assert.ok(el.shadowRoot.innerHTML.includes('Contenu de la synthèse'));
  assert.ok(el.shadowRoot.innerHTML.includes('Afficher la source'));
});
