import React from 'react';
import { 
  Users, 
  UserCheck, 
  UserX, 
  Clock, 
  AlertCircle, 
  MinusCircle, 
  TrendingUp, 
  Calendar
} from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";

export default function AttendanceAnalytics({ stats, viewMode, role }) {
  const analyticsItems = [
    {
      title: "Total Employees",
      value: stats.total,
      subValue: viewMode === "daily" ? "Active workforce" : "Tracked this month",
      icon: Users,
      color: "blue",
      border: "border-l-blue-500"
    },
    {
      title: viewMode === "daily" ? "Present Today" : "Total Present",
      value: stats.present,
      subValue: viewMode === "daily" && stats.total > 0
        ? `${((stats.present / stats.total) * 100).toFixed(1)}% present`
        : "Days present",
      icon: UserCheck,
      color: "green",
      border: "border-l-green-500"
    },
    {
      title: viewMode === "daily" ? "Absent Today" : "Total Absent",
      value: stats.absent,
      subValue: viewMode === "daily" && stats.total > 0
        ? `${((stats.absent / stats.total) * 100).toFixed(1)}% absent`
        : "Days absent",
      icon: UserX,
      color: "red",
      border: "border-l-red-500"
    },
    {
      title: "On Leave",
      value: stats.leave,
      subValue: stats.total > 0
        ? `${((stats.leave / stats.total) * 100).toFixed(1)}% on leave`
        : "On leave",
      icon: Calendar,
      color: "yellow",
      border: "border-l-yellow-500"
    },
    {
      title: "Late Arrivals",
      value: stats.late || 0,
      subValue: "After shift start",
      icon: AlertCircle,
      color: "orange",
      border: "border-l-orange-500"
    },
    {
      title: "Missing Punches",
      value: stats.missingPunches || 0,
      subValue: "Check-out pending",
      icon: MinusCircle,
      color: "purple",
      border: "border-l-purple-500"
    },
    {
      title: "Overtime Employees",
      value: stats.overtimeCount || 0,
      subValue: "Above regular hours",
      icon: TrendingUp,
      color: "indigo",
      border: "border-l-indigo-500"
    },
    {
      title: "Attendance %",
      value: stats.attendancePercentage ? `${stats.attendancePercentage}%` : "0%",
      subValue: "Monthly average",
      icon: UserCheck,
      color: "cyan",
      border: "border-l-cyan-500"
    }
  ];

  // Filter items for employees
  const displayItems = role === "employee" 
    ? analyticsItems.filter(item => 
        ["Present Today", "Total Present", "Absent Today", "Total Absent", "Missing Punches", "Overtime Employees"].includes(item.title)
      )
    : analyticsItems;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {displayItems.map((item, index) => (
        <Card key={index} className={`shadow-sm border border-slate-200 border-l-4 ${item.border} hover:shadow-md transition-shadow`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">
                  {item.title}
                </p>
                <p className="text-2xl font-bold text-slate-900 mt-2">
                  {item.value}
                </p>
                <p className={`text-xs mt-1 font-medium ${
                  item.color === 'green' ? 'text-green-600' : 
                  item.color === 'red' ? 'text-red-600' : 
                  item.color === 'blue' ? 'text-blue-600' :
                  item.color === 'yellow' ? 'text-yellow-600' :
                  item.color === 'orange' ? 'text-orange-600' :
                  item.color === 'purple' ? 'text-purple-600' :
                  item.color === 'indigo' ? 'text-indigo-600' :
                  'text-slate-500'
                }`}>
                  {item.subValue}
                </p>
              </div>
              <div className={`w-12 h-12 bg-${item.color}-50 rounded-xl flex items-center justify-center border border-${item.color}-100 shadow-sm`}>
                <item.icon className={`w-6 h-6 text-${item.color}-600`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
