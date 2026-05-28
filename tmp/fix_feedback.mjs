import { readFileSync, writeFileSync } from 'fs';

const filePath = 'src/components/recruitment/interview-scheduler.jsx';
let content = readFileSync(filePath, 'utf8');

// The broken section (lines 818-829) — only has an empty Promote button and Draft/Hold
const broken = `                                <div className="grid grid-cols-2 gap-4">
                                    <Button
                                        onClick={() => setShowRoundPicker(true)}
                                    </Button>
                                    <Button
                                        onClick={() => handleSubmitDecision('On Hold')}
                                        disabled={submitting || !feedbackText}
                                        className="h-14 rounded-2xl bg-amber-50 text-amber-700 hover:bg-amber-100 font-black text-[10px] uppercase tracking-widest flex items-center gap-2"
                                    >
                                        <Clock className="w-4 h-4" /> Draft / Hold
                                    </Button>
                                </div>`;

const fixed = `                                <div className="grid grid-cols-2 gap-4">
                                    <Button
                                        onClick={() => setShowRoundPicker(true)}
                                        disabled={submitting || !feedbackText}
                                        className="h-14 rounded-2xl bg-slate-900 text-white hover:bg-slate-800 font-black text-[10px] uppercase tracking-widest shadow-lg flex items-center gap-2"
                                    >
                                        <ArrowUpRight className="w-4 h-4" /> Promote
                                    </Button>
                                    <Button
                                        onClick={() => handleSubmitDecision('Hired')}
                                        disabled={submitting || !feedbackText}
                                        className="h-14 rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700 font-black text-[10px] uppercase tracking-widest shadow-lg flex items-center gap-2"
                                    >
                                        <Trophy className="w-4 h-4" /> Send Offer Letter
                                    </Button>
                                    <Button
                                        onClick={() => handleSubmitDecision('Rejected')}
                                        disabled={submitting || !feedbackText}
                                        className="h-14 rounded-2xl bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 font-black text-[10px] uppercase tracking-widest flex items-center gap-2"
                                    >
                                        <XCircle className="w-4 h-4" /> Reject
                                    </Button>
                                    <Button
                                        onClick={() => handleSubmitDecision('On Hold')}
                                        disabled={submitting || !feedbackText}
                                        className="h-14 rounded-2xl bg-amber-50 text-amber-700 hover:bg-amber-100 font-black text-[10px] uppercase tracking-widest flex items-center gap-2"
                                    >
                                        <Clock className="w-4 h-4" /> Draft / Hold
                                    </Button>
                                </div>`;

if (content.includes(broken)) {
    content = content.replace(broken, fixed);
    writeFileSync(filePath, content, 'utf8');
    console.log('✅ FeedbackModal action panel FIXED! All 4 buttons restored.');
} else {
    // Try with \r\n
    const brokenCRLF = broken.replace(/\n/g, '\r\n');
    if (content.includes(brokenCRLF)) {
        content = content.replace(brokenCRLF, fixed.replace(/\n/g, '\r\n'));
        writeFileSync(filePath, content, 'utf8');
        console.log('✅ FeedbackModal action panel FIXED (CRLF)! All 4 buttons restored.');
    } else {
        console.log('❌ Could not find the broken section. Dumping nearby content for debug:');
        const idx = content.indexOf('setShowRoundPicker(true)');
        if (idx > -1) {
            console.log('Found setShowRoundPicker at index', idx);
            console.log('Context:', JSON.stringify(content.substring(idx - 50, idx + 200)));
        }
    }
}
