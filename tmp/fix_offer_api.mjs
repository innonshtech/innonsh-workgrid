import { readFileSync, writeFileSync } from 'fs';

const filePath = 'src/app/api/v1/admin/recruitment/interviews/route.js';
let content = readFileSync(filePath, 'utf8');

// Find the getOfferLetterEmailTemplate call and replace it
// The old call passes 2 args, we need to pass 5 (name, title, null, candidateId, email)
const oldPattern = /html: getOfferLetterEmailTemplate\(\s*`\$\{candidate\.personalDetails\.firstName\} \$\{candidate\.personalDetails\.lastName\}`\s*,\s*\n?\r?\s*candidate\.jobTitle\s*\)/;

const newCall = `html: getOfferLetterEmailTemplate(
                            candidate.name || \`\${candidate.personalDetails?.firstName || ''} \${candidate.personalDetails?.lastName || ''}\`.trim(), 
                            candidate.appliedRole || candidate.jobTitle || 'Team Member',
                            null,
                            candidateId,
                            candidate.email || candidate.personalDetails?.email
                        )`;

if (oldPattern.test(content)) {
    content = content.replace(oldPattern, newCall);
    writeFileSync(filePath, content, 'utf8');
    console.log('✅ Updated offer email call with magic link params!');
} else {
    // Manual approach: find the exact text between specific markers
    const startMarker = 'html: getOfferLetterEmailTemplate(';
    const idx = content.indexOf(startMarker);
    if (idx > -1) {
        // Find the closing ),  after this call
        let depth = 1;
        let endIdx = idx + startMarker.length;
        while (depth > 0 && endIdx < content.length) {
            if (content[endIdx] === '(') depth++;
            if (content[endIdx] === ')') depth--;
            endIdx++;
        }
        // endIdx now points right after the closing )
        const oldCall = content.substring(idx, endIdx);
        console.log('Found call:', JSON.stringify(oldCall));
        
        const replacement = `html: getOfferLetterEmailTemplate(
                            candidate.name || \`\${candidate.personalDetails?.firstName || ''} \${candidate.personalDetails?.lastName || ''}\`.trim(), 
                            candidate.appliedRole || candidate.jobTitle || 'Team Member',
                            null,
                            candidateId,
                            candidate.email || candidate.personalDetails?.email
                        )`;
        
        content = content.substring(0, idx) + replacement + content.substring(endIdx);
        writeFileSync(filePath, content, 'utf8');
        console.log('✅ Updated offer email call (manual parse)!');
    } else {
        console.log('❌ Could not find getOfferLetterEmailTemplate call at all');
    }
}
