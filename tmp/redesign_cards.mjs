import { readFileSync, writeFileSync } from 'fs';

const filePath = 'src/components/recruitment/interview-scheduler.jsx';
let content = readFileSync(filePath, 'utf8');

// ============================================================
// 1. ADD showActionModal state + handler in main component
// ============================================================
const oldStates = `const [showFeedbackModal, setShowFeedbackModal] = useState(false);
    const [selectedInterviewForFeedback, setSelectedInterviewForFeedback] = useState(null);`;

const newStates = `const [showFeedbackModal, setShowFeedbackModal] = useState(false);
    const [showActionModal, setShowActionModal] = useState(false);
    const [selectedInterviewForFeedback, setSelectedInterviewForFeedback] = useState(null);`;

if (content.includes(oldStates)) {
    content = content.replace(oldStates, newStates);
    console.log('✅ 1. Added showActionModal state');
} else { console.log('⚠️ 1. State not found, trying CRLF...'); 
    const crlfOld = oldStates.replace(/\n/g, '\r\n');
    if (content.includes(crlfOld)) {
        content = content.replace(crlfOld, newStates.replace(/\n/g, '\r\n'));
        console.log('✅ 1. Added showActionModal state (CRLF)');
    } else { console.log('❌ 1. FAILED'); }
}

// ============================================================
// 2. ADD ActionModal instance in Modals section (after FeedbackModal)
// ============================================================
const oldModalsEnd = `            </AnimatePresence>
        </div>
    );
}`;

const newModalsEnd = `                {showActionModal && selectedInterviewForFeedback && (
                    <ActionModal
                        onClose={() => setShowActionModal(false)}
                        interview={selectedInterviewForFeedback}
                        onSuccess={async (promoData) => {
                            setShowActionModal(false);
                            await fetchData();
                            
                            if (promoData && promoData.nextRound) {
                                toast.success("Opening scheduler for next round...");
                                setTimeout(() => {
                                    setShowScheduleModal({
                                        candidateId: promoData.candidateId,
                                        round: promoData.nextRound
                                    });
                                }, 500);
                            }
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}`;

if (content.includes(oldModalsEnd)) {
    content = content.replace(oldModalsEnd, newModalsEnd);
    console.log('✅ 2. Added ActionModal instance');
} else {
    const crlfOld = oldModalsEnd.replace(/\n/g, '\r\n');
    if (content.includes(crlfOld)) {
        content = content.replace(crlfOld, newModalsEnd.replace(/\n/g, '\r\n'));
        console.log('✅ 2. Added ActionModal instance (CRLF)');
    } else { console.log('❌ 2. FAILED'); }
}

// ============================================================
// 3. UPDATE InterviewCard onAddFeedback callback  
//    + ADD onAddAction callback in the card render calls
// ============================================================
// Active pipeline cards
const oldActiveCard = `<InterviewCard
                                                interview={cand.latestInterview}
                                                onStatusUpdate={updateStatus}
                                                onAddFeedback={(interviewItem) => {
                                                    setSelectedInterviewForFeedback(interviewItem);
                                                    setShowFeedbackModal(true);
                                                }}
                                            />`;
const newActiveCard = `<InterviewCard
                                                interview={cand.latestInterview}
                                                onStatusUpdate={updateStatus}
                                                onAddFeedback={(interviewItem) => {
                                                    setSelectedInterviewForFeedback(interviewItem);
                                                    setShowFeedbackModal(true);
                                                }}
                                                onAddAction={(interviewItem) => {
                                                    setSelectedInterviewForFeedback(interviewItem);
                                                    setShowActionModal(true);
                                                }}
                                            />`;

content = content.split(oldActiveCard).join(newActiveCard);
content = content.split(oldActiveCard.replace(/\n/g, '\r\n')).join(newActiveCard.replace(/\n/g, '\r\n'));
console.log('✅ 3a. Updated active pipeline card props');

// Hired/Rejected cards (3 instances with minimal prop)
const oldMinCard = `onAddFeedback={(interviewItem) => {
                                            setSelectedInterviewForFeedback(interviewItem);
                                            setShowFeedbackModal(true);
                                        }}
                                        minimal`;
const newMinCard = `onAddFeedback={(interviewItem) => {
                                            setSelectedInterviewForFeedback(interviewItem);
                                            setShowFeedbackModal(true);
                                        }}
                                        onAddAction={(interviewItem) => {
                                            setSelectedInterviewForFeedback(interviewItem);
                                            setShowActionModal(true);
                                        }}
                                        minimal`;

content = content.split(oldMinCard).join(newMinCard);
content = content.split(oldMinCard.replace(/\n/g, '\r\n')).join(newMinCard.replace(/\n/g, '\r\n'));
console.log('✅ 3b. Updated minimal card props');

// ============================================================
// 4. REWRITE InterviewCard — new button layout
// ============================================================
const oldInterviewCard = /function InterviewCard\(\{[^}]+\}\) \{[\s\S]*?^}\r?\n/m;
// Instead of regex, find by markers
const cardStart = content.indexOf('function InterviewCard(');
const cardEndMarker = '\nfunction ScheduleModal(';
const cardEnd = content.indexOf(cardEndMarker);

if (cardStart > -1 && cardEnd > -1) {
    const newInterviewCard = `function InterviewCard({ interview, onStatusUpdate, onAddFeedback, onAddAction, minimal = false }) {
    const isComp = interview.status === 'Completed';
    const isCanc = interview.status === 'Cancelled';
    const hasFeedback = !!interview.rawNotes;
    const hasDecision = !!interview.decision;
    const date = new Date(interview.date);

    // Decision display helper
    const getDecisionBadge = () => {
        if (!hasDecision) return null;
        const d = interview.decision;
        if (d === 'Promoted') return { label: \`Promoted → \${interview.nextRound || 'Next Round'}\`, color: 'bg-blue-50 text-blue-600 border-blue-100', icon: '⬆' };
        if (d === 'On Hold') return { label: 'ON HOLD', color: 'bg-amber-50 text-amber-600 border-amber-100', icon: '⏸' };
        if (d === 'Rejected') return { label: 'REJECTED', color: 'bg-rose-50 text-rose-600 border-rose-100', icon: '✗' };
        if (d === 'Hired' || d === 'Offer Sent') return { label: 'OFFER SENT', color: 'bg-emerald-50 text-emerald-600 border-emerald-100', icon: '🎉' };
        return { label: d, color: 'bg-slate-50 text-slate-600 border-slate-100', icon: '•' };
    };
    const decisionBadge = getDecisionBadge();

    return (
        <div className={\`group relative bg-white rounded-[40px] border shadow-sm \${isComp ? 'border-emerald-100' : isCanc ? 'border-slate-100 grayscale' : 'border-slate-100'} hover:border-indigo-400 hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-700 overflow-hidden min-h-[140px] flex items-stretch\`}>
            {/* Status Indicator Strip */}
            <div className={\`absolute left-0 top-0 bottom-0 w-2.5 \${hasDecision && interview.decision === 'Rejected' ? 'bg-rose-400' : hasDecision && interview.decision === 'On Hold' ? 'bg-amber-400' : isComp ? 'bg-emerald-500' : isCanc ? 'bg-slate-300' : 'bg-indigo-600'} group-hover:w-4 transition-all duration-700\`}></div>

            <div className="p-6 pl-10 flex flex-col xl:flex-row xl:items-center justify-between gap-6 w-full">
                <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                    {/* Time/Date Block */}
                    <div className="flex flex-col items-center justify-center min-w-[80px] h-[80px] rounded-[28px] bg-slate-50 border border-slate-100 group-hover:bg-indigo-600 group-hover:border-indigo-600 transition-all duration-700 shadow-sm group-hover:shadow-[0_12px_24px_rgba(79,70,229,0.3)] shrink-0">
                        <p className="text-[9px] font-black text-slate-400 group-hover:text-indigo-200 uppercase tracking-[0.2em] transition-colors">{format(date, 'MMM')}</p>
                        <p className="text-2xl font-black text-slate-900 group-hover:text-white leading-none py-1 transition-colors">{format(date, 'dd')}</p>
                        <p className="text-[10px] font-black text-indigo-600 group-hover:text-white mt-0.5 uppercase transition-colors">{format(date, 'HH:mm')}</p>
                    </div>

                    {/* Info Block */}
                    <div className="space-y-2.5 min-w-0">
                        <div className="flex flex-wrap items-center gap-3">
                            <h4 className="text-xl font-black text-slate-900 tracking-tighter leading-none truncate">{interview.candidateName}</h4>
                            <Badge className={\`\${isComp ? 'bg-emerald-50 text-emerald-600 shadow-emerald-100' : isCanc ? 'bg-slate-50 text-slate-400' : 'bg-indigo-600 text-white shadow-indigo-100'} border-none font-black text-[9px] uppercase py-1.5 px-4 rounded-xl shadow-lg shrink-0\`}>
                                {interview.round || "Assessment Round"}
                            </Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm font-bold text-slate-500">
                            <span className="flex items-center gap-2 text-slate-400 uppercase tracking-[0.15em] text-[9px] font-black">
                                <Briefcase className="w-3.5 h-3.5 text-indigo-500" /> {interview.role}
                            </span>
                            <span className="flex items-center gap-2.5 px-4 py-1.5 bg-slate-50 rounded-[14px] border border-slate-100 group-hover:bg-white group-hover:border-indigo-100 transition-all">
                                <Users className="w-3.5 h-3.5 text-indigo-500 group-hover:scale-110 transition-transform" />
                                <div className="flex flex-col">
                                    <span className="text-slate-400 font-black uppercase text-[7px] tracking-widest leading-none mb-0.5">Panelist</span>
                                    <span className="text-slate-800 text-[11px] font-black uppercase leading-tight">{interview.interviewer?.name || "Pending"}</span>
                                </div>
                            </span>
                        </div>
                        {/* Inline Decision Status */}
                        {decisionBadge && (
                            <div className={\`inline-flex items-center gap-2 px-4 py-2 rounded-2xl border text-[10px] font-black uppercase tracking-widest mt-1 \${decisionBadge.color}\`}>
                                <span>{decisionBadge.icon}</span> {decisionBadge.label}
                            </div>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 shrink-0">
                    {!minimal && !isComp && !isCanc && (
                        <>
                            <Button
                                className="h-14 rounded-[20px] bg-slate-900 text-white hover:bg-slate-800 font-black uppercase tracking-widest text-[10px] px-6 shadow-xl shadow-slate-200/50 flex items-center gap-2.5 group/btn"
                                onClick={() => window.open(interview.meetingLink || '#', '_blank')}
                            >
                                <Video className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                                Join
                            </Button>
                            <Button
                                variant="ghost"
                                className={\`h-14 rounded-[20px] font-black uppercase tracking-widest text-[10px] px-5 flex items-center gap-1.5 \${hasFeedback ? 'bg-purple-50 text-purple-600 hover:bg-purple-100 border border-purple-100' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-100'}\`}
                                onClick={() => onAddFeedback && onAddFeedback(interview)}
                            >
                                {hasFeedback ? <><Sparkles className="w-4 h-4" /> View Feedback</> : <><MessageSquare className="w-4 h-4" /> Feedback</>}
                            </Button>
                            <Button
                                variant="ghost"
                                className="h-14 rounded-[20px] bg-amber-50 text-amber-700 hover:bg-amber-100 font-black uppercase tracking-widest text-[10px] px-5 flex items-center gap-1.5 border border-amber-100"
                                onClick={() => onAddAction && onAddAction(interview)}
                            >
                                <ArrowUpRight className="w-4 h-4" /> Action
                            </Button>
                        </>
                    )}
                    {isComp && (
                        <div className="flex items-center gap-3 pr-4">
                            <Button
                                variant="ghost"
                                onClick={() => onAddFeedback && onAddFeedback(interview)}
                                className="h-12 rounded-[16px] bg-purple-50 text-purple-600 hover:bg-purple-100 font-black uppercase tracking-widest text-[9px] px-5 flex items-center gap-1.5 border border-purple-100 shadow-sm transition-all"
                            >
                                <Sparkles className="w-3.5 h-3.5" /> View Feedback
                            </Button>
                            {!hasDecision && (
                                <Button
                                    variant="ghost"
                                    className="h-12 rounded-[16px] bg-amber-50 text-amber-700 hover:bg-amber-100 font-black uppercase tracking-widest text-[9px] px-5 flex items-center gap-1.5 border border-amber-100"
                                    onClick={() => onAddAction && onAddAction(interview)}
                                >
                                    <ArrowUpRight className="w-3.5 h-3.5" /> Action
                                </Button>
                            )}
                        </div>
                    )}
                    {isCanc && (
                        <div className="flex items-center gap-4 pr-4">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Cancelled</p>
                            <div className="w-12 h-12 rounded-[18px] flex items-center justify-center bg-slate-100 text-slate-300">
                                <XCircle className="w-6 h-6" />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

`;

    content = content.substring(0, cardStart) + newInterviewCard + content.substring(cardEnd + 1);
    console.log('✅ 4. Rewrote InterviewCard component');
} else {
    console.log('❌ 4. Could not find InterviewCard boundaries');
}

// ============================================================
// 5. REWRITE FeedbackModal — pure text save/view only (no actions)
// ============================================================
const fmStart = content.indexOf('function FeedbackModal(');
const fmEndMarker = '\n}'; // end of FeedbackModal
let fmEnd = -1;
if (fmStart > -1) {
    // Find the closing brace of FeedbackModal by counting braces
    let depth = 0;
    let inFunc = false;
    for (let i = fmStart; i < content.length; i++) {
        if (content[i] === '{') { depth++; inFunc = true; }
        if (content[i] === '}') depth--;
        if (inFunc && depth === 0) { fmEnd = i + 1; break; }
    }
}

if (fmStart > -1 && fmEnd > -1) {
    const newFeedbackModal = `function FeedbackModal({ onClose, interview, onSuccess }) {
    const [submitting, setSubmitting] = useState(false);
    const [feedbackText, setFeedbackText] = useState(interview.rawNotes || '');
    const hasSavedFeedback = !!interview.rawNotes;

    const handleSaveFeedback = async () => {
        if (!feedbackText.trim()) { toast.error("Please enter feedback notes"); return; }
        try {
            setSubmitting(true);
            const res = await fetch('/api/v1/admin/recruitment/interviews', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    candidateId: interview.candidateId,
                    interviewId: interview.interviewId,
                    updateData: { rawNotes: feedbackText, status: 'Completed' }
                })
            });
            const data = await res.json();
            if (data.success) {
                toast.success("Feedback saved successfully!");
                onSuccess(null);
            } else { throw new Error(data.error); }
        } catch (err) { toast.error(err.message); }
        finally { setSubmitting(false); }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-[12px]"
                onClick={onClose}
            />
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 30 }}
                className="bg-white rounded-[40px] w-full max-w-2xl shadow-4xl border border-white/20 overflow-hidden relative z-10 flex flex-col max-h-[90vh]"
            >
                <div className="p-8 border-b border-slate-100 shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white">
                                <MessageSquare className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase">
                                    {hasSavedFeedback ? 'View Feedback' : 'Save Feedback'}
                                </h2>
                                <p className="text-slate-500 text-xs font-medium uppercase tracking-widest mt-1">
                                    {interview.candidateName} — {interview.round || 'Post Session'}
                                </p>
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={onClose} className="rounded-xl w-10 h-10 hover:bg-slate-50">
                            <XCircle className="w-5 h-5 text-slate-400" />
                        </Button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50">
                    <div className="space-y-6">
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block pl-2">
                                📝 Interviewer Notes & Observations
                            </label>
                            <textarea
                                value={feedbackText}
                                readOnly={hasSavedFeedback}
                                onChange={(e) => setFeedbackText(e.target.value)}
                                placeholder="Enter the interviewer's detailed feedback here..."
                                className={\`w-full h-64 p-6 rounded-[32px] border border-slate-200 focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/5 text-slate-700 bg-white resize-none shadow-sm transition-all text-sm leading-relaxed \${hasSavedFeedback ? 'opacity-70 cursor-not-allowed bg-slate-50' : ''}\`}
                            />
                        </div>

                        {!hasSavedFeedback && (
                            <Button
                                onClick={handleSaveFeedback}
                                disabled={submitting || !feedbackText.trim()}
                                className="w-full h-14 rounded-2xl bg-indigo-600 text-white hover:bg-indigo-700 font-black text-[10px] uppercase tracking-widest shadow-lg flex items-center justify-center gap-2"
                            >
                                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                Save Feedback
                            </Button>
                        )}

                        {hasSavedFeedback && (
                            <div className="p-5 bg-emerald-50 rounded-3xl border border-emerald-100 text-center">
                                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center justify-center gap-2">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Feedback Recorded
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>
        </div>
    );
}`;

    content = content.substring(0, fmStart) + newFeedbackModal + content.substring(fmEnd);
    console.log('✅ 5. Rewrote FeedbackModal (pure text only)');
} else {
    console.log('❌ 5. Could not find FeedbackModal boundaries');
}

// ============================================================
// 6. ADD new ActionModal component (after FeedbackModal)
// ============================================================
const actionModal = `

function ActionModal({ onClose, interview, onSuccess }) {
    const [submitting, setSubmitting] = useState(false);
    const [showRoundPicker, setShowRoundPicker] = useState(false);

    const handleSubmitDecision = async (decision, nextRound = null) => {
        try {
            setSubmitting(true);
            
            let attachment = null;
            if (decision === 'Hired' || decision === 'Offer Sent') {
                const { generateOfferLetter } = await import('@/lib/pdf/offer-generator');
                attachment = generateOfferLetter({
                    candidateName: interview.candidateName,
                    jobTitle: interview.role || "Team Member",
                    salary: "As per Discussion",
                    joiningDate: "Immediate"
                });
                toast.info("Generating professional offer letter...");
            }

            const res = await fetch('/api/v1/admin/recruitment/interviews', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    candidateId: interview.candidateId,
                    interviewId: interview.interviewId,
                    updateData: {
                        decision,
                        status: 'Completed',
                        attachment,
                        ...(nextRound ? { nextRound } : {})
                    }
                })
            });

            const data = await res.json();
            if (data.success) {
                toast.success(\`Decision saved: \${decision === 'Promoted' ? 'Promoted to ' + nextRound : decision}!\`);
                onSuccess(decision === 'Promoted' ? { candidateId: interview.candidateId, nextRound } : null);
            } else { throw new Error(data.error); }
        } catch (err) { toast.error(err.message); }
        finally { setSubmitting(false); }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-[12px]"
                onClick={onClose}
            />
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 30 }}
                className="bg-white rounded-[40px] w-full max-w-lg shadow-4xl border border-white/20 overflow-hidden relative z-10"
            >
                <div className="p-8 border-b border-slate-100">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-amber-500 flex items-center justify-center text-white">
                                <ArrowUpRight className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase">Take Action</h2>
                                <p className="text-slate-500 text-xs font-medium uppercase tracking-widest mt-1">
                                    {interview.candidateName} — {interview.round || 'Current Round'}
                                </p>
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={onClose} className="rounded-xl w-10 h-10 hover:bg-slate-50">
                            <XCircle className="w-5 h-5 text-slate-400" />
                        </Button>
                    </div>
                </div>

                <div className="p-8 space-y-4">
                    {showRoundPicker ? (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                            <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest text-center border-b pb-4">Select Next Round</h4>
                            <div className="grid grid-cols-1 gap-3">
                                {['Technical Interview', 'Managerial Interview', 'HR Interview', 'Final Round'].map(round => (
                                    <Button 
                                        key={round}
                                        onClick={() => handleSubmitDecision('Promoted', round)}
                                        disabled={submitting}
                                        className="h-14 rounded-2xl border border-slate-100 hover:border-indigo-200 bg-white text-slate-700 hover:bg-indigo-50 font-bold text-xs shadow-sm flex items-center justify-between px-6"
                                    >
                                        {round} <ArrowRight className="w-4 h-4 text-indigo-400" />
                                    </Button>
                                ))}
                            </div>
                            <Button variant="ghost" onClick={() => setShowRoundPicker(false)} className="w-full text-slate-400 font-bold uppercase text-[10px]">← Back</Button>
                        </motion.div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            <Button
                                onClick={() => setShowRoundPicker(true)}
                                disabled={submitting}
                                className="h-16 rounded-2xl bg-slate-900 text-white hover:bg-slate-800 font-black text-xs uppercase tracking-widest shadow-lg flex items-center gap-3 px-6"
                            >
                                <ArrowUpRight className="w-5 h-5" /> Promote to Next Round
                            </Button>
                            <Button
                                onClick={() => handleSubmitDecision('Hired')}
                                disabled={submitting}
                                className="h-16 rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700 font-black text-xs uppercase tracking-widest shadow-lg flex items-center gap-3 px-6"
                            >
                                <Trophy className="w-5 h-5" /> Send Offer Letter
                            </Button>
                            <Button
                                onClick={() => handleSubmitDecision('On Hold')}
                                disabled={submitting}
                                className="h-16 rounded-2xl bg-amber-50 text-amber-700 hover:bg-amber-100 font-black text-xs uppercase tracking-widest flex items-center gap-3 px-6 border border-amber-200"
                            >
                                <Clock className="w-5 h-5" /> Hold / Draft
                            </Button>
                            <Button
                                onClick={() => handleSubmitDecision('Rejected')}
                                disabled={submitting}
                                className="h-16 rounded-2xl bg-white border-2 border-rose-200 text-rose-600 hover:bg-rose-50 font-black text-xs uppercase tracking-widest flex items-center gap-3 px-6"
                            >
                                <XCircle className="w-5 h-5" /> Reject Candidate
                            </Button>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
`;

// Insert ActionModal right after the end of FeedbackModal
const insertPoint = content.lastIndexOf('\n}');
if (insertPoint > -1) {
    content = content.substring(0, insertPoint + 2) + actionModal + content.substring(insertPoint + 2);
    console.log('✅ 6. Added ActionModal component');
} else {
    console.log('❌ 6. Could not find insert point for ActionModal');
}

// ============================================================
// 7. REMOVE promo logic from FeedbackModal onSuccess handler 
//    (moved to ActionModal now)
// ============================================================
const oldFMCallback = `onSuccess={async (promoData) => {
                            setShowFeedbackModal(false);
                            await fetchData();
                            
                            // 🚀 Auto-trigger next round scheduling if promoted
                            if (promoData && promoData.nextRound) {
                                toast.success("Opening scheduler for next round...");
                                setTimeout(() => {
                                    setShowScheduleModal({
                                        candidateId: promoData.candidateId,
                                        round: promoData.nextRound
                                    });
                                }, 500);
                            }
                        }}`;

const newFMCallback = `onSuccess={async () => {
                            setShowFeedbackModal(false);
                            await fetchData();
                        }}`;

if (content.includes(oldFMCallback)) {
    content = content.replace(oldFMCallback, newFMCallback);
    console.log('✅ 7. Simplified FeedbackModal callback');
} else {
    const crlfOld = oldFMCallback.replace(/\n/g, '\r\n');
    if (content.includes(crlfOld)) {
        content = content.replace(crlfOld, newFMCallback.replace(/\n/g, '\r\n'));
        console.log('✅ 7. Simplified FeedbackModal callback (CRLF)');
    } else { console.log('⚠️ 7. FeedbackModal callback not found (may already be simplified)'); }
}

// ============================================================
// 8. UPDATE History sections — Hired shows "Selection Vault", 
//    Rejected shows round info
// ============================================================
// Update rejected card to show round info - search for "Declined Archives"
const oldRejectedHeader = `Declined Archives`;
const newRejectedHeader = `Rejected Candidates`;
content = content.split(oldRejectedHeader).join(newRejectedHeader);
console.log('✅ 8. Renamed Declined Archives → Rejected Candidates');


writeFileSync(filePath, content, 'utf8');
console.log('\n🎉 ALL CHANGES APPLIED SUCCESSFULLY!');
console.log('File length:', content.length, 'chars');
