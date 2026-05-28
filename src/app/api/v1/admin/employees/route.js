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
    if (cleaned.jobDetails.assignedOfficeId === '' || !cleaned.jobDetails.assignedOfficeId) {
      cleaned.jobDetails.assignedOfficeId = null;
    }
    if (cleaned.jobDetails.defaultShift === '' || !cleaned.jobDetails.defaultShift) {
      cleaned.jobDetails.defaultShift = null;
    }
  }

  // Clean attendanceApproval supervisor ObjectId fields
  if (cleaned.attendanceApproval) {
    if (cleaned.attendanceApproval.shift1Supervisor === '' || !cleaned.attendanceApproval.shift1Supervisor) {
      cleaned.attendanceApproval.shift1Supervisor = null;
    }
    if (cleaned.attendanceApproval.shift2Supervisor === '' || !cleaned.attendanceApproval.shift2Supervisor) {
      cleaned.attendanceApproval.shift2Supervisor = null;
    }
  }

  return cleaned;
};

// Helper function to validate required fields
const validateEmployeeData = (data) => {
  const errors = [];

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
    authorize(authUser, ['admin', 'hr', 'company_admin', 'super_admin', 'employee']);
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

    const skip = (page - 1) * limit;

    let filter = {};

    // SaaS PROTECTION: Restrict admin/hr to their own org
    if (authUser.role !== "super_admin" && authUser.organizationId) {
      filter['jobDetails.organizationId'] = authUser.organizationId;
    } else if (organizationId) {
      filter['jobDetails.organizationId'] = organizationId;
    }

    // Filter by supervisor (only show employees assigned to this supervisor)
    if (supervisorUserId && supervisorUserId !== 'undefined') {
      let supervisorEmployeeId = null;

      // Try finding as User first
      try {
        const supervisorUser = await User.findById(supervisorUserId);
        if (supervisorUser?.employeeId) {
          supervisorEmployeeId = supervisorUser.employeeId;
        }
      } catch (e) {}

      let supervisorEmployee;
      if (supervisorEmployeeId) {
        supervisorEmployee = await Employee.findOne({ employeeId: supervisorEmployeeId });
      } else {
        try {
          supervisorEmployee = await Employee.findById(supervisorUserId);
        } catch (e) {}
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
        filter._id = { $in: [] };
      }
    }

    if (department) filter['jobDetails.departmentId'] = department;
    if (status) filter.status = status;
    if (experienceType) filter.experienceType = experienceType;
    if (employeeType) filter.employeeType = employeeType;
    if (category) filter.category = category;
    if (otApplicable) filter.otApplicable = otApplicable;
    if (esicApplicable) filter.esicApplicable = esicApplicable;
    if (pfApplicable) filter.pfApplicable = pfApplicable;
    if (probation) filter.probation = probation;

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
      { $filter: filter ? { $match: filter } : { $match: {} } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]).catch(() => []);

    return NextResponse.json({
      success: true,
      data: employees,
      counts: {
        status: statusCounts,
      },
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error in GET /api/v1/admin/employees:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// Function to check document requirements and create reminders
async function checkDocumentRequirements(employee) {
  try {
    const requirements = await DocumentRequirement.find({ isActive: true });
    if (requirements.length === 0) return;

    const submittedDocs = employee.documents || [];
    const submittedTypes = submittedDocs.map(doc => doc.categoryName || doc.name);

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
      await DocumentReminder.create({
        employeeId: employee._id,
        missingDocuments,
        status: 'pending',
        createdBy: employee.createdBy || employee.updatedBy
      });
    }
  } catch (error) {
    console.error("Error checking document requirements:", error);
  }
}

// CREATE new employee
export async function POST(request) {
  try {
    const authUser = await getAuthUser();
    authorize(authUser, ['admin', 'hr', 'company_admin', 'super_admin']);
    await dbConnect();

    const body = await request.json();

    // Validate required fields
    const validationErrors = validateEmployeeData(body);
    if (validationErrors.length > 0) {
      return NextResponse.json({ success: false, error: 'Validation failed', details: validationErrors }, { status: 400 });
    }

    const cleanedBody = cleanObjectIdFields(body);

    // SaaS PROTECTION: Restrict admin/hr to their own org
    if (authUser.role !== "super_admin" && authUser.organizationId) {
       if (!cleanedBody.jobDetails) cleanedBody.jobDetails = {};
       cleanedBody.jobDetails.organizationId = authUser.organizationId;
    }

    if (cleanedBody.personalDetails?.email) {
      const existingEmail = await Employee.findOne({'personalDetails.email': cleanedBody.personalDetails.email});
      if (existingEmail) return NextResponse.json({ success: false, error: 'Email already exists' }, { status: 400 });
    }

    if (!cleanedBody.employeeId) {
      const lastEmployee = await Employee.findOne().sort({ createdAt: -1 });
      let nextId = 1;
      if (lastEmployee && lastEmployee.employeeId) {
        nextId = (parseInt(lastEmployee.employeeId.replace(/\D/g, "")) || 0) + 1;
      }
      cleanedBody.employeeId = `EMP${String(nextId).padStart(3, "0")}`;
    }

    // Auto-set createdBy from auth session if not provided
    if (!cleanedBody.createdBy) {
      cleanedBody.createdBy = authUser.id;
    }

    // Ensure currentAddress is mapped to address for DB schema compatibility
    if (cleanedBody.personalDetails) {
      cleanedBody.personalDetails.address = cleanedBody.personalDetails.currentAddress || cleanedBody.personalDetails.address || {};
    }

    const employee = await Employee.create(cleanedBody);
    
    // Asynchronous document check
    checkDocumentRequirements(employee).catch(console.error);

    await logActivity({
      action: "created",
      entity: "Employee",
      entityId: employee.employeeId,
      description: `Created new employee: ${employee.personalDetails.firstName} ${employee.personalDetails.lastName}`,
      performedBy: {
        userId: authUser.id,
        name: authUser.name,
        role: authUser.role
      },
      req: request
    });

    return NextResponse.json({ success: true, data: employee }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/v1/admin/employees:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
