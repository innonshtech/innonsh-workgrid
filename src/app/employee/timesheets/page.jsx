"use client";

import React, { useState, useEffect } from "react";
import {
    CalendarDays,
    Save,
    Send,
    LogOut,
    CheckCircle2,
    Calendar,
    Clock,
    Plus,
    X,
    Building,
    FileText,
    ListTodo
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useSession } from "@/context/SessionContext";
import { useLanguage } from "@/context/LanguageContext";

const Card = ({ children, className = "" }) => (
    <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-300 ${className}`}>
        {children}
    </div>
);

const StatusBadge = ({ status, label }) => {
    const styles = {
        'Pending': 'bg-amber-50 text-amber-700 border-amber-200',
        'Approved': 'bg-emerald-50 text-emerald-700 border-emerald-200',
        'Rejected': 'bg-rose-50 text-rose-700 border-rose-200',
        'Earn': 'bg-emerald-50 text-emerald-700 border-emerald-200',
        'Use': 'bg-indigo-50 text-indigo-700 border-indigo-200',
        'Draft': 'bg-slate-50 text-slate-700 border-slate-200',
        'Submitted': 'bg-indigo-50 text-indigo-700 border-indigo-200'
    };
    return (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${styles[status]}`}>
            {label || status}
        </span>
    );
};

export default function TimesheetsPage() {
    const { user, loading: sessionLoading } = useSession();
    const { t } = useLanguage();

    const [projects, setProjects] = useState([]);
    const [timesheet, setTimesheet] = useState(null);
    const [timesheetEntries, setTimesheetEntries] = useState([]);
    const [isSavingTimesheet, setIsSavingTimesheet] = useState(false);
    const [weekStartDate, setWeekStartDate] = useState(() => {
        const d = new Date();
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
        const monday = new Date(d.setDate(diff));
        monday.setHours(0, 0, 0, 0);
        return monday;
    });

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

    const fetchTimesheet = async (empId, weekDate) => {
        try {
            const res = await fetch(`/api/v1/employee/tasks/timesheets?employeeId=${empId}&weekStartDate=${weekDate.toISOString()}`);
            if (res.ok) {
                const data = await res.json();
                if (data.success) {
                    setTimesheet(data.timesheet);
                    setTimesheetEntries(data.entries || []);
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
            fetchTimesheet(user.id, weekStartDate);
        }
    }, [user, weekStartDate]);

    const changeWeek = (offset) => {
        const newDate = new Date(weekStartDate);
        newDate.setDate(newDate.getDate() + (offset * 7));
        setWeekStartDate(newDate);
    };

    const handleSaveTimesheet = async (isSubmit = false) => {
        console.log("Saving timesheet button clicked. isSubmit:", isSubmit, "Entries count:", timesheetEntries.length);
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

        // Daily Hour Validation
        const dailyHours = {};
        timesheetEntries.forEach(e => {
            const dateStr = format(new Date(e.date), 'yyyy-MM-dd');
            dailyHours[dateStr] = (dailyHours[dateStr] || 0) + (parseFloat(e.hours) || 0);
        });

        const overLoggedDate = Object.entries(dailyHours).find(([date, hours]) => hours > 24);
        if (overLoggedDate) {
            toast.error(`Total hours for ${overLoggedDate[0]} cannot exceed 24 hours. Currently: ${overLoggedDate[1]} hrs`);
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
                    status: isSubmit ? 'Submitted' : 'Draft'
                })
            });
            if (res.ok) {
                const data = await res.json();
                if (data.success) {
                    toast.success(`Timesheet ${isSubmit ? 'Submitted' : 'Saved Draft'}!`);
                    fetchTimesheet(user.id, weekStartDate);
                } else {
                    toast.error(data.error || "Failed to save timesheet.");
                    console.error("Timesheet Save API Error:", data.error);
                }
            } else {
                toast.error("Network error while saving timesheet");
            }
        } catch (error) {
            toast.error("An unexpected error occurred while saving.");
            console.error("Timesheet Save Network Error:", error);
        } finally {
            setIsSavingTimesheet(false);
        }
    };

    const addTimesheetEntry = () => {
        setTimesheetEntries([...timesheetEntries, {
            project: '',
            date: new Date(weekStartDate).toISOString(),
            hours: 0,
            description: ''
        }]);
    };

    const updateTimesheetEntry = (index, field, value) => {
        const newEntries = [...timesheetEntries];
        newEntries[index][field] = value;
        setTimesheetEntries(newEntries);
    };

    const removeTimesheetEntry = (index) => {
        setTimesheetEntries(timesheetEntries.filter((_, i) => i !== index));
    };

    if (sessionLoading || !user) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="p-6 bg-slate-50 min-h-screen">
            <div className="max-w-7xl mx-auto space-y-8">

                <div className="flex justify-between items-center bg-white p-4 filter drop-shadow-sm rounded-xl border border-slate-200">
                    <div className="flex items-center gap-4">
                        <button onClick={() => changeWeek(-1)} className="p-2 hover:bg-slate-100 rounded-lg">←</button>
                        <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                            <CalendarDays className="w-4 h-4 text-indigo-600" />
                            {t("weekOf")} {format(weekStartDate, 'MMM dd, yyyy')}
                        </div>
                        <button onClick={() => changeWeek(1)} className="p-2 hover:bg-slate-100 rounded-lg">→</button>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => handleSaveTimesheet(false)}
                            disabled={isSavingTimesheet || timesheet?.status === 'Approved'}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 disabled:opacity-50"
                        >
                            <Save size={14} /> {t("saveDraft")}
                        </button>
                        <button
                            onClick={() => handleSaveTimesheet(true)}
                            disabled={isSavingTimesheet || timesheet?.status === 'Approved'}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 disabled:opacity-50"
                        >
                            <Send size={14} /> {t("submit")}
                        </button>
                    </div>
                </div>

                <Card className="p-0 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                                    <th className="p-4 w-64">{t("project")}</th>
                                    <th className="p-4 w-48">{t("date")}</th>
                                    <th className="p-4 w-24">{t("hours")}</th>
                                    <th className="p-4">{t("taskDescription")}</th>
                                    <th className="p-4 w-24 text-center">Billable</th>
                                    <th className="p-4 w-16 text-center">{t("action")}</th>
                                </tr>

                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {timesheetEntries.map((entry, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="p-4">
                                            <select
                                                required
                                                value={entry.project?._id || entry.project || ''}
                                                onChange={(e) => updateTimesheetEntry(idx, 'project', e.target.value)}
                                                disabled={timesheet?.status === 'Approved'}
                                                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                            >
                                                <option value="">{t("selectProject")}</option>
                                                {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                                            </select>
                                        </td>
                                        <td className="p-4">
                                            <input
                                                type="date"
                                                required
                                                value={entry.date ? new Date(entry.date).toISOString().split('T')[0] : ''}
                                                onChange={(e) => updateTimesheetEntry(idx, 'date', e.target.value)}
                                                disabled={timesheet?.status === 'Approved'}
                                                min={weekStartDate.toISOString().split('T')[0]}
                                                max={new Date(weekStartDate.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                                                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                            />
                                        </td>
                                        <td className="p-4">
                                            <input
                                                type="number"
                                                required
                                                min="0.5"
                                                step="0.5"
                                                max="24"
                                                value={entry.hours}
                                                onChange={(e) => updateTimesheetEntry(idx, 'hours', e.target.value)}
                                                disabled={timesheet?.status === 'Approved'}
                                                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                            />
                                        </td>
                                        <td className="p-4">
                                            <input
                                                type="text"
                                                required
                                                placeholder={t("whatDidYouWorkOn")}
                                                value={entry.description}
                                                onChange={(e) => updateTimesheetEntry(idx, 'description', e.target.value)}
                                                disabled={timesheet?.status === 'Approved'}
                                                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                            />
                                        </td>
                                        <td className="p-4 text-center">
                                            <button
                                                onClick={() => removeTimesheetEntry(idx)}
                                                disabled={timesheet?.status === 'Approved'}
                                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-50"
                                            >
                                                <X size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {timesheetEntries.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-slate-400 border-2 border-dashed border-slate-100 m-4 rounded-xl">
                                            <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                            <p className="text-sm font-medium">No hours logged this week</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    <div className="p-4 border-t border-slate-100 bg-slate-50">
                        <button
                            onClick={addTimesheetEntry}
                            disabled={timesheet?.status === 'Approved'}
                            className="flex items-center gap-2 px-4 py-2 text-indigo-600 bg-indigo-50 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-colors disabled:opacity-50"
                        >
                            <Plus size={16} /> Add New Entry
                        </button>
                    </div>
                </Card>

                <div className="flex justify-between items-center bg-slate-100/50 p-4 rounded-xl border border-dashed border-slate-200">
                    <div className="text-xs text-slate-500 font-medium">
                        Status: <StatusBadge status={timesheet?.status || 'Draft'} />
                        {timesheet?.status === 'Approved' && <span className="ml-2 text-emerald-600">Verified by Manager</span>}
                    </div>
                    <div className="text-sm font-black text-slate-900">
                        Total Hours: {timesheetEntries.reduce((acc, e) => acc + (parseFloat(e.hours) || 0), 0)} Hrs
                    </div>
                </div>
            </div>
        </div>
    );
}
