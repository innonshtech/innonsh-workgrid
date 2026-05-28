import React from 'react';
import { 
  Eye, 
  MoreVertical, 
  Clock, 
  User, 
  Building2, 
  MapPin, 
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Timer
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function AttendanceTable({ 
  attendance, 
  onViewDetails, 
  onRegularize,
  userRole,
  loading 
}) {
  const getStatusBadge = (status) => {
    switch (status) {
      case 'Present':
        return <Badge className="bg-green-100 text-green-700 border-green-200">Present</Badge>;
      case 'Absent':
        return <Badge className="bg-red-100 text-red-700 border-red-200">Absent</Badge>;
      case 'Half-day':
        return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">Half Day</Badge>;
      case 'Leave':
        return <Badge className="bg-blue-100 text-blue-700 border-blue-200">On Leave</Badge>;
      case 'Holiday':
        return <Badge className="bg-purple-100 text-purple-700 border-purple-200">Holiday</Badge>;
      case 'Weekly Off':
        return <Badge className="bg-slate-100 text-slate-700 border-slate-200">Weekly Off</Badge>;
      case 'Missing Punch':
        return <Badge className="bg-orange-100 text-orange-700 border-orange-200">Missing Punch</Badge>;
      default:
        return <Badge className="bg-slate-100 text-slate-700 border-slate-200">{status || 'N/A'}</Badge>;
    }
  };

  const formatTime = (time) => {
    if (!time) return '--:--';
    return new Date(time).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 font-medium">Loading attendance records...</p>
      </div>
    );
  }

  if (attendance.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-dashed border-slate-300">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
          <User className="h-8 w-8 text-slate-400" />
        </div>
        <h3 className="text-lg font-bold text-slate-900">No records found</h3>
        <p className="text-slate-500 mt-1">Try adjusting your filters or search term.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <Table>
        <TableHeader className="bg-slate-50/50">
          <TableRow>
            <TableHead className="font-bold text-slate-800">Employee</TableHead>
            <TableHead className="font-bold text-slate-800">Shift</TableHead>
            <TableHead className="font-bold text-slate-800">Check In</TableHead>
            <TableHead className="font-bold text-slate-800">Check Out</TableHead>
            <TableHead className="font-bold text-slate-800">Working Hours</TableHead>
            <TableHead className="font-bold text-slate-800">Status</TableHead>
            <TableHead className="text-right font-bold text-slate-800">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {attendance.map((record) => {
            const fullName = `${record.employee?.personalDetails?.firstName || ''} ${record.employee?.personalDetails?.lastName || ''}`.trim();
            const employeeId = record.employee?.employeeId || 'N/A';
            const department = record.employee?.jobDetails?.department || 'N/A';
            const organization = record.employee?.jobDetails?.organizationId?.name || record.employee?.jobDetails?.organizationType || 'Unassigned';

            return (
              <TableRow key={record._id} className="group hover:bg-slate-50/80 transition-colors">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center border border-indigo-200 text-indigo-700 font-bold shrink-0">
                      {fullName.charAt(0) || 'U'}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-slate-900 truncate">{fullName}</p>
                        {(record.lateMinutes > 0 || (record.checkIn && !record.checkOut)) && (
                          <AlertCircle className="h-3.5 w-3.5 text-red-500 animate-pulse" title="Attendance Alert" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs font-medium text-slate-500">ID: {employeeId}</span>
                        <span className="h-1 w-1 rounded-full bg-slate-300"></span>
                        <span className="text-xs font-medium text-slate-500 truncate">{department}</span>
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                    <span className="text-sm text-slate-600 font-medium">Regular Shift</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-0.5">
                    <p className="text-sm font-bold text-slate-900">{formatTime(record.checkIn)}</p>
                    <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tighter">Punched In</p>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-0.5">
                    <p className="text-sm font-bold text-slate-900">{formatTime(record.checkOut)}</p>
                    <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tighter">Punched Out</p>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center">
                      <Timer className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{record.totalHours || '0'}h</p>
                      {record.overtimeHours > 0 && (
                        <p className="text-[10px] text-purple-600 font-bold">+ {record.overtimeHours}h OT</p>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1 items-start">
                    {getStatusBadge(record.status)}
                    {record.lateMinutes > 0 && (
                      <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-bold py-0.5 px-1.5 rounded">
                        Late Arrival ({record.lateMinutes}m)
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button 
                      onClick={() => onViewDetails(record)}
                      className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all active:scale-95"
                      title="View Details"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all">
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onViewDetails(record)}>
                          <Eye className="mr-2 h-4 w-4" /> View Full Details
                        </DropdownMenuItem>
                        {userRole === 'admin' && (
                          <>
                            <DropdownMenuItem>
                              <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" /> Approve Punch
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <XCircle className="mr-2 h-4 w-4 text-red-600" /> Reject Punch
                            </DropdownMenuItem>
                          </>
                        )}
                        {userRole === 'employee' && (record.status === 'Absent' || record.status === 'Missing Punch') && (
                          <DropdownMenuItem onClick={() => onRegularize(record)}>
                            <AlertCircle className="mr-2 h-4 w-4 text-orange-600" /> Regularize
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
