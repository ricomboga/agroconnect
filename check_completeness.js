const fs = require('fs');

const usedKeys = [
  'common.back',
  'farm.list.empty.title',
  'finance.transaction.amountLabel',
  'finance.transaction.amountPrefix',
  'finance.transaction.buyerLabel',
  'finance.transaction.buyerPlaceholder',
  'finance.transaction.categoryLabel',
  'finance.transaction.dateLabel',
  'finance.transaction.dateModal.done',
  'finance.transaction.dateModal.title',
  'finance.transaction.errorSave',
  'finance.transaction.expenseSubtitle',
  'finance.transaction.expenseToggle',
  'finance.transaction.incomeSubtitle',
  'finance.transaction.incomeToggle',
  'finance.transaction.infoAlert',
  'finance.transaction.linkedToLabel',
  'finance.transaction.linkedToModal.close',
  'finance.transaction.linkedToModal.title',
  'finance.transaction.linkedToPlaceholder',
  'finance.transaction.notesLabel',
  'finance.transaction.notesPlaceholder',
  'finance.transaction.saveBtn',
  'finance.transaction.topBarTitle',
  // Also check category keys
  'finance.transaction.category.crop_sale',
  'finance.transaction.category.animal_products',
  'finance.transaction.category.fertiliser',
  'finance.transaction.category.pesticide_drugs',
  'finance.transaction.category.tools_equipment',
  'finance.transaction.category.labour',
  'finance.transaction.category.water_irrigation',
  'finance.transaction.category.other_input'
];

const sw = JSON.parse(fs.readFileSync('apps/mobile/src/locales/sw.json', 'utf-8'));
const en = JSON.parse(fs.readFileSync('apps/mobile/src/locales/en.json', 'utf-8'));

// Flatten both locale objects
function flatten(obj, prefix = '') {
  return Object.keys(obj).reduce((acc, key) => {
    const fullKey = prefix ? prefix + '.' + key : key;
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      Object.assign(acc, flatten(obj[key], fullKey));
    } else {
      acc[fullKey] = obj[key];
    }
    return acc;
  }, {});
}

const swFlat = flatten(sw);
const enFlat = flatten(en);

const missing = [];
const empty = [];

console.log('Checking all keys from AddTransactionScreen.tsx...\n');

for (const key of usedKeys) {
  const swVal = swFlat[key];
  const enVal = enFlat[key];

  if (!swVal && !enVal) {
    missing.push({ key, missing: 'both' });
  } else if (!swVal) {
    missing.push({ key, missing: 'sw.json' });
  } else if (!enVal) {
    missing.push({ key, missing: 'en.json' });
  } else if (typeof swVal === 'string' && swVal.trim() === '') {
    empty.push({ key, file: 'sw.json' });
  } else if (typeof enVal === 'string' && enVal.trim() === '') {
    empty.push({ key, file: 'en.json' });
  }
}

console.log('RESULTS:');
console.log('========');
console.log(`Total keys used: ${usedKeys.length}`);
console.log(`Missing: ${missing.length}`);
console.log(`Empty: ${empty.length}`);

if (missing.length > 0) {
  console.log('\nMISSING KEYS:');
  missing.forEach(m => {
    console.log(`  ${m.key}: missing from ${m.missing}`);
  });
}

if (empty.length > 0) {
  console.log('\nEMPTY VALUES:');
  empty.forEach(e => {
    console.log(`  ${e.key}: empty in ${e.file}`);
  });
}

if (missing.length === 0 && empty.length === 0) {
  console.log('\n✓ All keys are present and non-empty in both locales!');
}
