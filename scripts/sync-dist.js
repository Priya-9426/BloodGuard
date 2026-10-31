import fs from 'fs';
fs.copyFileSync('dist/index.html', 'index.html');
fs.cpSync('dist/assets', 'assets', { recursive: true });
console.log('✅ Updated root index.html and assets/ from dist/');
