import fs from 'fs';

const indexHtml = fs.readFileSync('index.html', 'utf8');
const rootElementMatch = indexHtml.match(/<div id="root"><\/div>/);
const cssMatch = indexHtml.match(/href="(\.\/assets\/[^"]+\.css)"/);
const jsMatch = indexHtml.match(/src="(\.\/assets\/[^"]+\.js)"/);

let passed = true;

if (!rootElementMatch) {
  console.error('❌ Root div (#root) missing in index.html');
  passed = false;
}

if (!cssMatch || !fs.existsSync(cssMatch[1].replace('./', ''))) {
  console.error('❌ CSS stylesheet asset missing or not found on disk');
  passed = false;
}

if (!jsMatch || !fs.existsSync(jsMatch[1].replace('./', ''))) {
  console.error('❌ JavaScript module asset missing or not found on disk');
  passed = false;
}

if (passed) {
  console.log('✅ Integrity Check: index.html and all compiled assets verified!');
}
