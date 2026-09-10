node -e "
const fs = require('fs');
const js = fs.readFileSync('monitor-nodos.js', 'utf8').trim();
let html = fs.readFileSync('instalar.html', 'utf8');
html = html.replace(
  '<a id=\"btn-monitor\" href=\"#\">',
  '<a id=\"btn-monitor\" href=\"javascript:' + js.replace(/\\/g,'\\\\').replace(/`/g,'\\`') + '\">'
);
fs.writeFileSync('instalar.html', html);
console.log('Feito! JS tem', js.length, 'chars');
"