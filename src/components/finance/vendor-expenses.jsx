"use client";

import { useState, useEffect } from "react";
import { 
    Plus, Search, Filter, FileText, 
    MoreVertical, Trash2, Edit3, CheckCircle2, 
    Clock, AlertCircle, Loader2, IndianRupee,
    X, Save, Calendar, Upload
} from "lucide-react";
import { format } from "date-fns";
import toast, { Toaster } from "react-hot-toast";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const EXPENSE_CATEGORIES = [
    'IT Services', 'Office Supplies', 'Benefits Provider', 'Consultant', 
    'Travel', 'Software', 'Maintenance', 'Marketing', 'Legal', 'Other'
];

export default function VendorExpenses() {
    const [expenses, setExpenses] = useState([]);
    const [vendors, setVendors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    
    // CRUD States
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [selectedExpense, setSelectedExpense] = useState(null);
    const [showViewModal, setShowViewModal] = useState(false);

    const [formData, setFormData] = useState({
        vendor: "",
        invoiceNumber: "",
        invoiceDate: format(new Date(), 'yyyy-MM-dd'),
        category: "Other",
        description: "",
        totalAmount: 0,
        status: "Pending"
    });

    useEffect(() => {
        fetchExpenses();
        fetchVendors();
    }, []);

    const fetchExpenses = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/v1/admin/finance/vendors/invoices');
            const data = await res.json();
            setExpenses(data.invoices || []);
        } catch (error) {
            toast.error("Failed to load expenses");
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

    const handleOpenCreate = () => {
        setFormData({
            vendor: "",
            invoiceNumber: "",
            invoiceDate: format(new Date(), 'yyyy-MM-dd'),
            category: "Other",
            description: "",
            totalAmount: 0,
            status: "Pending"
        });
        setIsEditing(false);
        setEditingId(null);
        setShowModal(true);
    };

    const handleOpenEdit = (exp) => {
        setFormData({
            vendor: exp.vendor?._id || "",
            invoiceNumber: exp.invoiceNumber,
            invoiceDate: format(new Date(exp.invoiceDate), 'yyyy-MM-dd'),
            category: exp.category || "Other",
            description: exp.description || "",
            totalAmount: exp.totalAmount,
            status: exp.status || "Pending"
        });
        setIsEditing(true);
        setEditingId(exp._id);
        setShowModal(true);
    };

    const handleStatusChange = async (id, newStatus) => {
        try {
            const res = await fetch('/api/v1/admin/finance/vendors/invoices', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, status: newStatus })
            });
            if (!res.ok) throw new Error("Failed to update status");
            toast.success(`Bill marked as ${newStatus}`);
            fetchExpenses();
        } catch (error) {
            toast.error(error.message);
        }
    };

    const handleDeleteExpense = async (id) => {
        if (!confirm("Are you sure you want to delete this expense record?")) return;
        try {
            const res = await fetch(`/api/v1/admin/finance/vendors/invoices?id=${id}`, {
                method: 'DELETE'
            });
            if (!res.ok) throw new Error("Failed to delete expense");
            toast.success("Expense record deleted successfully");
            fetchExpenses();
            if (showViewModal && selectedExpense?._id === id) {
                setShowViewModal(false);
            }
        } catch (error) {
            toast.error(error.message);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.vendor || !formData.totalAmount || !formData.invoiceNumber) {
            toast.error("Please fill required fields (Vendor, Amount, Invoice #)");
            return;
        }

        try {
            setSubmitting(true);
            const url = '/api/v1/admin/finance/vendors/invoices';
            const method = isEditing ? 'PUT' : 'POST';
            const payload = isEditing 
                ? { id: editingId, ...formData, invoiceDate: new Date(formData.invoiceDate) }
                : { ...formData, invoiceDate: new Date(formData.invoiceDate) };

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error(isEditing ? "Failed to update expense" : "Failed to record expense");
            toast.success(isEditing ? "Expense updated successfully" : "Expense recorded successfully");
            setShowModal(false);
            fetchExpenses();
        } catch (error) {
            toast.error(error.message);
        } finally {
            setSubmitting(false);
        }
    };

    const getStatusStyle = (status) => {
        switch (status) {
            case 'Paid': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
            case 'Approved': return 'bg-indigo-50 text-indigo-600 border-indigo-100';
            case 'Pending': return 'bg-orange-50 text-orange-600 border-orange-100';
            case 'Cancelled': return 'bg-rose-50 text-rose-600 border-rose-100';
            default: return 'bg-slate-50 text-slate-600 border-slate-100';
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <Toaster />
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">Vendor Expenses</h3>
                    <p className="text-slate-500 text-xs font-medium">Track and approve bills from external providers.</p>
                </div>
                <button
                    onClick={handleOpenCreate}
                    className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-[1.2rem] text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                >
                    <Plus className="w-4 h-4" /> Record New Bill
                </button>
            </div>

            {/* List Table */}
            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-50 bg-slate-50/30 flex flex-col md:flex-row gap-4 justify-between">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                            placeholder="Search by vendor or invoice..." 
                            className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-indigo-500 transition-all shadow-sm"
                        />
                    </div>
                    <div className="flex gap-2">
                        <button className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-500 hover:text-indigo-600 transition-all"><Filter className="w-5 h-5" /></button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Vendor</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Invoice Details</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Category</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Amount</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                Array(3).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan="6" className="px-8 py-10 bg-slate-50/10"></td>
                                    </tr>
                                ))
                            ) : expenses.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-8 py-20 text-center text-slate-400 font-bold uppercase tracking-widest text-xs italic">
                                        No expense records found.
                                    </td>
                                </tr>
                            ) : (
                                expenses.map((exp) => (
                                    <tr key={exp._id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center font-black text-indigo-600 text-xs">
                                                    {exp.vendor?.name?.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-slate-900">{exp.vendor?.name}</p>
                                                    <p className="text-[10px] text-slate-500 font-bold">{exp.vendor?.companyName || 'N/A'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <p className="text-sm font-bold text-slate-800">#{exp.invoiceNumber}</p>
                                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{format(new Date(exp.invoiceDate), 'dd MMM yyyy')}</p>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className="px-3 py-1 bg-slate-100 rounded-lg text-[9px] font-black text-slate-500 uppercase tracking-tight">{exp.category}</span>
                                        </td>
                                        <td className="px-8 py-6 text-right font-black text-slate-900">
                                            ₹{exp.totalAmount.toLocaleString()}
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${getStatusStyle(exp.status)}`}>
                                                {exp.status}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={() => {
                                                        setSelectedExpense(exp);
                                                        setShowViewModal(true);
                                                    }}
                                                    title="View Bill Details"
                                                    className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-indigo-600 transition-all active:scale-95"
                                                >
                                                    <FileText className="w-4 h-4" />
                                                </button>
                                                
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <button className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-800 transition-all active:scale-95">
                                                            <MoreVertical className="w-4 h-4" />
                                                        </button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-44 bg-slate-900 border border-slate-800 text-slate-350 rounded-xl p-1 shadow-xl z-50">
                                                        <DropdownMenuItem 
                                                            onClick={() => handleOpenEdit(exp)}
                                                            className="flex items-center gap-2 hover:bg-slate-800 hover:text-white focus:bg-slate-800 focus:text-white rounded-lg px-3 py-2 text-xs font-bold transition-all cursor-pointer"
                                                        >
                                                            <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
                                                            Edit Bill
                                                        </DropdownMenuItem>
                                                        
                                                        {exp.status === 'Pending' && (
                                                            <DropdownMenuItem 
                                                                onClick={() => handleStatusChange(exp._id, 'Approved')}
                                                                className="flex items-center gap-2 hover:bg-slate-800 hover:text-white focus:bg-slate-800 focus:text-white rounded-lg px-3 py-2 text-xs font-bold transition-all cursor-pointer"
                                                            >
                                                                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
                                                                Approve Bill
                                                            </DropdownMenuItem>
                                                        )}
                                                        
                                                        {exp.status !== 'Paid' && (
                                                            <DropdownMenuItem 
                                                                onClick={() => handleStatusChange(exp._id, 'Paid')}
                                                                className="flex items-center gap-2 hover:bg-slate-800 hover:text-white focus:bg-slate-800 focus:text-white rounded-lg px-3 py-2 text-xs font-bold transition-all cursor-pointer"
                                                            >
                                                                <IndianRupee className="w-3.5 h-3.5 text-emerald-400" />
                                                                Mark as Paid
                                                            </DropdownMenuItem>
                                                        )}
                                                        
                                                        {exp.status !== 'Paid' && exp.status !== 'Cancelled' && (
                                                            <DropdownMenuItem 
                                                                onClick={() => handleStatusChange(exp._id, 'Cancelled')}
                                                                className="flex items-center gap-2 hover:bg-slate-800 hover:text-white focus:bg-slate-800 focus:text-white rounded-lg px-3 py-2 text-xs font-bold transition-all cursor-pointer"
                                                            >
                                                                <X className="w-3.5 h-3.5 text-rose-400" />
                                                                Cancel Bill
                                                            </DropdownMenuItem>
                                                        )}
                                                        
                                                        <DropdownMenuSeparator className="border-slate-800 my-1" />
                                                        
                                                        <DropdownMenuItem 
                                                            onClick={() => handleDeleteExpense(exp._id)}
                                                            className="flex items-center gap-2 text-rose-500 hover:bg-rose-950/20 hover:text-rose-400 focus:bg-rose-950/20 focus:text-rose-400 rounded-lg px-3 py-2 text-xs font-bold transition-all cursor-pointer"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                            Delete Record
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add Expense Modal */}
            {showModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300 border border-slate-100">
                        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3 uppercase tracking-tight">
                                    <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-100">
                                        <IndianRupee className="w-6 h-6 text-white" />
                                    </div>
                                    {isEditing ? "Modify Vendor Bill" : "Record Vendor Bill"}
                                </h2>
                            </div>
                            <button onClick={() => setShowModal(false)} className="p-3 hover:bg-white hover:shadow-md rounded-2xl transition-all text-slate-400 hover:text-slate-900">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-8 space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="col-span-2 md:col-span-1">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Select Vendor *</label>
                                    <select
                                        required
                                        value={formData.vendor}
                                        onChange={e => setFormData({ ...formData, vendor: e.target.value })}
                                        className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold outline-none focus:border-indigo-500 transition-all appearance-none"
                                    >
                                        <option value="">Choose a vendor</option>
                                        {vendors.map(v => (
                                            <option key={v._id} value={v._id}>{v.name} ({v.companyName || 'N/A'})</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="col-span-2 md:col-span-1">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Amount (₹) *</label>
                                    <div className="relative">
                                        <span className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-slate-400 text-lg">₹</span>
                                        <input
                                            required
                                            type="number"
                                            value={formData.totalAmount}
                                            onChange={e => setFormData({ ...formData, totalAmount: Number(e.target.value) })}
                                            className="w-full pl-12 pr-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-black outline-none focus:border-indigo-500 transition-all"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Invoice # *</label>
                                    <input
                                        required
                                        type="text"
                                        placeholder="INV-2024-001"
                                        value={formData.invoiceNumber}
                                        onChange={e => setFormData({ ...formData, invoiceNumber: e.target.value })}
                                        className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold outline-none focus:border-indigo-500 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Category</label>
                                    <select
                                        value={formData.category}
                                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                                        className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold outline-none focus:border-indigo-500 transition-all appearance-none"
                                    >
                                        {EXPENSE_CATEGORIES.map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Date</label>
                                    <div className="relative">
                                        <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input
                                            type="date"
                                            value={formData.invoiceDate}
                                            onChange={e => setFormData({ ...formData, invoiceDate: e.target.value })}
                                            className="w-full pl-12 pr-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold outline-none focus:border-indigo-500 transition-all"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Status Indicator</label>
                                    <div className="flex gap-2">
                                        {['Pending', 'Approved'].map(st => (
                                            <button
                                                key={st}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, status: st })}
                                                className={`flex-1 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${
                                                    formData.status === st 
                                                    ? 'bg-slate-900 border-slate-900 text-white' 
                                                    : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
                                                }`}
                                            >
                                                {st}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Description</label>
                                    <textarea
                                        rows="2"
                                        placeholder="What was this expense for?"
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                        className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold outline-none focus:border-indigo-500 transition-all resize-none"
                                    ></textarea>
                                </div>
                            </div>

                            <div className="pt-4 flex justify-end gap-4 border-t border-slate-50">
                                <button type="button" onClick={() => setShowModal(false)} className="px-8 py-4 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-all">Cancel</button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-10 py-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-indigo-100 flex items-center gap-2 disabled:opacity-70"
                                >
                                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    {submitting ? "Processing..." : "Save Record"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* View Details Modal */}
            {showViewModal && selectedExpense && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300 border border-slate-100">
                        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase">
                                    Bill Details
                                </h2>
                                <p className="text-xs text-slate-500 font-bold mt-0.5">#{selectedExpense.invoiceNumber}</p>
                            </div>
                            <button onClick={() => setShowViewModal(false)} className="p-3 hover:bg-white hover:shadow-md rounded-2xl transition-all text-slate-400 hover:text-slate-900">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-8 space-y-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vendor</p>
                                    <p className="text-base font-black text-slate-900 mt-1">{selectedExpense.vendor?.name}</p>
                                    <p className="text-xs font-bold text-slate-500 mt-0.5">{selectedExpense.vendor?.companyName || 'N/A'}</p>
                                </div>
                                <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border ${getStatusStyle(selectedExpense.status)}`}>
                                    {selectedExpense.status}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-5 rounded-2xl border border-slate-100">
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Invoice Date</p>
                                    <p className="text-xs font-bold text-slate-800 mt-1">
                                        {format(new Date(selectedExpense.invoiceDate), 'dd MMM yyyy')}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Category</p>
                                    <span className="inline-block mt-1 px-3 py-1 bg-white border border-slate-200 rounded-lg text-[9px] font-black text-slate-650 uppercase tracking-tight">
                                        {selectedExpense.category}
                                    </span>
                                </div>
                            </div>

                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount</p>
                                <p className="text-3xl font-black text-slate-900 mt-1">₹{selectedExpense.totalAmount.toLocaleString()}</p>
                            </div>

                            {selectedExpense.description && (
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Description</p>
                                    <p className="text-xs text-slate-600 font-medium leading-relaxed mt-1.5 p-4 bg-slate-50 rounded-2xl border border-slate-100/50">
                                        {selectedExpense.description}
                                    </p>
                                </div>
                            )}

                            <div className="pt-6 border-t border-slate-100 flex flex-wrap gap-2 justify-end">
                                {selectedExpense.status === 'Pending' && (
                                    <button 
                                        onClick={() => {
                                            handleStatusChange(selectedExpense._id, 'Approved');
                                            setShowViewModal(false);
                                        }}
                                        className="px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all"
                                    >
                                        Approve
                                    </button>
                                )}
                                {selectedExpense.status !== 'Paid' && (
                                    <button 
                                        onClick={() => {
                                            handleStatusChange(selectedExpense._id, 'Paid');
                                            setShowViewModal(false);
                                        }}
                                        className="px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all"
                                    >
                                        Mark as Paid
                                    </button>
                                )}
                                <button 
                                    onClick={() => {
                                        setShowViewModal(false);
                                        handleOpenEdit(selectedExpense);
                                    }}
                                    className="px-4 py-2.5 bg-slate-50 hover:bg-slate-150 text-slate-600 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all"
                                >
                                    Edit
                                </button>
                                <button 
                                    onClick={() => {
                                        setShowViewModal(false);
                                        handleDeleteExpense(selectedExpense._id);
                                    }}
                                    className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
