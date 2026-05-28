import { readFileSync, writeFileSync } from 'fs';

const filePath = 'src/app/careers/status/page.jsx';
const lines = readFileSync(filePath, 'utf8').split('\n');

// Keep only lines 1-357 (the new component), discard the old duplicate from line 358+
const cleaned = lines.slice(0, 357).join('\n');
writeFileSync(filePath, cleaned, 'utf8');

console.log(`✅ Removed duplicate code. File now has ${cleaned.split('\n').length} lines (was ${lines.length}).`);
