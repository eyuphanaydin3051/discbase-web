const fs = require('fs');
let content = fs.readFileSync('src/pages/TeamSelect.tsx', 'utf-8');

const replacements = {
  'bg-[#051424]': 'bg-slate-50 dark:bg-[#051424] transition-colors',
  'text-[#d4e4fa]': 'text-slate-900 dark:text-[#d4e4fa]',
  'bg-[#0d1c2d]/60': 'bg-white/60 dark:bg-[#0d1c2d]/60',
  'border-white/10': 'border-slate-200 dark:border-white/10',
  'bg-[#1c2b3c]': 'bg-slate-100 dark:bg-[#1c2b3c]',
  'border-[#ebb2ff]': 'border-purple-400 dark:border-[#ebb2ff]',
  'text-[#ebb2ff]': 'text-purple-600 dark:text-[#ebb2ff]',
  'text-[#d4c0d7]': 'text-slate-500 dark:text-[#d4c0d7]',
  'bg-[#122131]/50': 'bg-slate-100/50 dark:bg-[#122131]/50',
  'bg-[#bc13fe]': 'bg-purple-600 dark:bg-[#bc13fe]',
  'hover:bg-[#bc13fe]/90': 'hover:bg-purple-700 dark:hover:bg-[#bc13fe]/90',
  'bg-[#dcfdff]/20': 'bg-cyan-100/50 dark:bg-[#dcfdff]/20',
  'text-[#00f1fd]': 'text-cyan-600 dark:text-[#00f1fd]',
  'border-[#dcfdff]': 'border-cyan-400 dark:border-[#dcfdff]',
  'text-[#e1e0fb]': 'text-indigo-600 dark:text-[#e1e0fb]',
  'text-[#ffb4ab]': 'text-red-500 dark:text-[#ffb4ab]',
  'hover:text-[#ffdad6]': 'hover:text-red-600 dark:hover:text-[#ffdad6]',
  'text-[#dcfdff]': 'text-cyan-600 dark:text-[#dcfdff]',
  'hover:text-[#d4e4fa]': 'hover:text-slate-900 dark:hover:text-[#d4e4fa]',
  'text-[#f8d8ff]': 'text-purple-800 dark:text-[#f8d8ff]',
  'hover:text-[#f8d8ff]': 'hover:text-purple-800 dark:hover:text-[#f8d8ff]',
  'border-white/5': 'border-slate-200 dark:border-white/5',
  'selection:bg-[#bc13fe] selection:text-white': 'selection:bg-purple-500 dark:selection:bg-[#bc13fe] selection:text-white'
};

for (const [key, value] of Object.entries(replacements)) {
    content = content.split(key).join(value);
}

fs.writeFileSync('src/pages/TeamSelect.tsx', content);
console.log('TeamSelect.tsx updated successfully.');
