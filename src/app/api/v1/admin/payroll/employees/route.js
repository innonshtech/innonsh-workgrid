import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import Employee from '@/lib/db/models/payroll/Employee';
import User from '@/lib/db/models/User';
import Template from '@/lib/db/models/crm/Template';
import Department from '@/lib/db/models/crm/Department/department';
import Organization from '@/lib/db/models/crm/organization/Organization';
import EmployeeType from '@/lib/db/models/crm/employee/EmployeeType';
import EmployeeCategory from '@/lib/db/models/crm/employee/EmployeeCategory';
import EmployeeSubCategory from '@/lib/db/models/crm/employee/EmployeeSubCategory';
import DocumentRequirement from '@/lib/db/models/payroll/DocumentRequirement';
import DocumentReminder from '@/lib/db/models/payroll/DocumentReminder';
import BusinessUnit from '@/lib/db/models/crm/organization/BusinessUnit';
import Team from '@/lib/db/models/crm/organization/Team';
import CostCenter from '@/lib/db/models/finance/CostCenter';
import WorkingShift from '@/lib/db/models/payroll/WorkingShift';
import { logActivity } from '@/lib/logger';
import { getAuthUser, authorize } from '@/lib/auth-util';
// Helper function to convert empty strings to null for ObjectId fields
const cleanObjectIdFields = (data) => {
  const cleaned = { ...data };

  if (cleaned.jobDetails) {
    if (cleaned.jobDetails.departmentId === '' || !cleaned.jobDetails.departmentId) {
      cleaned.jobDetails.departmentId = null;
    }
    if (cleaned.jobDetails.organizationId === '' || !cleaned.jobDetails.organizationId) {
      cleaned.jobDetails.organizationId = null;
    }
    if (cleaned.jobDetails.reportingManager === '' || !cleaned.jobDetails.reportingManager) {
      cleaned.jobDetails.reportingManager = null;
    }
    // Clean new ObjectId fields
    if (cleaned.jobDetails.teamLead === '' || !cleaned.jobDetails.teamLead) {
      cleaned.jobDetails.teamLead = null;
    }
    if (cleaned.jobDetails.supervisor === '' || !cleaned.jobDetails.supervisor) {
      cleaned.jobDetails.supervisor = null;
    }
    // Clean nested hierarchy ObjectId fields
    if (cleaned.jobDetails.employeeTypeId === '' || !cleaned.jobDetails.employeeTypeId) {
      cleaned.jobDetails.employeeTypeId = null;
    }
    if (cleaned.jobDetails.categoryId === '' || !cleaned.jobDetails.categoryId) {
      cleaned.jobDetails.categoryId = null;
    }
    if (cleaned.jobDetails.businessUnitId === '' || !cleaned.jobDetails.businessUnitId) {
      cleaned.jobDetails.businessUnitId = null;
    }
    if (cleaned.jobDetails.teamId === '' || !cleaned.jobDetails.teamId) {
      cleaned.jobDetails.teamId = null;
    }
    if (cleaned.jobDetails.costCenterId === '' || !cleaned.jobDetails.costCenterId) {
      cleaned.jobDetails.costCenterId = null;
    }
    if (cleaned.jobDetails.businessUnitId === '' || !cleaned.jobDetails.businessUnitId) {
      cleaned.jobDetails.businessUnitId = null;
    }
    if (cleaned.jobDetails.teamId === '' || !cleaned.jobDetails.teamId) {
      cleaned.jobDetails.teamId = null;
    }
    if (cleaned.jobDetails.assignedOfficeId === '' || !cleaned.jobDetails.assignedOfficeId) {
      cleaned.jobDetails.assignedOfficeId = null;
    }
    if (cleaned.jobDetails.defaultShift === '' || !cleaned.jobDetails.defaultShift) {
      cleaned.jobDetails.defaultShift = null;
    }
  }


  return cleaned;
};

// Helper function to validate required fields
const validateEmployeeData = (data) => {
  const errors = [];

  // Employee ID is auto-generated if missing during POST, so don't validate it strictly here for new employees.
  // We can skip this check if we expect it to be generated.

  // Password is not required during admin creation as it is usually auto-generated or set later
  // We can skip this check.

  // For attendance_only role, skip all other validations
  if (data.role === 'attendance_only') {
    return errors;
  }

  // Regular employee validation
  // Personal details validation
  if (!data.personalDetails?.firstName) {
    errors.push('First name is required');
  }
  if (!data.personalDetails?.lastName) {
    errors.push('Last name is required');
  }
  if (!data.personalDetails?.email) {
    errors.push('Email is required');
  }
  if (!data.personalDetails?.phone) {
    errors.push('Phone number is required');
  }
  if (!data.personalDetails?.dateOfJoining) {
    errors.push('Date of joining is required');
  }

  if (!data.jobDetails?.organizationId) {
    errors.push('Organization is required');
  }
  if (!data.jobDetails?.departmentId) {
    errors.push('Department is required');
  }


  // Working hours validation
  if (!data.workingHr) {
    errors.push('Working hours are required');
  }

  // Payslip structure validation
  if (!data.payslipStructure) {
    errors.push('Payslip structure is required');
  } else {
    if (!data.payslipStructure.basicSalary || data.payslipStructure.basicSalary <= 0) {
      errors.push('Basic salary must be greater than 0');
    }
    if (!data.payslipStructure.salaryType) {
      errors.push('Salary type is required');
    }
  }

  // Bank details validation
  if (!data.salaryDetails?.bankAccount?.accountNumber) {
    errors.push('Bank account number is required');
  }
  if (!data.salaryDetails?.bankAccount?.bankName) {
    errors.push('Bank name is required');
  }
  if (!data.salaryDetails?.bankAccount?.ifscCode) {
    errors.push('IFSC code is required');
  }

  return errors;
};

// GET all employees with organization filtering
export async function GET(request) {
  try {
    const authUser = await getAuthUser();
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const department = searchParams.get('department');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const organizationId = searchParams.get('organizationId');
    const experienceType = searchParams.get('experienceType');
    const employeeType = searchParams.get('employeeType');
    const category = searchParams.get('category');
    const otApplicable = searchParams.get('otApplicable');
    const esicApplicable = searchParams.get('esicApplicable');
    const pfApplicable = searchParams.get('pfApplicable');
    const probation = searchParams.get('probation');
    const supervisorUserId = searchParams.get('supervisorUserId');
    const role = searchParams.get('role');

    const skip = (page - 1) * limit;

    let filter = {};

    // Filter by supervisor (only show employees assigned to this supervisor)
    if (supervisorUserId && supervisorUserId !== 'undefined') {
      let supervisorEmployeeId = null;

      // Try finding as User first
      try {
        const supervisorUser = await User.findById(supervisorUserId);
        if (supervisorUser?.employeeId) {
          supervisorEmployeeId = supervisorUser.employeeId;
        }
      } catch (e) {
        // Not a User ID, possibly an Employee ID directly
      }

      // If not linked to User, check if supervisorUserId IS the Employee ID (for Employee Supervisors)
      let supervisorEmployee;
      if (supervisorEmployeeId) {
        supervisorEmployee = await Employee.findOne({ employeeId: supervisorEmployeeId });
      } else {
        try {
          supervisorEmployee = await Employee.findById(supervisorUserId);
        } catch (e) { }
      }

      if (supervisorEmployee) {
        const supervisees = await Employee.find({
          $or: [
            { "attendanceApproval.shift1Supervisor": supervisorEmployee._id },
            { "attendanceApproval.shift2Supervisor": supervisorEmployee._id }
          ]
        }).distinct('_id');

        if (supervisees.length > 0) {
          filter._id = { $in: supervisees };
        } else {
          filter._id = { $in: [] };
        }
      } else {
        // invalid supervisor ID provided
        filter._id = { $in: [] };
      }
    }

    if (authUser.role === 'admin' && authUser.organizationId) {
      filter['jobDetails.organizationId'] = authUser.organizationId;
    } else if (organizationId) {
      filter['jobDetails.organizationId'] = organizationId;
    }
    if (department) {
      filter['jobDetails.departmentId'] = department;
    }
    if (status) {
      filter.status = status;
    }
    if (experienceType) {
      filter.experienceType = experienceType;
    }
    if (employeeType) {
      filter.employeeType = employeeType;
    }
    if (category) {
      filter.category = category;
    }
    if (otApplicable) {
      filter.otApplicable = otApplicable;
    }
    if (esicApplicable) {
      filter.esicApplicable = esicApplicable;
    }
    if (pfApplicable) {
      filter.pfApplicable = pfApplicable;
    }
    if (probation) {
      filter.probation = probation;
    }
    if (role) {
      filter.role = role;
    }

    if (search) {
      filter.$or = [
        { employeeId: { $regex: search, $options: 'i' } },
        { 'personalDetails.firstName': { $regex: search, $options: 'i' } },
        { 'personalDetails.lastName': { $regex: search, $options: 'i' } },
        { 'personalDetails.email': { $regex: search, $options: 'i' } },
        { 'jobDetails.designation': { $regex: search, $options: 'i' } },
      ];
    }

    const employees = await Employee.find(filter)
      .populate('jobDetails.reportingManager', 'personalDetails.firstName personalDetails.lastName employeeId')
      .populate('jobDetails.departmentId', 'departmentName')
      .populate('jobDetails.organizationId', 'name')
      .populate('jobDetails.businessUnitId', 'name')
      .populate('jobDetails.teamId', 'name')
      .populate('jobDetails.costCenterId', 'name code')
      .populate('attendanceApproval.shift1Supervisor', 'personalDetails.firstName personalDetails.lastName employeeId')
      .populate('attendanceApproval.shift2Supervisor', 'personalDetails.firstName personalDetails.lastName employeeId')
      .populate('jobDetails.employeeTypeId', 'employeeType')
      .populate('jobDetails.categoryId', 'employeeCategory')
      .populate('jobDetails.defaultShift', 'name startTime endTime color')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Employee.countDocuments(filter);

    // Get counts for filters
    const statusCounts = await Employee.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const categoryCounts = await Employee.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);

    const experienceTypeCounts = await Employee.aggregate([
      { $group: { _id: '$experienceType', count: { $sum: 1 } } }
    ]);

    return NextResponse.json({
      success: true,
      data: employees,
      counts: {
        status: statusCounts,
        category: categoryCounts,
        experienceType: experienceTypeCounts
      },
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error in GET /api/v1/admin/payroll/employees:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// Function to check document requirements and create reminders
async function checkDocumentRequirements(employee) {
  try {
    console.log("🔍 Checking document requirements for employee:", employee.employeeId);

    // Get all active document requirements
    const requirements = await DocumentRequirement.find({ isActive: true });

    if (requirements.length === 0) {
      console.log("ℹ️ No active document requirements found");
      return;
    }

    // Get submitted documents
    const submittedDocs = employee.documents || [];
    const submittedTypes = submittedDocs.map(doc => doc.categoryName || doc.name);

    // Find missing documents
    const missingDocuments = [];

    requirements.forEach(requirement => {
      if (requirement.isRequired) {
        const isSubmitted = submittedTypes.some(type =>
          type.toLowerCase().includes(requirement.documentType.toLowerCase()) ||
          requirement.documentType.toLowerCase().includes(type.toLowerCase())
        );

        if (!isSubmitted) {
          missingDocuments.push({
            documentType: requirement.documentType,
            reminderSent: false,
            reminderDate: new Date(),
            nextReminderDate: new Date(Date.now() + (requirement.reminderDays * 24 * 60 * 60 * 1000))
          });
        }
      }
    });

    if (missingDocuments.length > 0) {
      console.log(`📄 Creating document reminder for ${missingDocuments.length} missing documents`);

      // Create document reminder
      await DocumentReminder.create({
        employeeId: employee._id,
        missingDocuments,
        status: 'pending',
        createdBy: employee.createdBy || employee.updatedBy
      });
    } else {
      console.log("✅ All required documents are submitted");
    }

  } catch (error) {
    console.error("❌ Error checking document requirements:", error);
    // Don't throw error to avoid breaking employee creation
  }
}

// CREATE new employee
export async function POST(request) {
  try {
    const authUser = await getAuthUser();
    authorize(authUser, ['admin', 'super_admin']);

    await dbConnect();

    const body = await request.json();
    console.log("📥 Received employee data:", JSON.stringify(body, null, 2));

    // Validate required fields
    const validationErrors = validateEmployeeData(body);
    if (validationErrors.length > 0) {
      console.log("🚫 Validation errors:", validationErrors);
      return NextResponse.json(
        { error: 'Validation failed', details: validationErrors },
        { status: 400 }
      );
    }

    // Clean empty string ObjectId fields
    const cleanedBody = cleanObjectIdFields(body);

    // Check if email already exists (skip for attendance_only users without email)
    if (cleanedBody.personalDetails?.email) {
      const existingEmail = await Employee.findOne({
        'personalDetails.email': cleanedBody.personalDetails.email
      });

      if (existingEmail) {
        return NextResponse.json(
          { error: 'Email already exists' },
          { status: 400 }
        );
      }
    }

    // Check if employeeId already exists
    if (cleanedBody.employeeId) {
      const existingEmployeeId = await Employee.findOne({
        employeeId: cleanedBody.employeeId
      });

      if (existingEmployeeId) {
        return NextResponse.json(
          { error: 'Employee ID already exists' },
          { status: 400 }
        );
      }
    }

    // Auto-generate Employee ID if not provided
    let employeeId = cleanedBody.employeeId;

    if (!employeeId) {
      // Sort by createdAt descending -— alphabetical sort on employeeId breaks at EMP9 vs EMP10
      const lastEmployee = await Employee.findOne().sort({ createdAt: -1 });
      let newEmployeeId = "EMP001";

      if (lastEmployee && lastEmployee.employeeId) {
        const lastIdNumber = parseInt(lastEmployee.employeeId.replace(/\D/g, "")) || 0;
        newEmployeeId = `EMP${String(lastIdNumber + 1).padStart(3, "0")}`;
      }

      // Safety check: if generated ID already exists (race condition), find next available gap
      const existingWithId = await Employee.findOne({ employeeId: newEmployeeId });
      if (existingWithId) {
        const allEmployees = await Employee.find({}, "employeeId");
        const usedNumbers = allEmployees
          .map((e) => parseInt((e.employeeId || "").replace(/\D/g, "")) || 0)
          .sort((a, b) => a - b);
        let nextId = 1;
        for (const num of usedNumbers) {
          if (num === nextId) nextId++;
        }
        newEmployeeId = `EMP${String(nextId).padStart(3, "0")}`;
      }

      employeeId = newEmployeeId;
    }

    // Check if this is an attendance-only user
    const isAttendanceOnly = cleanedBody.role === 'attendance_only';

    // Prepare employee data
    // Prepare employee data
    const employeeData = {
      ...cleanedBody,
      employeeId: employeeId,
      // Top Level Fields
      role: cleanedBody.role || 'employee',
      password: cleanedBody.password, // Will be hashed by pre-save hook if provided
      isCompliant: cleanedBody.isCompliant || false,
      isTDSApplicable: cleanedBody.isTDSApplicable || false,

      experienceType: cleanedBody.experienceType || '',
      workingHr: cleanedBody.workingHr || 9,
      otApplicable: cleanedBody.otApplicable || 'no',
      esicApplicable: cleanedBody.esicApplicable || 'no',
      pfApplicable: cleanedBody.pfApplicable || 'no',
      probation: cleanedBody.probation || 'no',
      isAttending: cleanedBody.isAttending || 'no',

      // Personal Details - provide defaults for attendance-only users
      personalDetails: {
        ...cleanedBody.personalDetails,
        firstName: cleanedBody.personalDetails?.firstName || (isAttendanceOnly ? 'Attendance' : ''),
        lastName: cleanedBody.personalDetails?.lastName || (isAttendanceOnly ? 'User' : ''),
        email: cleanedBody.personalDetails?.email || (isAttendanceOnly ? `${employeeId.toLowerCase()}@attendance.local` : ''),
        phone: cleanedBody.personalDetails?.phone || (isAttendanceOnly ? '0000000000' : ''),
        dateOfJoining: cleanedBody.personalDetails?.dateOfJoining || (isAttendanceOnly ? new Date().toISOString().split('T')[0] : ''),
        gender: cleanedBody.personalDetails?.gender || (isAttendanceOnly ? 'Other' : undefined),
        bloodGroup: cleanedBody.personalDetails?.bloodGroup || '',
        address: cleanedBody.personalDetails?.currentAddress || cleanedBody.personalDetails?.address || {},
        permanentAddress: cleanedBody.personalDetails?.permanentAddress || {},
        temporaryAddress: cleanedBody.personalDetails?.temporaryAddress || {},
      },

      // Job details - provide defaults for attendance-only users
      jobDetails: {
        ...cleanedBody.jobDetails,
        department: cleanedBody.jobDetails?.department || (isAttendanceOnly ? 'Attendance' : ''),
        designation: cleanedBody.jobDetails?.designation || (isAttendanceOnly ? 'Attendance Operator' : ''),
        departmentId: cleanedBody.jobDetails?.departmentId || null,
        organizationId: cleanedBody.jobDetails?.organizationId || null,
        reportingManager: cleanedBody.jobDetails?.reportingManager || null,
        employmentType: cleanedBody.jobDetails?.employmentType || 'Full-Time',
        teamLead: cleanedBody.jobDetails?.teamLead || null,
        supervisor: cleanedBody.jobDetails?.supervisor || null,
        workLocation: cleanedBody.jobDetails?.workLocation || '',
        employeeTypeId: cleanedBody.jobDetails?.employeeTypeId || null,
        categoryId: cleanedBody.jobDetails?.categoryId || null,
        businessUnitId: cleanedBody.jobDetails?.businessUnitId || null,
        teamId: cleanedBody.jobDetails?.teamId || null,
        costCenterId: cleanedBody.jobDetails?.costCenterId || null,
        assignedOfficeId: cleanedBody.jobDetails?.assignedOfficeId || null,
        biometricDeviceId: cleanedBody.jobDetails?.biometricDeviceId || "",
      },

      // Attendance approval
      attendanceApproval: {
        required: cleanedBody.attendanceApproval?.required || 'no',
        shift1Supervisor: cleanedBody.attendanceApproval?.shift1Supervisor || null,
        shift2Supervisor: cleanedBody.attendanceApproval?.shift2Supervisor || null,
      },

      // Salary Details - provide defaults for attendance-only users
      salaryDetails: {
        ...cleanedBody.salaryDetails,
        bankAccount: {
          accountNumber: cleanedBody.salaryDetails?.bankAccount?.accountNumber || (isAttendanceOnly ? '000000000' : ''),
          bankName: cleanedBody.salaryDetails?.bankAccount?.bankName || (isAttendanceOnly ? 'N/A' : ''),
          ifscCode: cleanedBody.salaryDetails?.bankAccount?.ifscCode || (isAttendanceOnly ? 'XXXX0000000' : ''),
          branch: cleanedBody.salaryDetails?.bankAccount?.branch || '',
          branchAddress: cleanedBody.salaryDetails?.bankAccount?.branchAddress || ''
        },
        panNumber: cleanedBody.salaryDetails?.panNumber || '',
        aadharNumber: cleanedBody.salaryDetails?.aadharNumber || '',
      },

      documents: cleanedBody.documents || [],
      status: cleanedBody.status || 'Active',

      // Payslip Structure - minimal for attendance-only users
      payslipStructure: {
        templateId: cleanedBody.payslipStructure?.templateId || null,
        templateName: cleanedBody.payslipStructure?.templateName || '',
        salaryType: cleanedBody.payslipStructure?.salaryType || 'monthly',
        basicSalary: cleanedBody.payslipStructure?.basicSalary || (isAttendanceOnly ? 0 : 0),
        earnings: cleanedBody.payslipStructure?.earnings || [],
        deductions: cleanedBody.payslipStructure?.deductions || [],
        additionalFields: cleanedBody.payslipStructure?.additionalFields || [],
        grossSalary: cleanedBody.payslipStructure?.grossSalary || 0,
      }
    };

    console.log("📝 Creating employee with data:", JSON.stringify(employeeData, null, 2));

    // Create employee
    const employee = await Employee.create(employeeData);

    // Populate references for response
    await employee.populate([
      { path: 'jobDetails.reportingManager', select: 'personalDetails.firstName personalDetails.lastName employeeId' },
      { path: 'jobDetails.departmentId', select: 'departmentName' },
      { path: 'jobDetails.organizationId', select: 'name' },
      { path: 'attendanceApproval.shift1Supervisor', select: 'personalDetails.firstName personalDetails.lastName employeeId' },
      { path: 'attendanceApproval.shift2Supervisor', select: 'personalDetails.firstName personalDetails.lastName employeeId' },
      { path: 'jobDetails.employeeTypeId', select: 'employeeType' },
      { path: 'jobDetails.categoryId', select: 'employeeCategory' },
      { path: 'jobDetails.businessUnitId', select: 'name' },
      { path: 'jobDetails.teamId', select: 'name' },
      { path: 'jobDetails.costCenterId', select: 'name code' },
    ]);

    console.log("✅ Employee created successfully:", employee.employeeId);
    console.log("💰 Payslip structure:", {
      salaryType: employee.payslipStructure.salaryType,
      basicSalary: employee.payslipStructure.basicSalary,
      netSalary: employee.payslipStructure.netSalary,
      earningsCount: employee.payslipStructure.earnings.length,
      deductionsCount: employee.payslipStructure.deductions.length
    });

    // Check document requirements and create reminders asynchronously
    checkDocumentRequirements(employee).catch(error => {
      console.error("Error in document requirement check:", error);
    });

    // Fetch createdBy user details
    let performer = null;
    if (body.createdBy) {
      performer = await User.findById(body.createdBy);
    }

    // Log activity
    await logActivity({
      action: "created",
      entity: "Employee",
      entityId: employee.employeeId,
      description: `Created new employee: ${employee.personalDetails.firstName} ${employee.personalDetails.lastName} (${employee.employeeId})`,
      performedBy: {
        userId: employee.createdBy,
        name: performer?.name || "Admin/User",
        email: performer?.email,
        role: performer?.role
      },
      details: {
        employeeId: employee.employeeId
      },
      req: request
    });

    return NextResponse.json({ success: true, data: employee }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/v1/admin/payroll/employees:', error);
    
    // Handle Mongoose validation errors gracefully to display on frontend
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return NextResponse.json({
        success: false,
        error: messages.join(', '),
        validationErrors: error.errors
      }, { status: 400 });
    }

    return NextResponse.json({
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}