const fs = require('fs');
const path = require('path');

// Read the screen file
const screenPath = path.join(process.cwd(), 'apps/mobile/src/screens/Finance/AddTransactionScreen.tsx');
const content = fs.readFileSync(screenPath, 'utf-8');

// Extract all t('...') calls
const regex = /t\('([^']+)'\)/g;
const keys = new Set();
let match;

while ((match = regex.exec(content)) !== null) {
  keys.add(match[1]);
}

const sortedKeys = Array.from(keys).sort();
console.log('Keys found in AddTransactionScreen.tsx:');
sortedKeys.forEach(key => console.log(key));
console.log(`\nTotal: ${sortedKeys.length} keys`);

// Write to file for next step
fs.writeFileSync('/tmp/used_keys.json', JSON.stringify(sortedKeys, null, 2));
