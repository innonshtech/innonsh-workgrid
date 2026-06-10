"use client";
import { useState, useEffect } from "react";
import { useSession } from "@/context/SessionContext";
import { useLanguage } from "@/context/LanguageContext";
import {
    Banknote,
    Plus,
    Search,
    CheckCircle2,
    XCircle,
    Clock,
    ChevronRight,
    Filter,
    DollarSign,
    Calendar,
    AlertCircle,
    Loader2,
    FileText
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export default function LoanManagementPage() {
    const { user } = useSession();
    const { t } = useLanguage();
    const [loans, setLoans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("my-loans"); // my-loans, manage-requests
    const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);

    // Fetch Loans
    const fetchLoans = async () => {
        try {
            setLoading(true);
            const res = await fetch("/api/v1/admin/payroll/loans", { cache: 'no-store' });
            const data = await res.json();
            if (res.ok) {
                setLoans(data.loans);
            } else {
                toast.error(data.message || "Failed to fetch loans");
            }
        } catch (error) {
            toast.error("Error loading loans");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) {
            // If admin, default to manage-requests? No, let them choose.
            if (user.role === 'admin') setActiveTab('manage-requests');
            fetchLoans();
        }
    }, [user]);

    // Handle Approve/Reject
    const handleStatusUpdate = async (id, status, reason = "") => {
        try {
            const res = await fetch(`/api/v1/admin/payroll/loans/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status, rejectionReason: reason }),
            });
            const data = await res.json();
            if (res.ok) {
                toast.success(`Loan ${status} successfully`);
                fetchLoans();
            } else {
                toast.error(data.message || "Update failed");
            }
        } catch (error) {
            toast.error("Error updating loan");
        }
    };

    // Filtered Loans
    const myLoans = loans.filter(l => {
        const loanEmpId = l.employee?._id || l.employee;
        return loanEmpId?.toString() === user?.id?.toString();
    });
    const allLoans = loans; // For admin

    return (
        <div className="p-6 space-y-6">
            {/* Header row with Title and Button aligned on same line */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 mt-2">
                <div className="space-y-1">
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                        Employee Loans
                    </h1>
                    <p className="text-slate-500 text-sm mt-1 max-w-xl">
                        Track loan applications, approvals, repayment schedules and balances.
                    </p>
                </div>
                <div className="flex shrink-0">
                    <button
                        onClick={() => setIsRequestModalOpen(true)}
                        className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors font-medium text-sm shadow-sm"
                    >
                        <Plus size={18} />
                        {t("requestLoan") || "Request Loan/Advance"}
                    </button>
                </div>
            </div>

            {/* Tabs for Admin */}
            {user?.role === "admin" && (
                <div className="flex border-b border-slate-200">
                    <button
                        onClick={() => setActiveTab("manage-requests")}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "manage-requests"
                            ? "border-indigo-600 text-indigo-600"
                            : "border-transparent text-slate-500 hover:text-slate-700"
                            }`}
                    >
                        {t("loanRequests") || "Manage Requests"}
                    </button>
                    <button
                        onClick={() => setActiveTab("my-loans")}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "my-loans"
                            ? "border-indigo-600 text-indigo-600"
                            : "border-transparent text-slate-500 hover:text-slate-700"
                            }`}
                    >
                        {t("myLoans") || "My Loans"}
                    </button>
                </div>
            )}

            {/* Redesigned Stats Cards (matching 4th image theme & 1st image layout) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {/* Active Loans Card */}
                <div className="bg-white p-5 rounded-3xl border border-slate-200/70 shadow-sm flex flex-col justify-between min-h-[160px] transition-all hover:shadow-md">
                    <div className="flex items-center justify-between">
                        <div className="w-10 h-10 bg-blue-50/80 text-blue-600 rounded-2xl flex items-center justify-center">
                            <Banknote size={20} />
                        </div>
                        <span className="bg-slate-100 text-slate-500 font-bold uppercase tracking-wider text-[9px] px-2.5 py-1 rounded-full">
                            ACTIVE LOANS
                        </span>
                    </div>
                    <div className="mt-4">
                        <p className="text-3xl font-bold text-slate-900 leading-none">
                            {(activeTab === 'manage-requests' ? allLoans : myLoans).filter(l => l.status === 'Approved').length}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-1.5 font-medium">Active Loan Accounts</p>
                    </div>
                    <div className="border-t border-slate-100 mt-3 pt-3 flex items-center justify-between text-xs text-slate-400 font-medium">
                        <span>Total Active</span>
                        <span className="font-semibold text-slate-700">{(activeTab === 'manage-requests' ? allLoans : myLoans).filter(l => l.status === 'Approved').length}</span>
                    </div>
                </div>

                {/* Pending Requests Card */}
                <div className="bg-white p-5 rounded-3xl border border-slate-200/70 shadow-sm flex flex-col justify-between min-h-[160px] transition-all hover:shadow-md">
                    <div className="flex items-center justify-between">
                        <div className="w-10 h-10 bg-amber-50/80 text-amber-600 rounded-2xl flex items-center justify-center">
                            <Clock size={20} />
                        </div>
                        <span className="bg-slate-100 text-slate-500 font-bold uppercase tracking-wider text-[9px] px-2.5 py-1 rounded-full">
                            PENDING REQUESTS
                        </span>
                    </div>
                    <div className="mt-4">
                        <p className="text-3xl font-bold text-slate-900 leading-none">
                            {(activeTab === 'manage-requests' ? allLoans : myLoans).filter(l => l.status === 'Pending').length}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-1.5 font-medium">Awaiting Admin Approval</p>
                    </div>
                    <div className="border-t border-slate-100 mt-3 pt-3 flex items-center justify-between text-xs text-slate-400 font-medium">
                        <span>Total: {(activeTab === 'manage-requests' ? allLoans : myLoans).filter(l => l.status === 'Pending').length}</span>
                        <span className="text-blue-600 hover:underline flex items-center gap-1 cursor-pointer">
                            viewAll <ChevronRight size={12} />
                        </span>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50/50 border-b border-slate-100">
                            <tr>
                                {activeTab === 'manage-requests' && <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-left">Employee</th>}
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-left">Type</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-left">Amount</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-left">Reason</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-left">Date</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-left">Status</th>
                                {activeTab === 'manage-requests' && <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-left">Actions</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {(activeTab === 'manage-requests' ? allLoans : myLoans).length === 0 ? (
                                <tr>
                                    <td colSpan={10} className="px-6 py-8 text-center text-slate-500">No records found</td>
                                </tr>
                            ) : (
                                (activeTab === 'manage-requests' ? allLoans : myLoans).map((loan) => (
                                    <tr key={loan._id} className="hover:bg-slate-50/50 transition-colors">
                                        {activeTab === 'manage-requests' && (
                                            <td className="px-6 py-4 font-medium text-slate-900">
                                                {loan.employee?.name || "Unknown"}
                                                <div className="text-xs text-slate-500">{loan.employee?.email}</div>
                                            </td>
                                        )}
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${loan.type === 'Advance' ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700'
                                                }`}>
                                                {loan.type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-semibold text-slate-900">
                                            {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(loan.amount)}
                                            {loan.installments > 1 && <div className="text-xs text-slate-500">{loan.installments} installments</div>}
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 max-w-xs truncate" title={loan.reason}>{loan.reason}</td>
                                        <td className="px-6 py-4 text-slate-600">
                                            {new Date(loan.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <Badge className={`${loan.status === 'Approved' ? 'bg-green-100 text-green-700 hover:bg-green-200' :
                                                loan.status === 'Rejected' ? 'bg-red-100 text-red-700 hover:bg-red-200' :
                                                    loan.status === 'Repaid' ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200' :
                                                        'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                                                } border-0`}>
                                                {loan.status}
                                            </Badge>
                                        </td>
                                        {activeTab === 'manage-requests' && (
                                            <td className="px-6 py-4">
                                                {loan.status === 'Pending' && (
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => handleStatusUpdate(loan._id, 'Approved')}
                                                            className="p-1.5 bg-green-50 text-green-600 rounded hover:bg-green-100" title="Approve">
                                                            <CheckCircle2 size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleStatusUpdate(loan._id, 'Rejected', 'Rejected by admin')}
                                                            className="p-1.5 bg-red-50 text-red-600 rounded hover:bg-red-100" title="Reject">
                                                            <XCircle size={16} />
                                                        </button>
                                                    </div>
                                                )}
                                                {loan.status === 'Approved' && (
                                                    <button
                                                        onClick={() => handleStatusUpdate(loan._id, 'Repaid')}
                                                        className="text-xs text-indigo-600 hover:underline">
                                                        Mark Repaid
                                                    </button>
                                                )}
                                            </td>
                                        )}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Request Modal */}
            {isRequestModalOpen && (
                <RequestLoanModal
                    isOpen={isRequestModalOpen}
                    onClose={() => setIsRequestModalOpen(false)}
                    onSuccess={() => { fetchLoans(); setIsRequestModalOpen(false); }}
                />
            )}
        </div>
    );
}

function RequestLoanModal({ isOpen, onClose, onSuccess }) {
    const [formData, setFormData] = useState({
        amount: "",
        type: "Advance",
        reason: "",
        installments: 1
    });
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const res = await fetch("/api/v1/admin/payroll/loans", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...formData,
                    installments: formData.type === 'Advance' ? 1 : formData.installments
                })
            });
            const data = await res.json();
            if (res.ok) {
                toast.success("Request submitted successfully");
                onSuccess();
            } else {
                toast.error(data.message || "Failed to submit request");
            }
        } catch (err) {
            toast.error("Something went wrong");
        } finally {
            setSubmitting(false);
        }
    };

    const amountVal = parseFloat(formData.amount) || 0;
    const installmentVal = formData.type === 'Advance' ? 1 : (parseInt(formData.installments) || 1);
    const monthlyDeduction = amountVal > 0 ? Math.round(amountVal / installmentVal) : 0;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h3 className="font-semibold text-lg text-slate-900">Request Loan/Advance</h3>
                    <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-full transition-colors"><XCircle size={20} className="text-slate-500" /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Type</label>
                        <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="radio" name="type" value="Advance" checked={formData.type === 'Advance'} onChange={e => setFormData({ ...formData, type: e.target.value, installments: 1 })} className="text-indigo-600 focus:ring-indigo-500" />
                                <span className="text-sm text-slate-700">Salary Advance</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="radio" name="type" value="Loan" checked={formData.type === 'Loan'} onChange={e => setFormData({ ...formData, type: e.target.value })} className="text-indigo-600 focus:ring-indigo-500" />
                                <span className="text-sm text-slate-700">Loan</span>
                            </label>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Amount (₹)</label>
                        <input
                            type="number"
                            required
                            min="1"
                            value={formData.amount}
                            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                            placeholder="e.g. 50000"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Installments (Months)</label>
                        <input
                            type="number"
                            required
                            min="1"
                            max="36"
                            disabled={formData.type === 'Advance'}
                            value={formData.type === 'Advance' ? 1 : formData.installments}
                            onChange={(e) => setFormData({ ...formData, installments: e.target.value })}
                            className={`w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all ${
                                formData.type === 'Advance' ? 'bg-slate-50 text-slate-400 cursor-not-allowed' : ''
                            }`}
                        />
                        <p className="text-xs text-slate-500">For Salary Advance, installments are fixed to 1 month.</p>
                    </div>

                    {amountVal > 0 && (
                        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 flex items-start gap-2.5">
                            <AlertCircle size={18} className="text-indigo-600 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-xs text-indigo-700 font-semibold uppercase tracking-wider">Estimated Repayment Preview</p>
                                <p className="text-sm text-indigo-950 font-semibold mt-0.5">
                                    Deduction of <span className="text-indigo-600">₹{new Intl.NumberFormat('en-IN').format(monthlyDeduction)}</span> / month for <span className="text-indigo-600">{installmentVal} {installmentVal === 1 ? 'month' : 'months'}</span>.
                                </p>
                                <p className="text-[11px] text-slate-500 mt-1">Deductions are automatically processed via payroll (0% interest).</p>
                            </div>
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Reason</label>
                        <textarea
                            required
                            value={formData.reason}
                            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all resize-none h-24"
                            placeholder="Explain why you need this loan..."
                        />
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed">
                            {submitting && <Loader2 size={16} className="animate-spin" />}
                            Submit Request
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
