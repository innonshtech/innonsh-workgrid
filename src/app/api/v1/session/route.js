
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import dbConnect from "@/lib/db/connect";
import Employee from "@/lib/db/models/payroll/Employee";
import User from "@/lib/db/models/User";
import Department from "@/lib/db/models/crm/Department/department";

const JWT_SECRET = process.env.JWT_SECRET;

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    await dbConnect();

    // Get the authToken or employee_token cookie
    const token = req.cookies.get('authToken')?.value || req.cookies.get('employee_token')?.value;

    if (!token) {
      return NextResponse.json({ user: null, message: 'No active session found' }, { status: 200 });
    }

    // Verify and decode the JWT
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return NextResponse.json({ user: null, message: 'Invalid or expired session' }, { status: 200 });
    }

    const { id, role } = decoded;

    // 1. Check User Collection (Admins, Super Admins, etc.)
    const user = await User.findOne({ _id: id, sessionToken: token }).lean();

    if (user) {
      const isSuperAdmin = user.role === 'super_admin';
      const isAdmin = user.role === 'admin' || user.department?.toLowerCase() === 'admin';

      return NextResponse.json({
        user: {
          id: user._id.toString(),
          name: user.name,
          role: isSuperAdmin ? 'super_admin' : (isAdmin ? 'admin' : user.role),
          email: user.email,
          department: user.department || 'admin',
          organizationId: user.organizationId ? user.organizationId.toString() : null,
          companyName: user.companyName,
          employeeId: user.employeeId
        },
      });
    }

    // 2. Check Employee Collection (Employees, Supervisors)
    const employee = await Employee.findOne({ _id: id, sessionToken: token }).lean();

    if (employee) {
      // Fetch department permissions
      let permissions = [];
      const empDeptName = employee.jobDetails?.department?.toString().trim() || '';
      if (empDeptName) {
        try {
          const departmentData = await Department.findOne({
            departmentName: { $regex: new RegExp(`^${empDeptName}$`, 'i') }
          }).lean();
          if (departmentData && departmentData.permissions) {
            permissions = departmentData.permissions;
          }
        } catch (deptError) {
          console.error("Error fetching department permissions:", deptError);
        }
      }

      return NextResponse.json({
        user: {
          id: employee._id.toString(),
          email: employee.personalDetails.email,
          name: `${employee.personalDetails.firstName} ${employee.personalDetails.lastName}`,
          role: employee.role || 'employee',
          department: employee.jobDetails.department,
          designation: employee.jobDetails.designation,
          organizationId: employee.jobDetails.organizationId ? employee.jobDetails.organizationId.toString() : null,
          permissions: permissions,
          personalDetails: employee.personalDetails
        },
      });
    }

    return NextResponse.json({ user: null, message: 'Session data not found' }, { status: 200 });
  } catch (error) {
    console.error("Session fetch error:", error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}