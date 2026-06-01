import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import User from '@/lib/db/models/User';
import Employee from '@/lib/db/models/payroll/Employee';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { logActivity } from '@/lib/logger';
import EmployeeType from '@/lib/db/models/crm/employee/EmployeeType';
import { sanitizeString } from '@/lib/sanitize';
const JWT_SECRET = process.env.JWT_SECRET;
const TOKEN_MAX_AGE = 2 * 60 * 60; // seconds (2 hours)

function checkDobMatch(rawDob, inputPassword) {
  if (!rawDob || !inputPassword) return false;
  const dobDate = new Date(rawDob);
  if (isNaN(dobDate.getTime())) return false;

  const dobStringUTC = dobDate.toISOString().split('T')[0];
  const y = dobDate.getFullYear();
  const m = String(dobDate.getMonth() + 1).padStart(2, '0');
  const d = String(dobDate.getDate()).padStart(2, '0');
  const dobStringLocal = `${y}-${m}-${d}`;

  const checkVariations = (dateStr) => {
    const [yy, mm, dd] = dateStr.split('-');
    return [
      dateStr,
      `${dd}-${mm}-${yy}`,
      `${dd}/${mm}/${yy}`
    ];
  };

  const allValidVariations = [
    ...checkVariations(dobStringUTC),
    ...checkVariations(dobStringLocal)
  ];

  return allValidVariations.includes(inputPassword.trim());
}

export async function POST(req) {
  try {
    const startTime = Date.now();
    console.log(`--- Login API Hit [${new Date().toISOString()}] ---`);

    if (!JWT_SECRET) {
      console.error('JWT_SECRET is not set');
      return NextResponse.json({ message: 'Server configuration error: JWT_SECRET missing' }, { status: 500 });
    }

    try {
      await dbConnect();
    } catch (dbError) {
      console.error('Database connection failed during login:', dbError);
      return NextResponse.json({ message: 'Database connection failed. Please try again later.' }, { status: 503 });
    }

    let body;
    try {
      body = await req.json();
    } catch (e) {
      console.error('Failed to parse request body:', e);
      return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 });
    }

    const username = sanitizeString((body.username || '').toString().trim());
    const password = sanitizeString((body.password || '').toString().trim());
    const role = sanitizeString((body.role || '').toString().trim().toLowerCase());

    console.log('Login attempt details:', { username, role, time: new Date().toISOString() });

    if (!username || !password || !role) {
      return NextResponse.json({ message: 'All fields are required' }, { status: 400 });
    }

    // --- ADMIN / SUPER ADMIN LOGIN ---
    if (role === 'admin') {
      const emailOrUsername = username.toLowerCase();

      // Check both email and employeeId (username) for admin
      const user = await User.findOne({
        $or: [
          { email: { $regex: new RegExp("^" + username + "$", "i") } },
          { employeeId: { $regex: new RegExp("^" + username + "$", "i") } }
        ]
      });

      if (!user) {
        console.log('Admin user not found:', emailOrUsername);
        return NextResponse.json({ message: 'User not registered' }, { status: 401 });
      }

      console.log('Admin user found:', user.email, 'Role:', user.role);

      // Allow both admin and super_admin to login via the admin form
      const isAllowedRole = user.role === 'admin' || user.role === 'super_admin' ||
        (user.department && user.department.toLowerCase() === 'admin');

      if (!isAllowedRole) {
        console.log('User found but not admin/super_admin:', emailOrUsername, 'Role:', user.role);
        return NextResponse.json({ message: 'Unauthorized as admin' }, { status: 403 });
      }

      if (!user.password) {
        console.error('Admin user has no password set:', emailOrUsername);
        return NextResponse.json({ message: 'Account has no password set' }, { status: 500 });
      }

      // SaaS: Check if email is verified (unless super_admin)
      if (user.role !== 'super_admin' && user.isEmailVerified === false) {
        return NextResponse.json({ message: 'Please verify your email address before logging in.' }, { status: 403 });
      }

      // SaaS: Check trial expiration
      if (user.role !== 'super_admin' && user.plan === 'trial' && user.planExpiresAt && new Date() > new Date(user.planExpiresAt)) {
        if (user.isActive !== false || user.status !== 'suspended') {
          user.isActive = false;
          user.status = 'suspended';
          await user.save();
        }
        console.log('Trial expired for user:', emailOrUsername);
        return NextResponse.json({ message: 'Your trial period has expired. Please contact support or upgrade.' }, { status: 403 });
      }

      // SaaS: Check if account is active/approved
      if (user.isActive === false) {
        if (user.status === 'pending') {
          return NextResponse.json({ message: 'Your account is pending approval. We will contact you soon.' }, { status: 403 });
        }
        if (user.status === 'rejected') {
          return NextResponse.json({ message: 'Your registration was not approved.' }, { status: 403 });
        }
        return NextResponse.json({ message: 'Your account is currently inactive. Please contact support.' }, { status: 403 });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        console.log('Admin password mismatch for:', emailOrUsername);
        return NextResponse.json({ message: 'Password does not match' }, { status: 401 });
      }
      console.log('Admin password matched');

      // Fallback: If a trial user logs in but has no organization or data, seed it on the fly
      if (user.plan === 'trial') {
        try {
          const Organization = (await import('@/lib/db/models/crm/organization/Organization')).default;
          let organization;
          
          if (user.organizationId) {
            organization = await Organization.findById(user.organizationId);
          }

          if (!organization) {
            const orgId = `ORG${Math.floor(100 + Math.random() * 900)}`;
            organization = await Organization.create({
              orgId,
              name: user.companyName || 'Trial Sandbox Corp',
              email: user.email,
              phone: user.phone || "",
              status: "Active",
              createdBy: user._id,
              updatedBy: user._id
            });

            user.organizationId = organization._id;
            await user.save();
          }

          const EmployeeModel = (await import('@/lib/db/models/payroll/Employee')).default;
          const employeeCount = await EmployeeModel.countDocuments({ "jobDetails.organizationId": organization._id });
          if (employeeCount === 0) {
            const { seedDemoSandbox } = await import('@/lib/db/seedDemoData');
            await seedDemoSandbox(organization._id, user._id, user.companyName || 'Trial Sandbox Corp', user.email, user.phone || "");
          }
        } catch (seedErr) {
          console.error('Failed to auto-seed sandbox on login:', seedErr);
        }
      }

      // Use the ACTUAL role from DB (admin or super_admin)
      const actualRole = user.role || 'admin';

      const token = jwt.sign(
        { 
          id: user._id.toString(), 
          role: actualRole, 
          department: user.department || 'admin',
          organizationId: user.organizationId ? user.organizationId.toString() : null
        },
        JWT_SECRET,
        { expiresIn: TOKEN_MAX_AGE }
      );

      await User.updateOne(
        { _id: user._id },
        { $set: { sessionToken: token } }
      );

      const res = NextResponse.json({
        user: {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          role: actualRole,
          department: user.department || 'admin',
          organizationId: user.organizationId ? user.organizationId.toString() : null,
          companyName: user.companyName
        }
      });

      res.cookies.set('authToken', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: TOKEN_MAX_AGE
      });

      console.log(`${actualRole} login success:`, user.email);

      await logActivity({
        action: "login",
        entity: "User",
        entityId: user._id,
        description: `${actualRole} logged in: ${user.email}`,
        performedBy: {
          userId: user._id,
          name: user.name || "Admin",
          email: user.email,
          role: actualRole
        },
        req: req
      });

      return res;
    }

    // --- EMPLOYEE LOGIN (using Employee ID + Password/DOB) ---
    if (role === 'employee') {
      console.log('Employee lookup for ID/Email:', username);
      const employee = await Employee.findOne({
        $or: [
          { employeeId: { $regex: new RegExp("^" + username + "$", "i") } },
          { 'personalDetails.email': { $regex: new RegExp("^" + username + "$", "i") } }
        ]
      }).select('+password');

      if (!employee) {
        return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
      }

      let isMatch = false;

      // 1. Try password match (if password exists)
      if (employee.password) {
        isMatch = await bcrypt.compare(password, employee.password);
        if (isMatch) console.log('Employee matched via hashed password');
      }

      // 2. Try DOB match only if password didn't match
      if (!isMatch) {
        const rawDob = employee.personalDetails?.dateOfBirth;
        if (rawDob && checkDobMatch(rawDob, password)) {
          isMatch = true;
          console.log('Employee matched via DOB');
        }
      }

      if (!isMatch) {
        console.log('Employee credentials invalid (tried password and DOB)');
        return NextResponse.json({ message: 'Credentials do not match' }, { status: 401 });
      }

      /* 
      // Check if employee is a supervisor (shouldn't login as regular employee)
      if (employee.jobDetails.designation?.match(/supervisor|manager|lead|head/i)) {
        return NextResponse.json({
          message: 'Supervisors should use Supervisor login with email'
        }, { status: 403 });
      }
      */

      // Create token with the actual role from DB (employee or recruiter)
      const tokenRole = employee.role || 'employee';

      const token = jwt.sign(
        {
          id: employee._id.toString(),
          role: tokenRole,
          organizationId: employee.jobDetails?.organizationId?.toString() || null,
          designation: employee.jobDetails.designation,
          department: employee.jobDetails.department
        },
        JWT_SECRET,
        { expiresIn: TOKEN_MAX_AGE }
      );

      // Update employee with sessionToken
      await Employee.updateOne(
        { _id: employee._id },
        { $set: { sessionToken: token } }
      );

      const res = NextResponse.json({
        user: {
          id: employee._id.toString(),
          email: employee.personalDetails.email,
          role: tokenRole,
          designation: employee.jobDetails.designation,
          department: employee.jobDetails.department,
          personalDetails: {
            firstName: employee.personalDetails.firstName,
            lastName: employee.personalDetails.lastName
          }
        }
      });

      res.cookies.set('authToken', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: TOKEN_MAX_AGE
      });

      console.log('Employee login success:', username);

      await logActivity({
        action: "login",
        entity: "Employee",
        entityId: employee._id,
        description: `Employee logged in: ${username}`,
        performedBy: {
          userId: employee._id,
          name: `${employee.personalDetails.firstName} ${employee.personalDetails.lastName}`,
          email: employee.personalDetails.email,
          role: 'employee'
        },
        req: req
      });

      return res;
    }

    // --- ATTENDANCE-ONLY LOGIN (using Employee ID + Password) ---
    if (role === 'attendance_only') {
      // Find employee by employeeId with attendance_only role
      const employee = await Employee.findOne({
        employeeId: { $regex: new RegExp("^" + username + "$", "i") },
        role: 'attendance_only'
      }).select('+password');

      console.log('Attendance-only user lookup:', employee ? 'Found' : 'Not found');

      if (!employee) {
        return NextResponse.json({ message: 'Invalid Employee ID or Password' }, { status: 401 });
      }

      // Check if password is set
      if (!employee.password) {
        return NextResponse.json({ message: 'Password not set. Contact admin.' }, { status: 401 });
      }

      // Compare password
      const isPasswordValid = await bcrypt.compare(password, employee.password);
      if (!isPasswordValid) {
        return NextResponse.json({ message: 'Invalid Employee ID or Password' }, { status: 401 });
      }

      // Create token with attendance_only role
      const token = jwt.sign(
        {
          id: employee._id.toString(),
          role: 'attendance_only',
          organizationId: employee.jobDetails?.organizationId?.toString() || null,
          department: employee.jobDetails?.department || 'N/A'
        },
        JWT_SECRET,
        { expiresIn: TOKEN_MAX_AGE }
      );

      // Update with sessionToken
      await Employee.updateOne(
        { _id: employee._id },
        { $set: { sessionToken: token } }
      );

      const res = NextResponse.json({
        user: {
          id: employee._id.toString(),
          employeeId: employee.employeeId,
          role: 'attendance_only',
          permissions: ['attendance']
        }
      });

      res.cookies.set('authToken', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: TOKEN_MAX_AGE
      });

      console.log('Attendance-only login success:', username);

      await logActivity({
        action: "login",
        entity: "Employee",
        entityId: employee._id,
        description: `Attendance-only user logged in: ${username}`,
        performedBy: {
          userId: employee._id,
          name: employee.employeeId,
          email: '',
          role: 'attendance_only'
        },
        req: req
      });

      return res;
    }

    return NextResponse.json({ message: 'Invalid role' }, { status: 400 });
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json({ message: 'Server error: ' + err.message }, { status: 500 });
  }
}