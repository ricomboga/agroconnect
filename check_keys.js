const sw = require('./apps/mobile/src/locales/sw.json');
const en = require('./apps/mobile/src/locales/en.json');

// Manually list all keys used in ActivityFormScreen.tsx
const usedKeys = [
  // Direct t() calls
  'crop.add.dateModal.title',
  'activity.calendar.month.0',
  'activity.calendar.month.1',
  'activity.calendar.month.2',
  'activity.calendar.month.3',
  'activity.calendar.month.4',
  'activity.calendar.month.5',
  'activity.calendar.month.6',
  'activity.calendar.month.7',
  'activity.calendar.month.8',
  'activity.calendar.month.9',
  'activity.calendar.month.10',
  'activity.calendar.month.11',
  'crop.add.dateModal.su',
  'crop.add.dateModal.mo',
  'crop.add.dateModal.tu',
  'crop.add.dateModal.we',
  'crop.add.dateModal.th',
  'crop.add.dateModal.fr',
  'crop.add.dateModal.sa',
  'common.cancel',
  'crop.add.dateModal.select',
  'common.error.loadFailed',
  'common.retry',
  'activity.form.topBarTitle',
  'farm.list.empty.title',
  'farm.list.empty.body',
  'farm.list.empty.cta',
  'activity.form.activityTypeSection',
  'activity.form.detailsSection',
  'activity.form.farmLabel',
  'activity.form.farmPlaceholder',
  'activity.form.cropAnimalLabel',
  'activity.form.cropAnimalPlaceholder',
  'activity.form.dateLabel',
  'activity.form.durationLabel',
  'activity.form.durationPlaceholder',
  'activity.form.costLabel',
  'activity.form.costPlaceholder',
  'activity.form.labourCost',
  'activity.form.labourCostPlaceholder',
  'activity.form.notesLabel',
  'activity.form.notesPlaceholder',
  'activity.form.saveBtn',
  'activity.form.streakAlert',
  'activity.form.successToast',
  'activity.form.errorSave',
  'activity.form.farmPickerTitle',
  'activity.form.cropPickerTitle',
  'activity.type.vaccination',
  'activity.type.deworming',
  'activity.type.feeding',
  'activity.form.tile.watering',
  'activity.form.tile.spraying',
  'activity.form.tile.fertilising',
  'activity.form.tile.weeding',
  'activity.form.tile.planting',
  'activity.form.tile.harvesting',
  'activity.form.tile.vaccination',
  'activity.form.tile.deworming',
  'activity.form.tile.feeding',
];

// Flatten locale files
function flatten(obj, prefix = '') {
  return Object.keys(obj).reduce((acc, key) => {
    const fullKey = prefix ? prefix + '.' + key : key;
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
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

console.log('=== MISSING KEYS ===');
if (missing.length === 0) {
  console.log('None found - all keys present!');
} else {
  missing.forEach(m => console.log(`${m.key}: missing from ${m.missing}`));
}

console.log('\n=== EMPTY VALUES ===');
if (empty.length === 0) {
  console.log('None found - all values populated!');
} else {
  empty.forEach(e => console.log(`${e.key}: empty string in ${e.file}`));
}

console.log('\n=== SUMMARY ===');
console.log(`Total keys checked: ${usedKeys.length}`);
console.log(`Missing: ${missing.length}`);
console.log(`Empty: ${empty.length}`);
