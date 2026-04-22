const fs = require('fs');
let content = fs.readFileSync('src/pages/TeamSelect.tsx', 'utf-8');

const replacements = {
  'text-[#bc13fe]': 'text-purple-600 dark:text-[#bc13fe]',
  'bg-slate-950/40': 'bg-white/40 dark:bg-slate-950/40',
  'text-gray-400': 'text-slate-500 dark:text-gray-400',
  'text-gray-500': 'text-slate-400 dark:text-gray-500'
};

for (const [key, value] of Object.entries(replacements)) {
    content = content.split(key).join(value);
}

fs.writeFileSync('src/pages/TeamSelect.tsx', content);
console.log('TeamSelect.tsx updated successfully again.');
