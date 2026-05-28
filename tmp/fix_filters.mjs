import { readFileSync, writeFileSync } from 'fs';

const filePath = 'src/components/recruitment/interview-scheduler.jsx';
let content = readFileSync(filePath, 'utf8');

// Fix 1: Hired filter → include Confirmed
const old1 = `const hiredCandidates = candidateList.filter(c => c.status === 'Hired' || c.status === 'Offer Sent');`;
const new1 = `const hiredCandidates = candidateList.filter(c => ['Hired', 'Offer Sent', 'Confirmed'].includes(c.status));`;

// Fix 2: Rejected filter → include Declined
const old2 = `const rejectedCandidates = candidateList.filter(c => c.status === 'Rejected');`;
const new2 = `const rejectedCandidates = candidateList.filter(c => c.status === 'Rejected' || c.status === 'Declined');`;

// Fix 3: Active filter → exclude Confirmed and Declined
const old3 = `c.status !== 'Hired' && c.status !== 'Offer Sent' && c.status !== 'Rejected'`;
const new3 = `!['Hired', 'Offer Sent', 'Confirmed', 'Rejected', 'Declined'].includes(c.status)`;

let changes = 0;
if (content.includes(old1)) { content = content.replace(old1, new1); changes++; }
if (content.includes(old2)) { content = content.replace(old2, new2); changes++; }
if (content.includes(old3)) { content = content.replace(old3, new3); changes++; }

writeFileSync(filePath, content, 'utf8');
console.log(`✅ Updated ${changes}/3 pipeline filters to include Confirmed/Declined statuses.`);
