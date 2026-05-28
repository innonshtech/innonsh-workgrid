import { readFileSync, writeFileSync } from 'fs';

const filePath = 'src/lib/email/templates/recruitment.js';
let content = readFileSync(filePath, 'utf8');

// Replace the offer letter template function signature and body
const oldTemplate = `export const getOfferLetterEmailTemplate = (candidateName, jobTitle, offerContent) => \`
<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
  <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 40px 30px; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">🎉 Offer Letter — \${jobTitle}</h1>
  </div>
  <div style="padding: 30px;">
    <p style="color: #1e293b; font-size: 16px; line-height: 1.6;">Dear <strong>\${candidateName}</strong>,</p>
    <p style="color: #475569; font-size: 15px; line-height: 1.8;">We are delighted to extend you an offer for the position of <strong>\${jobTitle}</strong>.</p>
    <div style="margin: 25px 0; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
      \${offerContent || 'Please find the detailed offer letter attached.'}
    </div>
    <p style="color: #475569; font-size: 14px; line-height: 1.8;">Please review and respond at your earliest convenience. We're excited to welcome you to the team!</p>
  </div>
  <div style="background: #f8fafc; padding: 20px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
    <p style="color: #94a3b8; font-size: 12px; margin: 0;">© 2026 Bizmate Technologies. All rights reserved.</p>
  </div>
</div>
\`;`;

const newTemplate = `export const getOfferLetterEmailTemplate = (candidateName, jobTitle, offerContent, candidateId = '', candidateEmail = '') => {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.BASE_URL || 'http://localhost:3000';
  const acceptUrl = \`\${baseUrl}/careers/offer?id=\${candidateId}&email=\${encodeURIComponent(candidateEmail)}&action=accept\`;
  const declineUrl = \`\${baseUrl}/careers/offer?id=\${candidateId}&email=\${encodeURIComponent(candidateEmail)}&action=decline\`;
  const statusUrl = \`\${baseUrl}/careers/status\`;
  
  return \`
<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
  <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 40px 30px; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">🎉 Offer Letter — \${jobTitle}</h1>
  </div>
  <div style="padding: 30px;">
    <p style="color: #1e293b; font-size: 16px; line-height: 1.6;">Dear <strong>\${candidateName}</strong>,</p>
    <p style="color: #475569; font-size: 15px; line-height: 1.8;">We are delighted to extend you an offer for the position of <strong>\${jobTitle}</strong>.</p>
    <div style="margin: 25px 0; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
      \${offerContent || 'Please find the detailed offer letter attached.'}
    </div>
    
    \${candidateId ? \`
    <div style="margin: 30px 0; text-align: center;">
      <p style="color: #1e293b; font-size: 15px; font-weight: bold; margin-bottom: 20px;">Ready to respond? Click below:</p>
      <div style="display: inline-block;">
        <a href="\${acceptUrl}" style="background: #059669; color: white; padding: 16px 40px; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 15px; display: inline-block; margin: 0 8px;">✅ Accept Offer</a>
        <a href="\${declineUrl}" style="background: #f1f5f9; color: #64748b; padding: 16px 40px; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 15px; display: inline-block; margin: 0 8px; border: 1px solid #e2e8f0;">Decline</a>
      </div>
    </div>
    <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 10px;">Or track your application at: <a href="\${statusUrl}" style="color: #4f46e5;">\${statusUrl}</a></p>
    \` : ''}
    
    <p style="color: #475569; font-size: 14px; line-height: 1.8;">Please review and respond at your earliest convenience. We're excited to welcome you to the team!</p>
  </div>
  <div style="background: #f8fafc; padding: 20px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
    <p style="color: #94a3b8; font-size: 12px; margin: 0;">© 2026 Bizmate Technologies. All rights reserved.</p>
  </div>
</div>
\`;
};`;

if (content.includes(oldTemplate)) {
    content = content.replace(oldTemplate, newTemplate);
    writeFileSync(filePath, content, 'utf8');
    console.log('✅ Offer email template updated with magic accept/decline links!');
} else {
    // Try matching just the function signature
    const sigOld = "export const getOfferLetterEmailTemplate = (candidateName, jobTitle, offerContent) => `";
    if (content.includes(sigOld)) {
        // Find the end of this template (next backtick + semicolon)
        const startIdx = content.indexOf(sigOld);
        const endMarker = "`;";
        let endIdx = content.indexOf(endMarker, startIdx + sigOld.length);
        if (endIdx > -1) {
            endIdx += endMarker.length;
            content = content.substring(0, startIdx) + newTemplate + content.substring(endIdx);
            writeFileSync(filePath, content, 'utf8');
            console.log('✅ Offer email template updated (signature match)!');
        } else {
            console.log('❌ Could not find end of template');
        }
    } else {
        console.log('❌ Could not find offer template function. Dumping search context...');
        const idx = content.indexOf('getOfferLetterEmailTemplate');
        if (idx > -1) {
            console.log('Found at index:', idx);
            console.log('Context:', content.substring(idx, idx + 100));
        }
    }
}
