
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import dbConnect from "@/lib/db/connect";
import Employee from "@/lib/db/models/payroll/Employee";
import User from "@/lib/db/models/User";
import Department from "@/lib/db/models/crm/Department/department"; // Removed .js extension

const JWT_SECRET = process.env.JWT_SECRET;

console.log("Loading /api/auth/session route module - Initializing imports");
console.log("DEBUG: Process platform:", process.platform, "Node version:", process.version);

export const dynamic = 'force-dynamic';

export async function GET(req) {
  const requestId = Math.random().toString(36).substring(7);
  try {
    console.log(`[${requestId}] --- Session API Hit ---`, {
      time: new Date().toISOString(),
      url: req.url,
      method: req.method,
      cookies: req.cookies.getAll().map(c => c.name)
    });

    if (!JWT_SECRET) {
      console.error(`[${requestId}] JWT_SECRET is not set`);
      return NextResponse.json({ message: 'Server configuration error: JWT_SECRET missing' }, { status: 500 });
    }

    try {
      console.log(`[${requestId}] Connecting to database...`);
      await dbConnect();
      console.log(`[${requestId}] Database connected`);
    } catch (dbError) {
      console.error(`[${requestId}] Database connection failed during session check:`, dbError);
      return NextResponse.json({ message: 'Database connection failed' }, { status: 503 });
    }

    // Get the authToken or employee_token cookie
    const token = req.cookies.get('authToken')?.value || req.cookies.get('employee_token')?.value;

    if (!token) {
      console.log(`[${requestId}] No token found in cookies`);
      return NextResponse.json({ message: 'No session found' }, { status: 401 });
    }

    // Verify and decode the JWT
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
      console.log(`[${requestId}] Token verified for role: ${decoded.role}`);
    } catch (error) {
      console.error(`[${requestId}] Invalid token:`, error.message);
      return NextResponse.json({ message: 'Invalid or expired session' }, { status: 401 });
    }

    // Extract role and department from token
    const { id, role, department } = decoded;

    // Determine the actual role and department
    const userRole = role || 'employee'; // Default to employee if role not present
    let userDepartment = department;

    // If department is not in token, try to get it from designation or other fields
    if (!userDepartment && decoded.designation) {
      // You might need to map designations to departments
      userDepartment = decoded.designation.toLowerCase();
    }

    // Handle admin user
    if (userRole === 'admin') {
      const user = await User.findOne({ _id: id, sessionToken: token }).lean();

      if (!user) {
        return NextResponse.json({ message: 'User session not found or invalid' }, { status: 401 });
      }

      // Check if user is admin
      const isAdminUser = (user.role && user.role.toLowerCase() === 'admin') ||
        (user.department && user.department.toLowerCase() === 'admin');
      if (!isAdminUser) {
        return NextResponse.json({ message: 'Unauthorized for admin access' }, { status: 403 });
      }

      return NextResponse.json({
        user: {
          id: user._id.toString(),
          name: user.name,
          role: 'admin',
          email: user.email,
          department: 'admin',
        },
      });
    }

    // Handle supervisor user
    if (userRole === 'supervisor') {
      const employee = await Employee.findOne({ _id: id, sessionToken: token }).lean();

      if (!employee) {
        return NextResponse.json({ message: 'Supervisor session not found' }, { status: 401 });
      }

      return NextResponse.json({
        user: {
          id: employee._id.toString(),
          email: employee.personalDetails.email,
          role: 'supervisor',
          department: employee.jobDetails.department,
          designation: employee.jobDetails.designation,
          personalDetails: {
            firstName: employee.personalDetails.firstName,
            lastName: employee.personalDetails.lastName,
          },
        },
      });
    }

    // Handle employee user
    if (userRole === 'employee') {
      const employee = await Employee.findOne({ _id: id, sessionToken: token }).lean();

      if (!employee) {
        return NextResponse.json({ message: 'Employee session not found or invalid' }, { status: 401 });
      }

      // Get department from jobDetails
      const empDeptName = employee.jobDetails?.department?.toString().trim() || '';

      // Fetch department permissions
      let permissions = [];
      if (empDeptName) {
        // Safe check if Department model is available
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
          role: 'employee',
          department: employee.jobDetails.department,
          permissions: permissions,
          personalDetails: {
            firstName: employee.personalDetails.firstName,
            lastName: employee.personalDetails.lastName,
          },
        },
      });
    }

    // Handle attendance_only user
    if (userRole === 'attendance_only') {
      const employee = await Employee.findOne({ _id: id, sessionToken: token }).lean();

      if (!employee) {
        return NextResponse.json({ message: 'Session not found or invalid' }, { status: 401 });
      }

      return NextResponse.json({
        user: {
          id: employee._id.toString(),
          employeeId: employee.employeeId,
          role: 'attendance_only',
          permissions: ['attendance'],
        },
      });
    }

    return NextResponse.json({ message: 'Invalid role or department' }, { status: 400 });
  } catch (error) {
    console.error(`[${requestId}] Session fetch error:`, error);
    return NextResponse.json({
      message: 'Server error: ' + error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}