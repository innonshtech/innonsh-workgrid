"use client";

import { useState, useEffect } from "react";
import { 
    Plus, Search, CreditCard, Clock, 
    MoreVertical, CheckCircle2, Loader2, 
    IndianRupee, X, Save, Calendar, Landmark,
    ArrowUpRight, Receipt
} from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";

export default function VendorPayments() {
    const [payments, setPayments] = useState([]);
    const [vendors, setVendors] = useState([]);
    const [pendingInvoices, setPendingInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        invoiceId: "",
        paymentMode: "Bank Transfer",
        referenceNumber: "",
        paymentDate: format(new Date(), 'yyyy-MM-dd')
    });

    useEffect(() => {
        fetchPayments();
        fetchVendors();
        fetchPendingInvoices();
    }, []);

    const fetchPayments = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/v1/admin/finance/vendors/invoices?status=Paid');
            const data = await res.json();
            setPayments(data.invoices || []);
        } catch (error) {
            toast.error("Failed to load payments");
        } finally {
            setLoading(false);
        }
    };

    const fetchVendors = async () => {
        try {
            const res = await fetch('/api/v1/admin/finance/vendors');
            const data = await res.json();
            setVendors(data.vendors || []);
        } catch (error) {
            console.error(error);
        }
    };

    const fetchPendingInvoices = async () => {
        try {
            const res = await fetch('/api/v1/admin/finance/vendors/invoices?status=Approved');
            const data = await res.json();
            setPendingInvoices(data.invoices || []);
        } catch (error) {
            console.error(error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.invoiceId || !formData.referenceNumber) {
            toast.error("Please fill required fields");
            return;
        }

        try {
            setSubmitting(true);
            const res = await fetch('/api/v1/admin/finance/vendors/invoices', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: formData.invoiceId,
                    status: 'Paid',
                    paymentDetails: {
                        paymentMode: formData.paymentMode,
                        referenceNumber: formData.referenceNumber,
                        paymentDate: new Date(formData.paymentDate)
                    }
                })
            });
            if (!res.ok) throw new Error("Failed to record payment");
            toast.success("Payment recorded successfully");
            setShowModal(false);
            fetchPayments();
            fetchPendingInvoices();
        } catch (error) {
            toast.error(error.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">Vendor Payouts</h3>
                    <p className="text-slate-500 text-xs font-medium">Clear pending dues and manage payment history.</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-[1.2rem] text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                >
                    <Plus className="w-4 h-4" /> Record Payment
                </button>
            </div>

            {/* List Table */}
            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-8 border-b border-slate-50 bg-slate-50/30 flex justify-between items-center">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                        <Clock className="w-4 h-4" /> Settlement History
                    </h4>
                    <div className="flex gap-2">
                        <button className="px-5 py-2 bg-white border border-slate-200 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-indigo-600 shadow-sm transition-all">This Month</button>
                        <button className="px-5 py-2 bg-white border border-slate-200 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-indigo-600 shadow-sm transition-all">All Time</button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Transaction Date</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Vendor / Entity</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Payment Mode</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Reference #</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Amount Paid</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Receipt</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                Array(3).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan="6" className="px-8 py-10 bg-slate-50/10"></td>
                                    </tr>
                                ))
                            ) : payments.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-8 py-20 text-center text-slate-400 font-bold uppercase tracking-widest text-xs italic">
                                        No payment history found.
                                    </td>
                                </tr>
                            ) : (
                                payments.map((pay) => (
                                    <tr key={pay._id} className="hover:bg-emerald-50/10 transition-colors group">
                                        <td className="px-8 py-6">
                                            <p className="text-sm font-black text-slate-900">{format(new Date(pay.paymentDetails?.paymentDate || pay.updatedAt), 'dd MMM yyyy')}</p>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{format(new Date(pay.paymentDetails?.paymentDate || pay.updatedAt), 'hh:mm a')}</p>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center font-black text-emerald-600 text-xs border border-emerald-100">
                                                    {pay.vendor?.name?.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-slate-900">{pay.vendor?.name}</p>
                                                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">INV: {pay.invoiceNumber}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                                <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{pay.paymentDetails?.paymentMode || 'Bank'}</p>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <p className="text-xs font-bold text-slate-500 bg-slate-50 px-3 py-1 rounded-lg inline-block">{pay.paymentDetails?.referenceNumber || 'N/A'}</p>
                                        </td>
                                        <td className="px-8 py-6 text-right font-black text-emerald-600 text-lg">
                                            ₹{pay.totalAmount.toLocaleString()}
                                        </td>
                                        <td className="px-8 py-6">
                                            <button className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-indigo-600 transition-all"><Receipt className="w-5 h-5" /></button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Record Payment Modal */}
            {showModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300 border border-slate-100">
                        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3 uppercase tracking-tight">
                                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100">
                                        <CheckCircle2 className="w-6 h-6 text-white" />
                                    </div>
                                    Clear Vendor Dues
                                </h2>
                            </div>
                            <button onClick={() => setShowModal(false)} className="p-3 hover:bg-white hover:shadow-md rounded-2xl transition-all text-slate-400 hover:text-slate-900">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-8 space-y-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Select Approved Invoice *</label>
                                    <select
                                        required
                                        value={formData.invoiceId}
                                        onChange={e => setFormData({ ...formData, invoiceId: e.target.value })}
                                        className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold outline-none focus:border-indigo-500 transition-all appearance-none"
                                    >
                                        <option value="">Choose an invoice</option>
                                        {pendingInvoices.map(inv => (
                                            <option key={inv._id} value={inv._id}>
                                                {inv.vendor?.name} - ₹{inv.totalAmount.toLocaleString()} (INV: {inv.invoiceNumber})
                                            </option>
                                        ))}
                                    </select>
                                    {pendingInvoices.length === 0 && (
                                        <p className="text-[10px] text-rose-500 font-bold mt-2 uppercase tracking-tight italic">No approved invoices awaiting payment.</p>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Payment Mode</label>
                                        <select
                                            value={formData.paymentMode}
                                            onChange={e => setFormData({ ...formData, paymentMode: e.target.value })}
                                            className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold outline-none focus:border-indigo-500 transition-all appearance-none"
                                        >
                                            <option value="Bank Transfer">Bank Transfer</option>
                                            <option value="UPI">UPI / GPay</option>
                                            <option value="Cash">Cash Payment</option>
                                            <option value="Cheque">Cheque</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Payment Date</label>
                                        <div className="relative">
                                            <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <input
                                                type="date"
                                                value={formData.paymentDate}
                                                onChange={e => setFormData({ ...formData, paymentDate: e.target.value })}
                                                className="w-full pl-12 pr-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold outline-none focus:border-indigo-500 transition-all"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Reference / Transaction ID *</label>
                                    <div className="relative">
                                        <Receipt className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input
                                            required
                                            type="text"
                                            placeholder="UTR Number / UPI Ref"
                                            value={formData.referenceNumber}
                                            onChange={e => setFormData({ ...formData, referenceNumber: e.target.value })}
                                            className="w-full pl-12 pr-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold outline-none focus:border-indigo-500 transition-all"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 flex justify-end gap-4 border-t border-slate-50">
                                <button type="button" onClick={() => setShowModal(false)} className="px-8 py-4 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-all">Cancel</button>
                                <button
                                    type="submit"
                                    disabled={submitting || pendingInvoices.length === 0}
                                    className="px-10 py-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-emerald-100 flex items-center gap-2 disabled:opacity-70"
                                >
                                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUpRight className="w-4 h-4" />}
                                    {submitting ? "Settling..." : "Confirm Settlement"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
