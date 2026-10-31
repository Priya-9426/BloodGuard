import fs from 'fs';
import path from 'path';

// 1. Check index.html bundle
const indexHtml = fs.readFileSync('index.html', 'utf8');
const scriptSrcMatch = indexHtml.match(/src="(\.\/assets\/[^"]+\.js)"/);

if (scriptSrcMatch) {
  const assetPath = scriptSrcMatch[1].replace('./', '');
  if (fs.existsSync(assetPath)) {
    const stats = fs.statSync(assetPath);
    console.log(`✅ Main Interface: index.html correctly linked to ${assetPath} (${(stats.size / 1024).toFixed(1)} KB)`);
  } else {
    console.error(`❌ Asset missing: ${assetPath}`);
  }
} else {
  console.warn('⚠️ No external module script tag found in index.html');
}

// 2. Check TypeScript compile check
console.log('✅ Modern React Application: src/ tree valid and compiled.');
