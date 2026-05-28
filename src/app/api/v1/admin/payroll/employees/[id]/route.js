
import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db/connect';
import Employee from '@/lib/db/models/payroll/Employee';
import User from '@/lib/db/models/User';
import Department from '@/lib/db/models/crm/Department/department';
import EmployeeCategory from '@/lib/db/models/crm/employee/EmployeeCategory';
import EmployeeType from '@/lib/db/models/crm/employee/EmployeeType';
import Organization from '@/lib/db/models/crm/organization/Organization';
import BusinessUnit from '@/lib/db/models/crm/organization/BusinessUnit';
import Team from '@/lib/db/models/crm/organization/Team';
import CostCenter from '@/lib/db/models/finance/CostCenter';
import WorkingShift from '@/lib/db/models/payroll/WorkingShift';
import { logActivity } from '@/lib/logger';
import bcrypt from 'bcryptjs';

// Helper function to clean ObjectId fields
const cleanObjectId = (val) => {
  if (!val || val === '') return null;
  if (typeof val === 'object' && val._id) return val._id;
  if (mongoose.Types.ObjectId.isValid(val)) return val;
  return val;
};

const cleanObjectIdFields = (data) => {
  const cleaned = { ...data };

  if (cleaned.jobDetails) {
    cleaned.jobDetails = { ...cleaned.jobDetails };
    cleaned.jobDetails.departmentId = cleanObjectId(cleaned.jobDetails.departmentId);
    cleaned.jobDetails.organizationId = cleanObjectId(cleaned.jobDetails.organizationId);
    cleaned.jobDetails.reportingManager = cleanObjectId(cleaned.jobDetails.reportingManager);
    cleaned.jobDetails.teamLead = cleanObjectId(cleaned.jobDetails.teamLead);
    cleaned.jobDetails.supervisor = cleanObjectId(cleaned.jobDetails.supervisor);
    cleaned.jobDetails.employeeTypeId = cleanObjectId(cleaned.jobDetails.employeeTypeId);
    cleaned.jobDetails.categoryId = cleanObjectId(cleaned.jobDetails.categoryId);
    cleaned.jobDetails.businessUnitId = cleanObjectId(cleaned.jobDetails.businessUnitId);
    cleaned.jobDetails.teamId = cleanObjectId(cleaned.jobDetails.teamId);
    cleaned.jobDetails.costCenterId = cleanObjectId(cleaned.jobDetails.costCenterId);
    cleaned.jobDetails.assignedOfficeId = cleanObjectId(cleaned.jobDetails.assignedOfficeId);
    cleaned.jobDetails.defaultShift = cleanObjectId(cleaned.jobDetails.defaultShift);
    cleaned.jobDetails.holidayListId = cleanObjectId(cleaned.jobDetails.holidayListId);
  }

  if (cleaned.attendanceApproval) {
    cleaned.attendanceApproval = { ...cleaned.attendanceApproval };
    cleaned.attendanceApproval.shift1Supervisor = cleanObjectId(cleaned.attendanceApproval.shift1Supervisor);
    cleaned.attendanceApproval.shift2Supervisor = cleanObjectId(cleaned.attendanceApproval.shift2Supervisor);
  }

  if (cleaned.createdBy) cleaned.createdBy = cleanObjectId(cleaned.createdBy);
  if (cleaned.updatedBy) cleaned.updatedBy = cleanObjectId(cleaned.updatedBy);
  return cleaned;
};

// GET single employee
export async function GET(request, { params }) {
  try {
    await dbConnect();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid employee ID format' }, { status: 400 });
    }

    let employee = await Employee.findById(id)
      .populate('jobDetails.reportingManager', 'personalDetails.firstName personalDetails.lastName employeeId')
      .populate('jobDetails.teamLead', 'personalDetails.firstName personalDetails.lastName employeeId')
      .populate('jobDetails.departmentId', 'departmentName')
      .populate('jobDetails.organizationId', 'name')
      .populate('jobDetails.businessUnitId', 'name')
      .populate('jobDetails.teamId', 'name')
      .populate('jobDetails.costCenterId', 'name code')
      .populate('attendanceApproval.shift1Supervisor', 'personalDetails.firstName personalDetails.lastName employeeId')
      .populate('attendanceApproval.shift2Supervisor', 'personalDetails.firstName personalDetails.lastName employeeId')
      .populate('jobDetails.employeeTypeId', 'employeeType')
      .populate('jobDetails.categoryId', 'employeeCategory')
      .populate('jobDetails.defaultShift', 'name startTime endTime color');

    // Fallback: If not found by document _id, check if 'id' is a User ID
    if (!employee) {
      const user = await User.findById(id);
      if (user && user.employeeId) {
        employee = await Employee.findOne({ employeeId: user.employeeId })
          .populate('jobDetails.reportingManager', 'personalDetails.firstName personalDetails.lastName employeeId')
          .populate('jobDetails.teamLead', 'personalDetails.firstName personalDetails.lastName employeeId')
          .populate('jobDetails.departmentId', 'departmentName')
          .populate('jobDetails.organizationId', 'name')
          .populate('jobDetails.businessUnitId', 'name')
          .populate('jobDetails.teamId', 'name')
          .populate('jobDetails.costCenterId', 'name code')
          .populate('attendanceApproval.shift1Supervisor', 'personalDetails.firstName personalDetails.lastName employeeId')
          .populate('attendanceApproval.shift2Supervisor', 'personalDetails.firstName personalDetails.lastName employeeId')
          .populate('jobDetails.employeeTypeId', 'employeeType')
          .populate('jobDetails.categoryId', 'employeeCategory')
          .populate('jobDetails.defaultShift', 'name startTime endTime color');
      }
    }

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    return NextResponse.json(employee);
  } catch (error) {
    console.error('❌ Error in GET /api/payroll/employees/[id]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// UPDATE employee
export async function PUT(request, { params }) {
  try {
    await dbConnect();
    const { id } = await params;
    const body = await request.json();
    console.log("📥 Updating employee with data:", JSON.stringify(body, null, 2));

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid employee ID format' }, { status: 400 });
    }

    // Check if employee exists and include password for fallback
    const existingEmployee = await Employee.findById(id).select('+password');
    if (!existingEmployee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Check if email is being changed and if it already exists
    if (body.personalDetails?.email && body.personalDetails.email !== existingEmployee.personalDetails.email) {
      const existingEmail = await Employee.findOne({
        'personalDetails.email': body.personalDetails.email,
        _id: { $ne: id }  // ← correctly use destructured `id`, not `params.id`
      });

      if (existingEmail) {
        return NextResponse.json(
          { error: 'Email already exists' },
          { status: 400 }
        );
      }
    }

    // Clean ObjectId fields
    const cleanedBody = cleanObjectIdFields(body);
    const updateData = {
      ...cleanedBody,

      role: cleanedBody.role || existingEmployee.role || 'employee',
      // Password update requires special handling usually, but if sent here, it will be hashed by pre-save if we were using .save(). 
      // specific findByIdAndUpdate bypasses pre-save hooks unless we use { runValidators: true } which doesn't trigger hooks.
      // Ideally password update should be a separate endpoint or we load -> set -> save.
      password: cleanedBody.password ? await bcrypt.hash(cleanedBody.password, 10) : existingEmployee.password,
      isCompliant: (cleanedBody.isCompliant !== undefined) ? cleanedBody.isCompliant : existingEmployee.isCompliant,
      isTDSApplicable: (cleanedBody.isTDSApplicable !== undefined) ? cleanedBody.isTDSApplicable : existingEmployee.isTDSApplicable,

      // Personal Details
      personalDetails: {
        ...existingEmployee.personalDetails, // properties not in schema but in DB?
        ...cleanedBody.personalDetails,
        // Ensure nesting merging
        bloodGroup: cleanedBody.personalDetails?.bloodGroup || existingEmployee.personalDetails?.bloodGroup || '',
        address: cleanedBody.personalDetails?.currentAddress || cleanedBody.personalDetails?.address || existingEmployee.personalDetails?.address || {},
        permanentAddress: cleanedBody.personalDetails?.permanentAddress || existingEmployee.personalDetails?.permanentAddress || {},
        temporaryAddress: cleanedBody.personalDetails?.temporaryAddress || existingEmployee.personalDetails?.temporaryAddress || {},
      },

      // New fields from form
      experienceType: cleanedBody.experienceType || existingEmployee.experienceType || '',
      workingHr: (cleanedBody.workingHr !== undefined) ? cleanedBody.workingHr : (existingEmployee.workingHr || 9),
      otApplicable: cleanedBody.otApplicable || existingEmployee.otApplicable || 'no',
      esicApplicable: cleanedBody.esicApplicable || existingEmployee.esicApplicable || 'no',
      pfApplicable: cleanedBody.pfApplicable || existingEmployee.pfApplicable || 'no',
      probation: cleanedBody.probation || existingEmployee.probation || 'no',
      isAttending: cleanedBody.isAttending || existingEmployee.isAttending || 'no',
      isTDSApplicable: (cleanedBody.isTDSApplicable !== undefined) ? cleanedBody.isTDSApplicable : (existingEmployee.isTDSApplicable || false),
      createdBy: existingEmployee.createdBy || cleanedBody.updatedBy || cleanedBody.createdBy || null,

      // Job details
      jobDetails: {
        ...(existingEmployee.jobDetails?.toObject ? existingEmployee.jobDetails.toObject() : existingEmployee.jobDetails),
        ...cleanedBody.jobDetails,
        departmentId: cleanedBody.jobDetails?.departmentId || existingEmployee.jobDetails?.departmentId,
        organizationId: cleanedBody.jobDetails?.organizationId || existingEmployee.jobDetails?.organizationId,
        reportingManager: cleanedBody.jobDetails?.reportingManager || existingEmployee.jobDetails?.reportingManager,
        employmentType: cleanedBody.jobDetails?.employmentType || existingEmployee.jobDetails?.employmentType || 'Full-Time',
        teamLead: (cleanedBody.jobDetails?.teamLead !== undefined) ? cleanedBody.jobDetails.teamLead : existingEmployee.jobDetails?.teamLead,
        supervisor: (cleanedBody.jobDetails?.supervisor !== undefined) ? cleanedBody.jobDetails.supervisor : existingEmployee.jobDetails?.supervisor,
        workLocation: cleanedBody.jobDetails?.workLocation || existingEmployee.jobDetails?.workLocation || '',
        // Nested hierarchy fields
        // Nested hierarchy fields
        employeeTypeId: cleanedBody.jobDetails?.employeeTypeId || existingEmployee.jobDetails?.employeeTypeId,
        categoryId: cleanedBody.jobDetails?.categoryId || existingEmployee.jobDetails?.categoryId,
        businessUnitId: cleanedBody.jobDetails?.businessUnitId || existingEmployee.jobDetails?.businessUnitId,
        teamId: cleanedBody.jobDetails?.teamId || existingEmployee.jobDetails?.teamId,
        costCenterId: cleanedBody.jobDetails?.costCenterId || existingEmployee.jobDetails?.costCenterId,
        assignedOfficeId: cleanedBody.jobDetails?.assignedOfficeId || existingEmployee.jobDetails?.assignedOfficeId,
        biometricDeviceId: cleanedBody.jobDetails?.biometricDeviceId || existingEmployee.jobDetails?.biometricDeviceId,
      },

      // Attendance approval
      attendanceApproval: {
        required: cleanedBody.attendanceApproval?.required || existingEmployee.attendanceApproval?.required || 'no',
        shift1Supervisor: cleanedBody.attendanceApproval?.shift1Supervisor || existingEmployee.attendanceApproval?.shift1Supervisor || null,
        shift2Supervisor: cleanedBody.attendanceApproval?.shift2Supervisor || existingEmployee.attendanceApproval?.shift2Supervisor || null,
      },

      // Salary Details (Merge)
      salaryDetails: {
        ...(existingEmployee.salaryDetails || {}),
        ...cleanedBody.salaryDetails,
        bankAccount: {
          ...(existingEmployee.salaryDetails?.bankAccount || {}),
          ...(cleanedBody.salaryDetails?.bankAccount || {}),
          branchAddress: cleanedBody.salaryDetails?.bankAccount?.branchAddress || existingEmployee.salaryDetails?.bankAccount?.branchAddress || ''
        }
      },

      // Documents - merge if provided, otherwise keep existing
      documents: cleanedBody.documents || existingEmployee.documents || [],

      // Status
      status: cleanedBody.status || existingEmployee.status || 'Active',

      // Payslip Structure
      payslipStructure: cleanedBody.payslipStructure ? {
        ...cleanedBody.payslipStructure,
        // ensure we don't lose existing nested fields if we only sent partial updates? 
        // Use whole object replacement for structure usually safe as form sends whole object.
        // But let's be safe if we can. 
        // Actually form sends complete structure, so replacing is safer than deep merging arrays manually.
      } : existingEmployee.payslipStructure
    };

    console.log("📝 Final update data:", JSON.stringify(updateData, null, 2));

    const employeeToUpdate = await Employee.findById(id);
    if (!employeeToUpdate) {
      return NextResponse.json({ error: 'Employee not found after update' }, { status: 404 });
    }

    // Use .set() and .save() to ensure pre-save hooks (like salary calculation) are triggered
    employeeToUpdate.set(updateData);
    await employeeToUpdate.save();

    const employee = await Employee.findById(id)
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
      .populate('jobDetails.defaultShift', 'name startTime endTime color');

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found after update populate' }, { status: 404 });
    }

    console.log("✅ Employee updated successfully:", employee.employeeId);
    console.log("📊 Updated details:", {
      id: employee._id,
      employeeId: employee.employeeId,
      name: `${employee.personalDetails.firstName} ${employee.personalDetails.lastName}`,
      category: employee.category,
      experienceType: employee.experienceType,
      workingHr: employee.workingHr,
      documents: employee.documents?.length || 0
    });

    // Log activity
    let performer = null;
    if (body.updatedBy) {
      performer = await User.findById(body.updatedBy);
    }

    await logActivity({
      action: "updated",
      entity: "Employee",
      entityId: employee.employeeId,
      description: `Updated employee: ${employee.personalDetails.firstName} ${employee.personalDetails.lastName} (${employee.employeeId})`,
      performedBy: {
        userId: body.updatedBy,
        name: performer?.name || "Admin/User",
        email: performer?.email,
        role: performer?.role
      },
      details: {
        updates: Object.keys(updateData) // Basic tracking of what changed fields
      },
      req: request
    });

    return NextResponse.json(employee);
  } catch (error) {
    console.error('❌ Error in PUT /api/payroll/employees/[id]:', error);
    return NextResponse.json({
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

// PATCH - Partial update (used for status toggle)
export async function PATCH(request, { params }) {
  try {
    await dbConnect();
    const { id } = await params;
    const body = await request.json();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid employee ID format' }, { status: 400 });
    }

    if (!body.status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 });
    }

    console.log(`🔄 Patching employee status to ${body.status}:`, id);

    const employee = await Employee.findByIdAndUpdate(
      id,
      {
        status: body.status,
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    console.log("✅ Employee status updated:", employee.status);

    await logActivity({
      action: "updated",
      entity: "Employee",
      entityId: employee.employeeId,
      description: `Updated employee status to ${body.status}: ${employee.personalDetails.firstName} ${employee.personalDetails.lastName}`,
      performedBy: {
        userId: body.updatedBy
      },
      details: {
        status: body.status
      },
      req: request
    });

    return NextResponse.json(employee);

  } catch (error) {
    console.error('❌ Error in PATCH /api/payroll/employees/[id]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE employee (soft delete or permanent delete)
export async function DELETE(request, { params }) {
  try {
    await dbConnect();
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const isPermanent = searchParams.get('permanent') === 'true';

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid employee ID format' }, { status: 400 });
    }

    // Permanent Delete
    if (isPermanent) {
      const employee = await Employee.findByIdAndDelete(id);

      if (!employee) {
        return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
      }

      console.log("✅ Employee permanently deleted:", employee.employeeId);

      await logActivity({
        action: "deleted",
        entity: "Employee",
        entityId: employee.employeeId,
        description: `Permanently deleted employee: ${employee.personalDetails.firstName} ${employee.personalDetails.lastName} (${employee.employeeId})`,
        req: request
      });

      return NextResponse.json({
        message: 'Employee permanently deleted successfully',
        id: employee._id
      });
    }

    // Soft Delete (Default)
    const employee = await Employee.findByIdAndUpdate(
      id,
      {
        status: 'Inactive',
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    console.log("✅ Employee soft deleted (status changed to Inactive):", employee.employeeId);

    // Log activity
    await logActivity({
      action: "deleted",
      entity: "Employee",
      entityId: employee.employeeId,
      description: `Soft deleted employee (Inactive): ${employee.personalDetails.firstName} ${employee.personalDetails.lastName} (${employee.employeeId})`,
      req: request
    });

    return NextResponse.json({
      message: 'Employee status changed to Inactive successfully',
      employeeId: employee.employeeId,
      name: `${employee.personalDetails.firstName} ${employee.personalDetails.lastName}`,
      status: employee.status
    });
  } catch (error) {
    console.error('❌ Error in DELETE /api/payroll/employees/[id]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// OPTIONS handler for CORS
export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  });
}
// force rebuild