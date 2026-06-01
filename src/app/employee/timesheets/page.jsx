"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    CalendarDays,
    Save,
    Send,
    CheckCircle2,
    Calendar,
    Clock,
    Plus,
    X,
    Building,
    FileText,
    ListTodo,
    ChevronLeft,
    ChevronRight,
    Trash2,
    User,
    UserCheck,
    Users,
    AlertCircle,
    Info,
    CheckCircle
} from "lucide-react";
import { toast } from "sonner";
import { format, startOfWeek, addDays, isSameDay, parseISO } from "date-fns";
import { useSession } from "@/context/SessionContext";
import { useLanguage } from "@/context/LanguageContext";

/* ─── Premium Glass Card ─── */
const Card = ({ children, className = "" }) => (
    <div className={`bg-white rounded-2xl border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition-all duration-300 ${className}`}>
        {children}
    </div>
);

/* ─── Premium Stat Card ─── */
const StatCard = ({ title, value, subText, icon: Icon, color = "indigo" }) => {
    const colorStyles = {
        indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
        emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
        amber: "bg-amber-50 text-amber-600 border-amber-100",
        rose: "bg-rose-50 text-rose-600 border-rose-100"
    };

    return (
        <Card className="p-6">
            <div className="flex items-center justify-between">
                <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{title}</p>
                    <p className="text-3xl font-extrabold text-slate-800 tracking-tight">{value}</p>
                    <p className="text-xs font-medium text-slate-400">{subText}</p>
                </div>
                <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center ${colorStyles[color]} shadow-sm`}>
                    <Icon className="w-5 h-5" />
                </div>
            </div>
        </Card>
    );
};

/* ─── Status Badge ─── */
const StatusBadge = ({ status }) => {
    const styles = {
        'Draft': 'bg-slate-50 text-slate-700 border-slate-200',
        'Submitted': 'bg-blue-50 text-blue-700 border-blue-200',
        'Approved': 'bg-emerald-50 text-emerald-700 border-emerald-200',
        'Rejected': 'bg-rose-50 text-rose-700 border-rose-200'
    };

    return (
        <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide border ${styles[status] || 'bg-slate-50 text-slate-700 border-slate-200'}`}>
            {status}
        </span>
    );
};

export default function TimesheetsPage() {
    const { user, loading: sessionLoading } = useSession();
    const { t } = useLanguage();
    const router = useRouter();

    const [projects, setProjects] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [timesheet, setTimesheet] = useState(null);
    const [timesheetEntries, setTimesheetEntries] = useState([]);
    const [isSavingTimesheet, setIsSavingTimesheet] = useState(false);
    const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
    
    // Employee details & manager selection
    const [currentUserEmployee, setCurrentUserEmployee] = useState(null);
    const [reportingManager, setReportingManager] = useState(null);
    const [selectedManagerId, setSelectedManagerId] = useState("");

    const [weekStartDate, setWeekStartDate] = useState(() => {
        const d = new Date();
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
        const monday = new Date(d.setDate(diff));
        monday.setHours(0, 0, 0, 0);
        return monday;
    });

    // Helper: Days of the week
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStartDate, i));

    // Fetch projects
    const fetchProjects = async () => {
        try {
            const res = await fetch('/api/v1/employee/tasks/projects?status=Active');
            if (res.ok) {
                const data = await res.json();
                if (data.success) setProjects(data.projects);
            }
        } catch (error) {
            console.error("Error fetching projects:", error);
        }
    };

    // Fetch active employees (potential managers)
    const fetchEmployeesList = async () => {
        try {
            const res = await fetch('/api/v1/employee/payroll/employees?status=Active&limit=1000');
            if (res.ok) {
                const data = await res.json();
                if (data.employees) {
                    setEmployees(data.employees);
                }
            }
        } catch (error) {
            console.error("Error fetching employees:", error);
        }
    };

    // Fetch current employee's details (to auto-get reporting manager)
    const fetchEmployeeProfile = async (empId) => {
        try {
            const res = await fetch(`/api/v1/employee/payroll/employees/${empId}`);
            if (res.ok) {
                const data = await res.json();
                setCurrentUserEmployee(data);
                if (data.jobDetails?.reportingManager) {
                    setReportingManager(data.jobDetails.reportingManager);
                    setSelectedManagerId(data.jobDetails.reportingManager._id || data.jobDetails.reportingManager);
                }
            }
        } catch (error) {
            console.error("Error fetching employee profile:", error);
        }
    };

    // Fetch Timesheet
    const fetchTimesheet = async (empId, weekDate) => {
        try {
            const res = await fetch(`/api/v1/employee/tasks/timesheets?employeeId=${empId}&weekStartDate=${weekDate.toISOString()}`);
            if (res.ok) {
                const data = await res.json();
                if (data.success) {
                    setTimesheet(data.timesheet);
                    setTimesheetEntries(data.entries || []);
                    if (data.timesheet?.submittedTo) {
                        setSelectedManagerId(data.timesheet.submittedTo._id || data.timesheet.submittedTo);
                    }
                    return;
                }
            }
            setTimesheet(null);
            setTimesheetEntries([]);
        } catch (error) {
            console.error("Error fetching timesheet:", error);
        }
    };

    useEffect(() => {
        if (user?.id) {
            fetchProjects();
            fetchEmployeesList();
            fetchEmployeeProfile(user.id);
            fetchTimesheet(user.id, weekStartDate);
        }
    }, [user, weekStartDate]);

    const changeWeek = (offset) => {
        const newDate = new Date(weekStartDate);
        newDate.setDate(newDate.getDate() + (offset * 7));
        setWeekStartDate(newDate);
    };

    // Add entry inline to a specific day
    const handleAddEntryForDay = (date) => {
        if (timesheet?.status === 'Approved' || timesheet?.status === 'Submitted') {
            toast.error(`Cannot edit timesheet in ${timesheet?.status} status.`);
            return;
        }

        setTimesheetEntries([
            ...timesheetEntries,
            {
                project: '',
                date: date.toISOString(),
                hours: 8,
                description: ''
            }
        ]);
        toast.success(`Entry added for ${format(date, 'EEEE')}`);
    };

    const handleUpdateEntry = (index, field, value) => {
        const updated = [...timesheetEntries];
        updated[index][field] = value;
        setTimesheetEntries(updated);
    };

    const handleRemoveEntry = (index) => {
        const updated = timesheetEntries.filter((_, i) => i !== index);
        setTimesheetEntries(updated);
    };

    // Save as Draft or Submit
    const handleSaveTimesheet = async (isSubmit = false) => {
        if (isSubmit && timesheetEntries.length === 0) {
            toast.error("Please add at least one entry before submitting.");
            return;
        }

        // Validate entries
        const invalidEntry = timesheetEntries.find(e => !e.project || !e.date || !e.hours);
        if (invalidEntry) {
            toast.error("Please ensure all entries have a project, date, and hours specified.");
            return;
        }

        // Validate daily hour limits
        const dailyHours = {};
        timesheetEntries.forEach(e => {
            const dateStr = format(new Date(e.date), 'yyyy-MM-dd');
            dailyHours[dateStr] = (dailyHours[dateStr] || 0) + parseFloat(e.hours);
        });

        const overLoggedDate = Object.entries(dailyHours).find(([_, hrs]) => hrs > 24);
        if (overLoggedDate) {
            toast.error(`Hours on ${overLoggedDate[0]} cannot exceed 24. Currently: ${overLoggedDate[1]} hrs`);
            return;
        }

        setIsSavingTimesheet(true);
        try {
            const res = await fetch('/api/v1/employee/tasks/timesheets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    employee: user.id,
                    weekStartDate: weekStartDate.toISOString(),
                    entries: timesheetEntries,
                    status: isSubmit ? 'Submitted' : 'Draft',
                    submittedTo: selectedManagerId || null
                })
            });

            if (res.ok) {
                const data = await res.json();
                if (data.success) {
                    toast.success(isSubmit ? 'Timesheet Submitted successfully!' : 'Draft Saved successfully!');
                    fetchTimesheet(user.id, weekStartDate);
                    setIsSubmitModalOpen(false);
                } else {
                    toast.error(data.error || "Failed to save timesheet.");
                }
            } else {
                toast.error("Failed to save timesheet.");
            }
        } catch (error) {
            console.error("Error saving timesheet:", error);
            toast.error("An error occurred while saving.");
        } finally {
            setIsSavingTimesheet(false);
        }
    };

    if (sessionLoading || !user) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <div className="relative w-12 h-12">
                    <div className="absolute top-0 left-0 w-full h-full rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin"></div>
                </div>
                <p className="text-slate-500 font-medium text-sm">Loading timesheet workspace...</p>
            </div>
        );
    }

    // Metric summary calculations
    const totalHours = timesheetEntries.reduce((sum, e) => sum + (parseFloat(e.hours) || 0), 0);
    const projectsCount = new Set(timesheetEntries.map(e => e.project?._id || e.project).filter(Boolean)).size;
    const progressPercent = Math.min(100, Math.round((totalHours / 40) * 100));

    // Group entries by week days for rendering
    const getEntriesForDay = (date) => {
        return timesheetEntries.map((e, idx) => ({ ...e, index: idx }))
            .filter(e => isSameDay(new Date(e.date), date));
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-fade-in p-6 bg-slate-50/30 min-h-screen">
            
            {/* Header Banner - Staff Augmentation Premium Style */}
            <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-8 shadow-xl shadow-indigo-950/20 border border-slate-800">
                <div className="absolute -right-16 -top-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl"></div>
                <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl"></div>
                
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-2">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                            <Clock className="w-3.5 h-3.5" /> Timesheet Hub v2.0
                        </div>
                        <h1 className="text-3xl font-extrabold text-white tracking-tight">
                            Weekly Timesheet Workspace
                        </h1>
                        <p className="text-slate-400 text-sm max-w-xl">
                            Log hours daily, tag active client projects, and submit weekly timesheets directly to your reporting manager or admin for review.
                        </p>
                    </div>

                    <div className="flex items-center gap-4 bg-slate-800/80 backdrop-blur border border-slate-700/60 p-3 rounded-2xl">
                        <button 
                            onClick={() => changeWeek(-1)} 
                            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-xl transition-all"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <div className="text-center min-w-[150px]">
                            <p className="text-[10px] font-black uppercase text-indigo-400 tracking-wider">Week of</p>
                            <p className="text-sm font-bold text-white mt-0.5">
                                {format(weekStartDate, 'MMM dd')} - {format(addDays(weekStartDate, 6), 'MMM dd, yyyy')}
                            </p>
                        </div>
                        <button 
                            onClick={() => changeWeek(1)} 
                            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-xl transition-all"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Rejection alert banner */}
            {timesheet?.status === 'Rejected' && (
                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 flex items-start gap-4 shadow-sm animate-pulse-subtle">
                    <div className="p-2.5 bg-rose-100 text-rose-600 rounded-xl">
                        <AlertCircle className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                        <h4 className="font-extrabold text-rose-950 text-sm">Timesheet Rejected</h4>
                        <p className="text-xs text-rose-700 font-medium">
                            {timesheet.rejectionReason 
                                ? `Feedback from supervisor: "${timesheet.rejectionReason}"` 
                                : "Your timesheet was returned by your supervisor. Please review details, update hours, and resubmit."}
                        </p>
                    </div>
                </div>
            )}

            {/* Approved notification banner */}
            {timesheet?.status === 'Approved' && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex items-start gap-4 shadow-sm">
                    <div className="p-2.5 bg-emerald-100 text-emerald-600 rounded-xl">
                        <CheckCircle className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                        <h4 className="font-extrabold text-emerald-950 text-sm">Timesheet Approved</h4>
                        <p className="text-xs text-emerald-700 font-medium">
                            This weekly timesheet is finalized and verified by the manager. Changes are locked.
                        </p>
                    </div>
                </div>
            )}

            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard 
                    title="Total Logged Hours" 
                    value={`${totalHours} Hrs`} 
                    subText="Mon - Sun total logged"
                    icon={Clock} 
                    color="indigo" 
                />
                <StatCard 
                    title="Active Projects" 
                    value={projectsCount} 
                    subText="Distinct tagged projects"
                    icon={Building} 
                    color="amber" 
                />
                <Card className="p-6">
                    <div className="space-y-2">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Weekly Progress</p>
                        <div className="flex items-end justify-between">
                            <p className="text-3xl font-extrabold text-slate-800 tracking-tight">{progressPercent}%</p>
                            <p className="text-xs font-bold text-slate-400 mb-1">Target: 40 hrs</p>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden border border-slate-200/40">
                            <div 
                                className={`h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 transition-all duration-500`}
                                style={{ width: `${progressPercent}%` }}
                            ></div>
                        </div>
                    </div>
                </Card>
                <Card className="p-6 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Timesheet Status</p>
                            <div className="pt-2">
                                <StatusBadge status={timesheet?.status || 'Draft'} />
                            </div>
                        </div>
                        <div className="w-12 h-12 rounded-2xl border bg-slate-50 border-slate-100 flex items-center justify-center">
                            <CheckCircle2 className="w-5 h-5 text-slate-500" />
                        </div>
                    </div>
                    {timesheet?.submittedTo && (
                        <div className="text-[10px] text-slate-400 font-medium flex items-center gap-1 mt-2 border-t border-slate-50 pt-2">
                            <User className="w-3 h-3 text-indigo-500" />
                            Submitted to: <span className="font-extrabold text-slate-600">{`${timesheet.submittedTo.personalDetails?.firstName} ${timesheet.submittedTo.personalDetails?.lastName}`}</span>
                        </div>
                    )}
                </Card>
            </div>

            {/* Premium Day Cards View (Redesigned from simple tables) */}
            <div className="space-y-6">
                <div className="flex justify-between items-center border-b border-slate-200/60 pb-3">
                    <div>
                        <h2 className="text-xl font-black text-slate-800">Weekly Entries</h2>
                        <p className="text-xs font-medium text-slate-400">Review log logs mapped to daily schedules</p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.push('/employee/timesheet-approvals')}
                            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-50 border border-indigo-100 text-indigo-700 hover:bg-indigo-100 rounded-xl text-xs font-extrabold shadow-sm active:scale-[0.98] transition-all"
                        >
                            <Users className="w-4 h-4" /> Timesheet Approvals
                        </button>

                        <button
                            onClick={() => handleSaveTimesheet(false)}
                            disabled={isSavingTimesheet || timesheet?.status === 'Approved' || timesheet?.status === 'Submitted'}
                            className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-700 hover:text-slate-900 rounded-xl text-xs font-extrabold shadow-sm hover:bg-slate-50 active:scale-[0.98] transition-all disabled:opacity-50"
                        >
                            <Save className="w-4 h-4" /> Save Weekly Draft
                        </button>
                        
                        <button
                            onClick={() => setIsSubmitModalOpen(true)}
                            disabled={isSavingTimesheet || timesheet?.status === 'Approved' || timesheet?.status === 'Submitted'}
                            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl text-xs font-extrabold shadow-lg shadow-indigo-600/20 hover:from-indigo-500 hover:to-violet-500 active:scale-[0.98] transition-all disabled:opacity-50"
                        >
                            <Send className="w-4 h-4" /> Submit Timesheet
                        </button>
                    </div>
                </div>

                {/* Day-by-Day Cards Layout */}
                <div className="grid grid-cols-1 gap-6">
                    {weekDays.map((day) => {
                        const dayEntries = getEntriesForDay(day);
                        const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                        const formattedDateStr = format(day, 'EEE, MMM dd');

                        return (
                            <div 
                                key={day.toISOString()}
                                className={`rounded-2xl border p-6 transition-all bg-white ${
                                    isWeekend 
                                        ? 'border-dashed border-slate-200/80 bg-slate-50/20' 
                                        : 'border-slate-100 shadow-sm hover:border-indigo-100'
                                }`}
                            >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs ${
                                            isWeekend 
                                                ? 'bg-slate-100 text-slate-500' 
                                                : 'bg-indigo-50 text-indigo-600'
                                        }`}>
                                            {format(day, 'dd')}
                                        </div>
                                        <div>
                                            <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                                                {format(day, 'EEEE')}
                                                {isWeekend && <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-slate-100 text-slate-500 rounded">Weekend</span>}
                                            </h3>
                                            <p className="text-[11px] font-semibold text-slate-400 mt-0.5">{formattedDateStr}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-4">
                                        <span className="text-xs font-bold text-slate-400">
                                            Total: <span className="text-slate-700 font-extrabold">{dayEntries.reduce((s, e) => s + parseFloat(e.hours || 0), 0)} hrs</span>
                                        </span>
                                        <button
                                            onClick={() => handleAddEntryForDay(day)}
                                            disabled={timesheet?.status === 'Approved' || timesheet?.status === 'Submitted'}
                                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-extrabold text-indigo-600 bg-indigo-50 hover:bg-indigo-100/80 rounded-xl transition-all disabled:opacity-50"
                                        >
                                            <Plus className="w-3.5 h-3.5" /> Log Hours
                                        </button>
                                    </div>
                                </div>

                                {dayEntries.length === 0 ? (
                                    <div className="py-8 text-center text-slate-400 border border-dashed border-slate-100 rounded-xl bg-slate-50/20">
                                        <Clock className="w-6 h-6 mx-auto mb-2 opacity-30 text-slate-400" />
                                        <p className="text-xs font-medium text-slate-400">No entries logged for this day</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {dayEntries.map((entry) => (
                                            <div 
                                                key={entry.index}
                                                className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4 p-4 bg-slate-50/40 hover:bg-slate-50 border border-slate-100 rounded-2xl transition-all"
                                            >
                                                {/* Project Dropdown */}
                                                <div className="flex-1 min-w-[200px]">
                                                    <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Project</label>
                                                    <select
                                                        value={entry.project?._id || entry.project || ''}
                                                        onChange={(e) => handleUpdateEntry(entry.index, 'project', e.target.value)}
                                                        disabled={timesheet?.status === 'Approved' || timesheet?.status === 'Submitted'}
                                                        className="w-full p-2.5 bg-white border border-slate-200/80 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all disabled:opacity-70"
                                                    >
                                                        <option value="">Select a Project</option>
                                                        {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                                                    </select>
                                                </div>

                                                {/* Hours Input */}
                                                <div className="w-full lg:w-28">
                                                    <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Hours</label>
                                                    <input
                                                        type="number"
                                                        min="0.5"
                                                        step="0.5"
                                                        max="24"
                                                        value={entry.hours}
                                                        onChange={(e) => handleUpdateEntry(entry.index, 'hours', e.target.value)}
                                                        disabled={timesheet?.status === 'Approved' || timesheet?.status === 'Submitted'}
                                                        className="w-full p-2.5 bg-white border border-slate-200/80 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all disabled:opacity-70"
                                                    />
                                                </div>

                                                {/* Description Input */}
                                                <div className="flex-[2] min-w-[250px]">
                                                    <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Activity Log / Task Details</label>
                                                    <input
                                                        type="text"
                                                        placeholder="What deliverables did you work on?"
                                                        value={entry.description}
                                                        onChange={(e) => handleUpdateEntry(entry.index, 'description', e.target.value)}
                                                        disabled={timesheet?.status === 'Approved' || timesheet?.status === 'Submitted'}
                                                        className="w-full p-2.5 bg-white border border-slate-200/80 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all disabled:opacity-70"
                                                    />
                                                </div>

                                                {/* Action Button */}
                                                <div className="flex items-end justify-end shrink-0 pt-2 lg:pt-4">
                                                    <button
                                                        onClick={() => handleRemoveEntry(entry.index)}
                                                        disabled={timesheet?.status === 'Approved' || timesheet?.status === 'Submitted'}
                                                        className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all disabled:opacity-50 border border-transparent hover:border-rose-100"
                                                    >
                                                        <Trash2 className="w-4.5 h-4.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Timesheet Approval workflow timeline footer */}
            <Card className="p-6 bg-slate-900 border-none text-white overflow-hidden relative mt-8">
                <div className="absolute right-0 top-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl"></div>
                <div className="relative z-10 space-y-4">
                    <div>
                        <h4 className="text-xs font-black uppercase tracking-wider text-indigo-400">Approval Workflow Status</h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">Track the verification timeline for this weekly report</p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-10 pt-4 border-t border-slate-800">
                        {/* Step 1 */}
                        <div className="flex items-center gap-2.5">
                            <div className="w-6 h-6 rounded-full bg-indigo-500 text-white flex items-center justify-center text-[10px] font-black shadow-lg shadow-indigo-500/20">
                                1
                            </div>
                            <div>
                                <p className="text-xs font-bold">Draft Saved</p>
                                <p className="text-[9px] text-slate-400">Weekly entries editable</p>
                            </div>
                        </div>

                        <div className="hidden sm:block text-slate-600 font-black">→</div>

                        {/* Step 2 */}
                        <div className="flex items-center gap-2.5">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${
                                timesheet?.status === 'Submitted' || timesheet?.status === 'Approved'
                                    ? 'bg-indigo-500 text-white shadow-lg' 
                                    : 'bg-slate-800 text-slate-500 border border-slate-700'
                            }`}>
                                2
                            </div>
                            <div>
                                <p className="text-xs font-bold">Submitted</p>
                                <p className="text-[9px] text-slate-400">Locks entries, routing notification sent</p>
                            </div>
                        </div>

                        <div className="hidden sm:block text-slate-600 font-black">→</div>

                        {/* Step 3 */}
                        <div className="flex items-center gap-2.5">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${
                                timesheet?.status === 'Approved'
                                    ? 'bg-emerald-500 text-white shadow-lg' 
                                    : timesheet?.status === 'Rejected'
                                        ? 'bg-rose-500 text-white shadow-lg'
                                        : 'bg-slate-800 text-slate-500 border border-slate-700'
                            }`}>
                                3
                            </div>
                            <div>
                                <p className="text-xs font-bold">Manager Review</p>
                                <p className="text-[9px] text-slate-400">Verify hours or request corrections</p>
                            </div>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Submission Modal with Manager Selection */}
            {isSubmitModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white rounded-3xl max-w-lg w-full p-8 shadow-2xl border border-slate-100 flex flex-col space-y-6 animate-scale-up">
                        <div className="flex items-start justify-between">
                            <div className="space-y-1">
                                <h3 className="text-lg font-black text-slate-850">Submit Timesheet for Approval</h3>
                                <p className="text-xs font-medium text-slate-400">Review selected manager and confirm submission</p>
                            </div>
                            <button 
                                onClick={() => setIsSubmitModalOpen(false)}
                                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-xl transition-all"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="bg-indigo-50/60 border border-indigo-100/50 rounded-2xl p-5 space-y-3">
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-500 font-bold">Total Work Hours:</span>
                                <span className="text-indigo-700 font-extrabold">{totalHours} Hrs</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-500 font-bold">Work Period:</span>
                                <span className="text-slate-700 font-extrabold">
                                    {format(weekStartDate, 'MMM dd')} - {format(addDays(weekStartDate, 6), 'MMM dd, yyyy')}
                                </span>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
                                Verification Routing (Select Manager)
                            </label>
                            
                            {/* Manager profile summary */}
                            {selectedManagerId ? (
                                (() => {
                                    const selectedManager = employees.find(e => e._id === selectedManagerId);
                                    const name = selectedManager 
                                        ? `${selectedManager.personalDetails?.firstName} ${selectedManager.personalDetails?.lastName}` 
                                        : reportingManager 
                                            ? `${reportingManager.personalDetails?.firstName} ${reportingManager.personalDetails?.lastName}`
                                            : "Reporting Supervisor";
                                    const designation = selectedManager?.jobDetails?.designation || "Assigned Manager";

                                    return (
                                        <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-extrabold text-sm uppercase">
                                                {name.charAt(0)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-black text-slate-800 truncate">{name}</p>
                                                <p className="text-[10px] text-slate-400 font-medium truncate">{designation}</p>
                                            </div>
                                            <div className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-black bg-indigo-100 text-indigo-700 border border-indigo-200 uppercase">
                                                Auto Selected
                                            </div>
                                        </div>
                                    );
                                })()
                            ) : (
                                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 border-dashed">
                                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 font-extrabold text-sm">
                                        ?
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-black text-slate-500 truncate">No Manager Selected</p>
                                        <p className="text-[10px] text-slate-400 font-medium truncate">Timesheet will be submitted directly to Admin</p>
                                    </div>
                                </div>
                            )}

                            {/* Searchable/selectable dropdown list of managers */}
                            <div className="pt-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Change/Unselect Manager</label>
                                <select
                                    value={selectedManagerId}
                                    onChange={(e) => setSelectedManagerId(e.target.value)}
                                    className="w-full p-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                                >
                                    <option value="">No manager (Submit directly to Admin)</option>
                                    {employees.map(emp => {
                                        const label = `${emp.personalDetails?.firstName} ${emp.personalDetails?.lastName} (${emp.jobDetails?.designation || 'Staff'})`;
                                        return (
                                            <option key={emp._id} value={emp._id}>
                                                {label}
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                            <button
                                onClick={() => setIsSubmitModalOpen(false)}
                                className="flex-1 py-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 font-extrabold rounded-2xl text-xs transition-all active:scale-[0.98]"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleSaveTimesheet(true)}
                                disabled={isSavingTimesheet}
                                className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-extrabold rounded-2xl text-xs shadow-lg shadow-indigo-600/25 transition-all active:scale-[0.98]"
                            >
                                Confirm Submission
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
