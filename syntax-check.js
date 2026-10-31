import fs from 'fs';

const content = fs.readFileSync('index.html', 'utf8');
const scriptMatch = content.match(/<script>([\s\S]*?)<\/script>/);

if (scriptMatch) {
  try {
    // Check syntax of raw JS
    new Function(scriptMatch[1]);
    console.log('✅ Syntax Check: 100% Valid JavaScript! Zero syntax errors.');
  } catch (err) {
    console.error('❌ Syntax Error:', err.message);
  }
} else {
  console.log('No script found');
}
