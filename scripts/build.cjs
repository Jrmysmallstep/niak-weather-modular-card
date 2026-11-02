const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname,'..');
const src = path.join(root,'src','hestia-weather-addon.js');
const dst = path.join(root,'dist','hestia-weather-addon.js');
const content = fs.readFileSync(src);
if(process.argv.includes('--verify')) {
  if(!fs.existsSync(dst)||!content.equals(fs.readFileSync(dst))) {
    console.error('dist ne correspond pas à src : lancez npm run build');
    process.exitCode=1;
  } else console.log('dist synchronisé avec src');
} else {
  fs.mkdirSync(path.dirname(dst),{recursive:true});
  fs.writeFileSync(dst,content);
  console.log('dist/hestia-weather-addon.js mis à jour');
}
