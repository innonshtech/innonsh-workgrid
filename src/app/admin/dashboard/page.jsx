'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import {
  CheckSquare, TrendingUp, Target, Zap, Activity, Calendar, FileText, ArrowUp, ArrowDown,
  ChevronRight, Plus, RefreshCw, Settings, PieChart, LineChart, Building2, Container, Timer,
  Boxes, CheckCircle2, AlertCircle, Star, Award, List, Users, Truck, Package, AlertTriangle,
  Clock, ShoppingCart, DollarSign, Globe, MapPin, Shield, Factory, Warehouse, BarChart3,
  UserCheck, ClipboardList, BarChart, Users2, Eye, Filter, Briefcase, Banknote
} from 'lucide-react';
import ResourceUtilization from '@/components/tasks/ResourceUtilization';
import { Badge } from '@/components/ui/badge';
import { useSession } from '@/context/SessionContext';
import { useLanguage } from '@/context/LanguageContext';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const { user, loading: sessionLoading } = useSession();
  const { t } = useLanguage();
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalProjects: 0,
    activeProjects: 0,
    totalTasks: 0,
    completedTasks: 0,
    totalEmployees: 0,
    pendingTimesheets: 0,
    averageProgress: 0,
    topProjects: [],
    topContributors: [],
    recentActivity: []
  });
  const router = useRouter();

  useEffect(() => {
    if (sessionLoading) return;

    try {
      if (user && user.role) {
        const userRole = user.role.toLowerCase();
        setRole(userRole);

        // Redirect specific roles to their dedicated dashboards
        if (userRole === 'attendance_only') {
          router.push('/admin/attendance');
        } else if (userRole === 'employee') {
          router.push('/employee/dashboard');
        }
      } else {
        setRole(null);
        router.push('/login');
      }
    } catch (err) {
      console.error('Failed to read user role from session', err);
      setRole(null);
    } finally {
      if (user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'super_admin') {
        fetchStats();
      } else {
        setLoading(false);
      }
    }
  }, [user, sessionLoading]);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/v1/admin/dashboard/stats');
      if (!res.ok) throw new Error("Failed to fetch statistics");
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Failed to fetch dashboard stats', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-slate-700 font-semibold">{t("loadingDashboard")}</div>
      </div>
    );
  }

  // Admin & Super Admin Dashboard
  if (role === 'admin' || role === 'super_admin') {
    const adminStats = [
      {
        title: t("totalEmployees"),
        value: stats.totalEmployees.toString(),
        icon: Users,
        color: 'text-blue-600',
        bgColor: 'bg-slate-50',
        borderColor: 'border-blue-200',
        href: '/admin/employees'
      },
      {
        title: t("activeProjects"),
        value: stats.activeProjects.toString(),
        icon: Briefcase,
        color: 'text-indigo-600',
        bgColor: 'bg-indigo-50',
        borderColor: 'border-indigo-200',
        href: '/admin/tasks/projects'
      },
      {
        title: t("activeTasks"),
        value: (stats.totalTasks - stats.completedTasks).toString(),
        icon: CheckSquare,
        color: 'text-rose-600',
        bgColor: 'bg-rose-50',
        borderColor: 'border-rose-200',
        href: '/admin/tasks'
      },
      {
        title: t("pendingApprovals"),
        value: stats.pendingTimesheets.toString(),
        icon: Clock,
        color: 'text-amber-600',
        bgColor: 'bg-amber-50',
        borderColor: 'border-amber-200',
        href: '/admin/tasks/approvals'
      }
    ];

    const quickActions = [
      {
        title: t("createNewProject"),
        icon: Plus,
        href: "/admin/tasks/projects",
        color: "bg-indigo-500"
      },
      {
        title: t("employeeDirectory"),
        icon: Users,
        href: "/admin/employees",
        color: "bg-blue-500"
      },
      {
        title: t("payrollRun"),
        icon: Banknote,
        href: "/admin/payroll/run",
        color: "bg-emerald-500"
      }
    ];

    return (
      <div className="min-h-screen bg-slate-50">
        {/* Enhanced Header */}
        <div className="bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center space-x-4">
                <div className="w-11 h-11 bg-indigo-500 rounded-xl flex items-center justify-center shadow-sm">
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">{t("adminDashboard")}</h1>
                  <p className="text-slate-600 text-sm mt-0.5">{t("hrDashboardDesc")}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3 self-end sm:self-auto">
                <button
                  onClick={fetchStats}
                  className="p-2.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-slate-200 sm:border-0"
                >
                  <RefreshCw className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
          {/* Admin KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {adminStats.map((stat, index) => (
              <Link key={index} href={stat.href}>
                <div className={`group bg-white rounded-2xl border ${stat.borderColor} p-6 hover:shadow-xl transition-all duration-300 ${stat.bgColor} hover:-translate-y-1`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-3 rounded-xl ${stat.bgColor} border ${stat.borderColor} shadow-sm group-hover:bg-white transition-colors`}>
                      <stat.icon className={`h-6 w-6 ${stat.color}`} />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-500 mb-1">{stat.title}</p>
                    <p className="text-3xl font-black text-slate-900 group-hover:text-indigo-600 transition-colors tracking-tight">
                      {stat.value}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Quick Actions */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-indigo-600" />
                  {t("quickActions")}
                </h3>
                <div className="grid grid-cols-1 gap-3">
                  {quickActions.map((action, i) => (
                    <Link key={i} href={action.href}>
                      <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50 transition-all group cursor-pointer shadow-sm hover:shadow-md">
                        <div className={`w-10 h-10 ${action.color} rounded-lg flex items-center justify-center text-white`}>
                          <action.icon className="w-5 h-5" />
                        </div>
                        <span className="font-bold text-slate-700 group-hover:text-indigo-700">{action.title}</span>
                        <ChevronRight className="w-4 h-4 ml-auto text-slate-400 group-hover:text-indigo-500" />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl p-6 text-white shadow-lg overflow-hidden relative group cursor-pointer" onClick={() => router.push('/admin/tasks/projects')}>
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                  <Briefcase className="w-32 h-32" />
                </div>
                <h4 className="text-xl font-black mb-1">{t("projectTracking")}</h4>
                <p className="text-indigo-100 text-sm mb-4 leading-relaxed">{t("hrDashboardDesc")}</p>
                <div className="inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg backdrop-blur-md text-sm font-bold border border-white/20 transition-all">
                  {t("viewDetails")} <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-indigo-600" />
                  {t("recentActivity")}
                </h3>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 no-scrollbar">
                  {stats.recentActivity.length > 0 ? (
                    stats.recentActivity.map((log, i) => (
                      <div key={i} className="flex gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors border-l-4 border-indigo-500 bg-indigo-50/10">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                          log.action === 'created' ? 'bg-green-100 text-green-600' :
                          log.action === 'updated' ? 'bg-blue-100 text-blue-600' :
                          log.action === 'deleted' ? 'bg-red-100 text-red-600' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          <Zap className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <p className="text-sm font-bold text-slate-900 capitalize">{log.entity} {log.action}</p>
                            <span className="text-[10px] text-slate-400 font-medium">{new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <p className="text-xs text-slate-600 mt-1 line-clamp-1">{log.description}</p>
                          <p className="text-[10px] text-slate-500 mt-1">By {log.performedBy.name || 'System'}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-10">
                      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                        <CheckCircle2 className="w-8 h-8 text-slate-300" />
                      </div>
                      <p className="text-slate-500 font-medium">No recent activity found.</p>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-bold text-slate-800">{t("activeProjects")}</h4>
                    <Link href="/admin/tasks/projects" className="text-xs font-bold text-indigo-600 hover:underline">{t("viewAll")}</Link>
                  </div>
                  <div className="space-y-3">
                    {stats.topProjects.map((project, idx) => (
                      <div key={idx} className="bg-slate-50 rounded-xl p-4 flex items-center justify-between hover:bg-slate-100 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                            <Briefcase className="w-5 h-5 text-indigo-500" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900">{project.name}</p>
                            <p className="text-xs text-slate-500">In-Charge: {project.projectManager ? `${project.projectManager.personalDetails.firstName} ${project.projectManager.personalDetails.lastName}` : 'N/A'}</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1.5 w-1/3">
                          <div className="flex justify-between w-full text-[10px] font-bold text-slate-600">
                            <span>Process</span>
                            <span>{project.progress}%</span>
                          </div>
                          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${project.progress}%` }}></div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {stats.topProjects.length === 0 && (
                      <p className="text-center py-4 text-sm text-slate-400">No active projects found.</p>
                    )}
                  </div>
                </div>

                <div className="mb-8 p-6 bg-slate-50/50 rounded-2xl border border-slate-100">
                  <ResourceUtilization />
                </div>

                <div className="pt-6 border-t border-slate-100">
                  <h4 className="font-bold text-slate-800 mb-4">Team Contributions (Top 5)</h4>
                  <div className="space-y-3">
                    {stats.topContributors.map((contributor, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-[10px] font-bold">
                            {contributor.name.charAt(0)}
                          </div>
                          <span className="text-slate-600 font-medium">{contributor.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-900 font-bold">{contributor.hours.toFixed(1)}h</span>
                          <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className="bg-blue-500 h-full rounded-full" 
                              style={{ width: `${Math.min((contributor.hours / 160) * 100, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Unauthorized or no role
  return (
    <div className="p-6">
      <div className="text-center text-slate-500">{t("accessRestricted")}</div>
    </div>
  );
}