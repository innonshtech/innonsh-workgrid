'use client';

import { useState, useEffect } from 'react';
import {
    Users, Target, Award,
    BarChart3, Search, Filter,
    Loader2, Plus, ChevronRight,
    MoreVertical, Star, CheckCircle2,
    AlertCircle, TrendingUp, TrendingDown,
    Activity, BookOpen, MapPin
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';

export default function AdminTalentHub() {
    const [activeTab, setActiveTab] = useState('appraisals'); // 'appraisals', 'goals', 'skills'
    const [loading, setLoading] = useState(true);
    const [employees, setEmployees] = useState([]);
    const [appraisals, setAppraisals] = useState([]);
    const [goals, setGoals] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchTalentData();
    }, [activeTab]);

    const fetchTalentData = async () => {
        try {
            setLoading(true);
            const [empRes, appRes, goalRes] = await Promise.all([
                fetch('/api/v1/admin/payroll/employees?limit=1000&status=Active'),
                fetch(`/api/talent/appraisals`),
                fetch(`/api/talent/goals`)
            ]);

            const empData = await empRes.json();
            const appData = await appRes.json();
            const goalData = await goalRes.json();

            setEmployees(empData.employees || []);
            setAppraisals(appData.appraisals || []);
            setGoals(goalData.goals || []);
        } catch (error) {
            toast.error("Error loading admin talent data");
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'Completed': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
            case 'Manager-Review': return 'bg-slate-50 text-blue-700 border-blue-100';
            case 'Self-Appraisal': return 'bg-purple-50 text-purple-700 border-purple-100';
            default: return 'bg-slate-50 text-slate-600 border-slate-100';
        }
    };

    const [showGoalModal, setShowGoalModal] = useState(false);
    const [showAppraisalModal, setShowAppraisalModal] = useState(false);
    const [showSkillModal, setShowSkillModal] = useState(false);
    const [showCareerModal, setShowCareerModal] = useState(false);

    // Derived State for Search Filtering
    const filteredAppraisals = appraisals.filter(app => {
        const term = searchQuery.toLowerCase();
        const name = `${app.employee?.personalDetails?.firstName} ${app.employee?.personalDetails?.lastName}`.toLowerCase();
        return name.includes(term);
    });

    const filteredGoals = goals.filter(goal => {
        const term = searchQuery.toLowerCase();
        const title = goal.title?.toLowerCase() || '';
        const name = `${goal.employee?.personalDetails?.firstName} ${goal.employee?.personalDetails?.lastName}`.toLowerCase();
        return title.includes(term) || name.includes(term);
    });

    const allSkills = ['React', 'Node.js', 'System Design', 'Leadership', 'Communication', 'Strategic Thinking', 'Agile', 'Cloud'];
    const filteredSkills = allSkills.filter(skill => skill.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header Panel */}
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-100">
                            <Award className="w-8 h-8" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-slate-900">Talent Management Hub</h1>
                            <p className="text-sm text-slate-500 mt-1">Nurturing excellence and tracking organizational growth</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                        {[
                            { id: 'appraisals', name: 'Appraisals', icon: Award },
                            { id: 'goals', name: 'Team Goals', icon: Target },
                            { id: 'skills', name: 'Skill Matrix', icon: Activity }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-6 py-2.5 text-xs font-black rounded-xl transition-all ${activeTab === tab.id
                                    ? 'bg-white text-indigo-600 shadow-lg shadow-indigo-100/50 border border-slate-200'
                                    : 'text-slate-500 hover:text-slate-800'
                                    }`}
                            >
                                <tab.icon className="w-3.5 h-3.5" />
                                {tab.name}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-32 flex flex-col items-center justify-center space-y-6">
                        <div className="relative">
                            <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
                            <div className="absolute inset-0 bg-indigo-600/10 rounded-full blur-xl animate-pulse"></div>
                        </div>
                        <p className="text-sm font-black text-indigo-900/40 uppercase tracking-[0.2em]">Synchronizing Talent Data...</p>
                    </div>
                ) : (
                    <div className="p-0">
                        {/* Dynamic Sub-header Based on Tab */}
                        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/30">
                            <div className="relative group flex-1 max-w-md">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                <input
                                    type="text"
                                    placeholder={`Search ${activeTab === 'appraisals' ? 'appraisals' : activeTab === 'goals' ? 'goals' : 'skills'}...`}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                                />
                            </div>
                            <div className="flex gap-2">
                                <button className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all border border-slate-200">
                                    <Filter className="w-3.5 h-3.5" /> Filter
                                </button>
                                {activeTab === 'skills' && (
                                    <button
                                        onClick={() => setShowCareerModal(true)}
                                        className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-lg shadow-emerald-100 transition-all"
                                    >
                                        <MapPin className="w-3.5 h-3.5" /> Set Roadmap
                                    </button>
                                )}
                                <button
                                    onClick={() => {
                                        if (activeTab === 'appraisals') setShowAppraisalModal(true);
                                        if (activeTab === 'goals') setShowGoalModal(true);
                                        if (activeTab === 'skills') setShowSkillModal(true);
                                    }}
                                    className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-lg shadow-indigo-100 transition-all"
                                >
                                    <Plus className="w-3.5 h-3.5" /> {activeTab === 'appraisals' ? 'Start Cycle' : activeTab === 'goals' ? 'Assign Goal' : 'Update Matrix'}
                                </button>
                            </div>
                        </div>

                        {activeTab === 'appraisals' && (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50/50">
                                            <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Employee</th>
                                            <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Review Period</th>
                                            <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Stage</th>
                                            <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Score</th>
                                            <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Date</th>
                                            <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {filteredAppraisals.length === 0 ? (
                                            <tr><td colSpan="6" className="p-20 text-center text-slate-400 font-bold italic">No matching appraisals found</td></tr>
                                        ) : (
                                            filteredAppraisals.map((app) => (
                                                <tr key={app._id} className="hover:bg-slate-50/50 transition-colors group">
                                                    <td className="p-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 font-black text-xs border border-indigo-100 uppercase tracking-tighter">
                                                                {app.employee?.personalDetails?.firstName[0]}{app.employee?.personalDetails?.lastName[0]}
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-black text-slate-900 group-hover:text-indigo-600 transition-colors">
                                                                    {app.employee?.personalDetails?.firstName} {app.employee?.personalDetails?.lastName}
                                                                </p>
                                                                <p className="text-[10px] text-slate-500 font-mono tracking-tighter">{app.employee?.employeeId}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-4">
                                                        <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded-lg">{app.period}</span>
                                                    </td>
                                                    <td className="p-4">
                                                        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black border uppercase tracking-tighter ${getStatusBadge(app.status)}`}>
                                                            {app.status.replace('-', ' ')}
                                                        </div>
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="flex items-center gap-1">
                                                            <Star className={`w-3.5 h-3.5 ${app.overallScore >= 4 ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
                                                            <span className="text-sm font-black text-slate-900">{app.overallScore.toFixed(2)}</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-4">
                                                        <p className="text-xs font-medium text-slate-500">{format(new Date(app.updatedAt), 'MMM dd, yyyy')}</p>
                                                    </td>
                                                    <td className="p-4">
                                                        <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all">
                                                            <ChevronRight className="w-5 h-5" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {activeTab === 'goals' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
                                {filteredGoals.length === 0 ? (
                                    <div className="col-span-full py-20 text-center text-slate-400 font-bold italic">No matching goals found</div>
                                ) : (
                                    filteredGoals.map((goal) => (
                                        <div key={goal._id} className="p-6 bg-white border border-slate-200 rounded-3xl hover:border-indigo-100 hover:shadow-xl hover:shadow-indigo-100/30 transition-all group relative overflow-hidden">
                                            <div className="flex justify-between items-start mb-6">
                                                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                                    <Target className="w-5 h-5" />
                                                </div>
                                                <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border uppercase tracking-tighter ${goal.priority === 'Critical' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                                    'bg-slate-50 text-blue-600 border-blue-100'
                                                    }`}>
                                                    {goal.priority}
                                                </span>
                                            </div>
                                            <h5 className="text-sm font-black text-slate-900 mb-2 truncate group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{goal.title}</h5>
                                            <p className="text-xs text-slate-500 line-clamp-2 mb-6 leading-relaxed italic">"{goal.description}"</p>

                                            <div className="flex items-center gap-3 mb-6 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                                                <div className="w-8 h-8 bg-white border border-slate-100 rounded-full flex items-center justify-center text-[10px] font-black text-indigo-600">
                                                    {goal.employee?.personalDetails?.firstName[0]}
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black text-slate-900 leading-none">{goal.employee?.personalDetails?.firstName} {goal.employee?.personalDetails?.lastName}</p>
                                                    <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">{goal.category}</p>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                    <span>Completion</span>
                                                    <span className="text-indigo-600">{goal.progress}%</span>
                                                </div>
                                                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                                    <div
                                                        className="bg-indigo-600 h-full rounded-full group-hover:bg-[#FB9D00] transition-all duration-700"
                                                        style={{ width: `${goal.progress}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {activeTab === 'skills' && (
                            <div className="p-8 space-y-12">
                                {/* Skill Gap Analysis Stats */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                    <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 group hover:bg-white hover:shadow-xl transition-all">
                                        <div className="flex items-center gap-4 mb-4">
                                            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                                <TrendingUp className="w-6 h-6" />
                                            </div>
                                            <h4 className="text-sm font-black text-slate-900">Skill Growth</h4>
                                        </div>
                                        <p className="text-3xl font-black text-slate-900">+18%</p>
                                        <p className="text-xs text-slate-500 mt-1">Average proficiency increase QoQ</p>
                                    </div>

                                    <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 group hover:bg-white hover:shadow-xl transition-all">
                                        <div className="flex items-center gap-4 mb-4">
                                            <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl group-hover:bg-rose-600 group-hover:text-white transition-all">
                                                <AlertCircle className="w-6 h-6" />
                                            </div>
                                            <h4 className="text-sm font-black text-slate-900">Critical Gaps</h4>
                                        </div>
                                        <p className="text-3xl font-black text-slate-900">4</p>
                                        <p className="text-xs text-slate-500 mt-1">Departments below target matrix</p>
                                    </div>

                                    <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 group hover:bg-white hover:shadow-xl transition-all">
                                        <div className="flex items-center gap-4 mb-4">
                                            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:bg-emerald-600 group-hover:text-white transition-all">
                                                <CheckCircle2 className="w-6 h-6" />
                                            </div>
                                            <h4 className="text-sm font-black text-slate-900">Certifications</h4>
                                        </div>
                                        <p className="text-3xl font-black text-slate-900">24</p>
                                        <p className="text-xs text-slate-500 mt-1">New badges verified this month</p>
                                    </div>
                                </div>

                                {/* Quick Skill Look-up */}
                                <div className="space-y-6">
                                    <h4 className="font-black text-slate-900 flex items-center gap-2">
                                        <BookOpen className="w-5 h-5 text-indigo-600" />
                                        Organizational Skill Matrix
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                        {filteredSkills.length === 0 ? <p className="text-slate-400 col-span-4 text-center py-4">No skills match your search.</p> :
                                            filteredSkills.map(skill => (
                                                <div key={skill} className="p-4 bg-white border border-slate-100 rounded-2xl flex justify-between items-center group hover:border-indigo-200 hover:shadow-lg transition-all">
                                                    <span className="text-xs font-bold text-slate-700">{skill}</span>
                                                    <div className="flex items-center gap-1.5">
                                                        <div className="flex gap-0.5">
                                                            {[1, 2, 3].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-indigo-600"></div>)}
                                                            <div className="w-1.5 h-1.5 rounded-full bg-slate-200"></div>
                                                            <div className="w-1.5 h-1.5 rounded-full bg-slate-200"></div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Modals */}
            {showGoalModal && (
                <AssignGoalModal
                    employees={employees}
                    onClose={() => setShowGoalModal(false)}
                    onSuccess={() => {
                        setShowGoalModal(false);
                        fetchTalentData();
                    }}
                />
            )}

            {showAppraisalModal && (
                <StartAppraisalModal
                    employees={employees}
                    onClose={() => setShowAppraisalModal(false)}
                    onSuccess={() => {
                        setShowAppraisalModal(false);
                        fetchTalentData();
                    }}
                />
            )}

            {showSkillModal && (
                <SkillUpdateModal
                    employees={employees}
                    onClose={() => setShowSkillModal(false)}
                    onSuccess={() => {
                        setShowSkillModal(false);
                        fetchTalentData();
                    }}
                />
            )}

            {showCareerModal && (
                <SetCareerPathModal
                    employees={employees}
                    onClose={() => setShowCareerModal(false)}
                    onSuccess={() => {
                        setShowCareerModal(false);
                        fetchTalentData();
                    }}
                />
            )}
        </div>
    );
}

function AssignGoalModal({ employees, onClose, onSuccess }) {
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        employeeId: '',
        title: '',
        description: '',
        category: 'Performance',
        priority: 'Medium',
        startDate: format(new Date(), 'yyyy-MM-dd'),
        endDate: format(new Date(new Date().setMonth(new Date().getMonth() + 3)), 'yyyy-MM-dd')
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setSubmitting(true);
            const res = await fetch('/api/talent/goals', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (!res.ok) throw new Error("Failed to assign goal");
            toast.success("Performance goal assigned successfully!");
            onSuccess();
        } catch (error) {
            toast.error(error.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden scale-in duration-300">
                <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h2 className="text-xl font-black text-slate-900">Assign New Goal</h2>
                    <button onClick={onClose} className="p-2 hover:bg-white rounded-xl transition-colors text-slate-400">&times;</button>
                </div>
                <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Select Employee</label>
                        <select
                            required
                            value={formData.employeeId}
                            onChange={e => setFormData({ ...formData, employeeId: e.target.value })}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-indigo-500/10 outline-none appearance-none"
                        >
                            <option value="">Choose an employee...</option>
                            {employees.map(emp => (
                                <option key={emp._id} value={emp._id}>{emp.personalDetails?.firstName} {emp.personalDetails?.lastName}</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Goal Category</label>
                            <select
                                value={formData.category}
                                onChange={e => setFormData({ ...formData, category: e.target.value })}
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-indigo-500/10 outline-none"
                            >
                                <option>Performance</option>
                                <option>Development</option>
                                <option>Soft Skills</option>
                                <option>Technical</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Priority</label>
                            <select
                                value={formData.priority}
                                onChange={e => setFormData({ ...formData, priority: e.target.value })}
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-indigo-500/10 outline-none"
                            >
                                <option>Low</option>
                                <option>Medium</option>
                                <option>High</option>
                                <option>Critical</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Goal Title</label>
                        <input
                            required
                            type="text"
                            placeholder="e.g., Complete Cloud Migration"
                            value={formData.title}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-indigo-500/10 outline-none"
                        />
                    </div>

                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Description</label>
                        <textarea
                            rows="3"
                            placeholder="Detail out the core objectives..."
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-indigo-500/10 outline-none resize-none"
                        ></textarea>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Start Date</label>
                            <input
                                required
                                type="date"
                                value={formData.startDate}
                                onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-indigo-500/10 outline-none"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">End Date</label>
                            <input
                                required
                                type="date"
                                value={formData.endDate}
                                onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-indigo-500/10 outline-none"
                            />
                        </div>
                    </div>
                </form>
                <div className="p-8 bg-slate-50/50 border-t border-slate-100 flex gap-4">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 px-6 bg-white border border-slate-200 text-slate-600 rounded-2xl text-xs font-black hover:bg-slate-50 transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="flex-1 py-3 px-6 bg-indigo-600 text-white rounded-2xl text-xs font-black shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Assign Goal"}
                    </button>
                </div>
            </div>
        </div>
    );
}

function StartAppraisalModal({ employees, onClose, onSuccess }) {
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        employeeId: '',
        managerId: '', // Ideally current user id
        period: `Annual ${new Date().getFullYear()}`,
        startDate: format(new Date(), 'yyyy-MM-dd'),
        endDate: format(new Date(new Date().setMonth(new Date().getMonth() + 1)), 'yyyy-MM-dd')
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setSubmitting(true);
            // Using a default manager ID for now - should be from Auth
            const res = await fetch('/api/talent/appraisals', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    managerId: employees[0]?._id // Mocking manager for functionality
                })
            });

            if (!res.ok) throw new Error("Failed to start cycle");
            toast.success("Appraisal cycle started!");
            onSuccess();
        } catch (error) {
            toast.error(error.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden scale-in duration-300">
                <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h2 className="text-xl font-black text-slate-900">Initiate Appraisal Cycle</h2>
                    <button onClick={onClose} className="p-2 hover:bg-white rounded-xl transition-colors text-slate-400">&times;</button>
                </div>
                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Select Employee</label>
                        <select
                            required
                            value={formData.employeeId}
                            onChange={e => setFormData({ ...formData, employeeId: e.target.value })}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-indigo-500/10 outline-none appearance-none"
                        >
                            <option value="">Choose an employee...</option>
                            {employees.map(emp => (
                                <option key={emp._id} value={emp._id}>{emp.personalDetails?.firstName} {emp.personalDetails?.lastName}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Review Period Name</label>
                        <input
                            required
                            type="text"
                            placeholder="e.g., Q1 2026 Appraisal"
                            value={formData.period}
                            onChange={e => setFormData({ ...formData, period: e.target.value })}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-indigo-500/10 outline-none"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Cycle Starts</label>
                            <input
                                required
                                type="date"
                                value={formData.startDate}
                                onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-indigo-500/10 outline-none"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Cycle Ends</label>
                            <input
                                required
                                type="date"
                                value={formData.endDate}
                                onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-indigo-500/10 outline-none"
                            />
                        </div>
                    </div>
                </form>
                <div className="p-8 bg-slate-50/50 border-t border-slate-100 flex gap-4">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 px-6 bg-white border border-slate-200 text-slate-600 rounded-2xl text-xs font-black hover:bg-slate-50 transition-all"
                    >
                        Back
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="flex-1 py-3 px-6 bg-indigo-600 text-white rounded-2xl text-xs font-black shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Deploy Cycle"}
                    </button>
                </div>
            </div>
        </div>
    );
}

function SkillUpdateModal({ employees, onClose, onSuccess }) {
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        employeeId: '',
        name: '',
        category: 'Technical',
        proficiency: 3
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setSubmitting(true);
            const res = await fetch('/api/talent/skills', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (!res.ok) throw new Error("Failed to update skill");
            toast.success("Skill Matrix updated!");
            onSuccess();
        } catch (error) {
            toast.error(error.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden scale-in duration-300">
                <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h2 className="text-xl font-black text-slate-900">Update Skill Proficiency</h2>
                    <button onClick={onClose} className="p-2 hover:bg-white rounded-xl transition-colors text-slate-400">&times;</button>
                </div>
                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Target Employee</label>
                        <select
                            required
                            value={formData.employeeId}
                            onChange={e => setFormData({ ...formData, employeeId: e.target.value })}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-indigo-500/10 outline-none appearance-none"
                        >
                            <option value="">Select individual...</option>
                            {employees.map(emp => (
                                <option key={emp._id} value={emp._id}>{emp.personalDetails?.firstName} {emp.personalDetails?.lastName}</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Category</label>
                            <select
                                value={formData.category}
                                onChange={e => setFormData({ ...formData, category: e.target.value })}
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-indigo-500/10 outline-none"
                            >
                                <option>Technical</option>
                                <option>Soft Skill</option>
                                <option>Leadership</option>
                                <option>Tool</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Skill Name</label>
                            <input
                                required
                                type="text"
                                placeholder="e.g. Next.js, Teamwork"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-indigo-500/10 outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-12">Proficiency Level (1-5)</label>
                        <div className="px-4">
                            <input
                                type="range"
                                min="1"
                                max="5"
                                value={formData.proficiency}
                                onChange={e => setFormData({ ...formData, proficiency: parseInt(e.target.value) })}
                                className="w-full h-2 bg-indigo-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                            />
                            <div className="flex justify-between mt-2 text-[10px] font-black text-slate-400">
                                <span>Beginner</span>
                                <span>Intermediate</span>
                                <span>Advanced</span>
                                <span>Expert</span>
                                <span>Master</span>
                            </div>
                        </div>
                    </div>
                </form>
                <div className="p-8 bg-slate-50/50 border-t border-slate-100 flex gap-4">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 px-6 bg-white border border-slate-200 text-slate-600 rounded-2xl text-xs font-black hover:bg-slate-50 transition-all"
                    >
                        Discard
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="flex-1 py-3 px-6 bg-indigo-600 text-white rounded-2xl text-xs font-black shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update Matrix"}
                    </button>
                </div>
            </div>
        </div>
    );
}

function SetCareerPathModal({ employees, onClose, onSuccess }) {
    const [submitting, setSubmitting] = useState(false);
    const [milestones, setMilestones] = useState([
        { title: '', status: 'Planned', date: format(new Date(), 'yyyy-MM-dd') }
    ]);
    const [formData, setFormData] = useState({
        employeeId: '',
        currentDesignation: '',
        targetDesignation: ''
    });

    const addMilestone = () => {
        setMilestones([...milestones, { title: '', status: 'Planned', date: format(new Date(), 'yyyy-MM-dd') }]);
    };

    const removeMilestone = (index) => {
        setMilestones(milestones.filter((_, i) => i !== index));
    };

    const updateMilestone = (index, field, value) => {
        const newMilestones = [...milestones];
        newMilestones[index][field] = value;
        setMilestones(newMilestones);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setSubmitting(true);
            const res = await fetch('/api/talent/career-path', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...formData, milestones })
            });

            if (!res.ok) throw new Error("Failed to set roadmap");
            toast.success("Career roadmap established!");
            onSuccess();
        } catch (error) {
            toast.error(error.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-200 overflow-hidden scale-in duration-300">
                <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h2 className="text-xl font-black text-slate-900">Define Career Roadmap</h2>
                    <button onClick={onClose} className="p-2 hover:bg-white rounded-xl transition-colors text-slate-400">&times;</button>
                </div>
                <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Employee</label>
                            <select
                                required
                                value={formData.employeeId}
                                onChange={e => setFormData({ ...formData, employeeId: e.target.value })}
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-indigo-500/10 outline-none"
                            >
                                <option value="">Select individual...</option>
                                {employees.map(emp => (
                                    <option key={emp._id} value={emp._id}>{emp.personalDetails?.firstName} {emp.personalDetails?.lastName}</option>
                                ))}
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Current Role</label>
                                <input
                                    required
                                    type="text"
                                    value={formData.currentDesignation}
                                    onChange={e => setFormData({ ...formData, currentDesignation: e.target.value })}
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-indigo-500/10 outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Target Role</label>
                                <input
                                    required
                                    type="text"
                                    value={formData.targetDesignation}
                                    onChange={e => setFormData({ ...formData, targetDesignation: e.target.value })}
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-indigo-500/10 outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Growth Milestones</label>
                            <button
                                type="button"
                                onClick={addMilestone}
                                className="text-[10px] font-black text-indigo-600 hover:text-indigo-700 flex items-center gap-1 bg-indigo-50 px-3 py-1.5 rounded-lg transition-all"
                            >
                                <Plus className="w-3 h-3" /> Add Milestone
                            </button>
                        </div>

                        {milestones.map((ms, idx) => (
                            <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col md:flex-row gap-4 relative group">
                                <div className="flex-1">
                                    <input
                                        placeholder="Milestone title (e.g., Certify as AWS Architect)"
                                        value={ms.title}
                                        onChange={e => updateMilestone(idx, 'title', e.target.value)}
                                        className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-4 focus:ring-indigo-500/10 outline-none"
                                    />
                                </div>
                                <div className="w-full md:w-32">
                                    <select
                                        value={ms.status}
                                        onChange={e => updateMilestone(idx, 'status', e.target.value)}
                                        className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-4 focus:ring-indigo-500/10 outline-none"
                                    >
                                        <option>Planned</option>
                                        <option>In Progress</option>
                                        <option>Achieved</option>
                                    </select>
                                </div>
                                <div className="w-full md:w-40">
                                    <input
                                        type="date"
                                        value={ms.date}
                                        onChange={e => updateMilestone(idx, 'date', e.target.value)}
                                        className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-4 focus:ring-indigo-500/10 outline-none"
                                    />
                                </div>
                                {milestones.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => removeMilestone(idx)}
                                        className="absolute -right-2 -top-2 w-6 h-6 bg-rose-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg"
                                    >
                                        &times;
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </form>
                <div className="p-8 bg-slate-50/50 border-t border-slate-100 flex gap-4">
                    <button onClick={onClose} className="flex-1 py-3 px-6 bg-white border border-slate-200 text-slate-600 rounded-2xl text-xs font-black">Discard</button>
                    <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="flex-1 py-3 px-6 bg-emerald-600 text-white rounded-2xl text-xs font-black shadow-lg shadow-emerald-100"
                    >
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Set Roadmap"}
                    </button>
                </div>
            </div>
        </div>
    );
}
