import fs from 'fs';

const content = fs.readFileSync('index.html', 'utf8');
const match = content.match(/<script>([\s\S]*?)<\/script>/);

if (!match) {
  console.log('Error: No script block found in index.html');
} else {
  console.log('Script block extracted. Length:', match[1].length);
  try {
    new Function(match[1]);
    console.log('✅ Syntax test check passed! Zero errors.');
  } catch (err) {
    console.error('❌ Syntax error in script block:', err.message);
  }
}
