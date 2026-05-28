import { readFileSync, writeFileSync } from 'fs';

const filePath = 'src/components/recruitment/interview-scheduler.jsx';
const lines = readFileSync(filePath, 'utf8').split(/\r?\n/);

// Lines are 1-indexed in the viewer, so index is line - 1
// We want to delete lines 838 to 1008 (inclusive)
// These lines were part of the corrupted/duplicated block
const startLine = 838;
const endLine = 1008;

const newLines = [
    ...lines.slice(0, startLine - 1),
    ...lines.slice(endLine)
];

writeFileSync(filePath, newLines.join('\n'), 'utf8');
console.log(`Successfully removed corrupted lines ${startLine} to ${endLine}`);
