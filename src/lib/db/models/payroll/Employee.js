import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import StatutoryConfig from "./StatutoryConfig.js";
import WorkingShift from "./WorkingShift.js";
import { StatutoryCalculator } from "../../../utils/statutoryCalculations.js";

const DEFAULT_USER_ID = "674e92d8ce08af0109923297"; // Default admin ID for system actions.

// Salary Structure Schemas (from Template)
const earningComponentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  enabled: {
    type: Boolean,
    default: true,
  },
  editable: {
    type: Boolean,
    default: true,
  },
  calculationType: {
    type: String,
    enum: ['percentage', 'fixed'],
    default: 'percentage',
  },
  percentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  fixedAmount: {
    type: Number,
    default: 0,
    min: 0,
  },
}, { _id: false });

const deductionComponentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  enabled: {
    type: Boolean,
    default: true,
  },
  editable: {
    type: Boolean,
    default: true,
  },
  calculationType: {
    type: String,
    enum: ['percentage', 'fixed'],
    default: 'percentage',
  },
  percentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  fixedAmount: {
    type: Number,
    default: 0,
    min: 0,
  },
}, { _id: false });

const payslipFieldSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  enabled: {
    type: Boolean,
    default: true,
  },
}, { _id: false });

// Employee's Personal Payslip Structure
const employeePayslipStructureSchema = new mongoose.Schema({
  salaryType: {
    type: String,
    enum: ['monthly', 'perday'],
    default: 'monthly',
  },
  basicSalary: {
    type: Number,
    required: true,
    min: 0,
  },
  earnings: [earningComponentSchema],
  deductions: [deductionComponentSchema],
  additionalFields: [payslipFieldSchema],
  // Computed fields
  totalEarnings: {
    type: Number,
    default: 0,
  },
  totalDeductions: {
    type: Number,
    default: 0,
  },
  netSalary: {
    type: Number,
    default: 0,
  },
  perDaySalary: {
    type: Number,
    default: 0,
  },
  grossSalary: {
    type: Number,
    default: 0,
  },
}, { _id: false });

const bankAccountSchema = new mongoose.Schema({
  accountNumber: {
    type: String,
    required: true,
  },
  bankName: {
    type: String,
    required: true,
  },
  ifscCode: {
    type: String,
    required: true,
  },
  branch: String,
  branchAddress: String, // NEW FIELD
});

const documentSchema = new mongoose.Schema({
  id: String,
  name: String,
  type: String,
  size: Number,
  category: String,
  categoryName: String,
  uploadDate: Date,
  url: String,
  cloudinaryId: String,
  cloudinaryUrl: String,
  thumbnail: String,
});

const attendanceApprovalSchema = new mongoose.Schema({
  required: {
    type: String,
    enum: ["yes", "no"],
    default: "no",
  },
  shift1Supervisor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    default: null,
    required: false,
  },
  shift2Supervisor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    default: null,
    required: false,
  },
});

const employeeSchema = new mongoose.Schema(
  {
    employeeId: {
      type: String,
      required: true,
      unique: true,
    },
    // NEW FIELD: Password for login
    password: {
      type: String,
      select: false, // Do not return by default
    },
    // NEW FIELD: Role (Resticted Access)
    role: {
      type: String,
      enum: ["employee", "attendance_only", "admin", "recruiter"],
      default: "employee"
    },
    // NEW FIELD: Compliance Status
    isCompliant: {
      type: Boolean,
      default: false
    },
    // NEW FIELD: TDS Applicable
    isTDSApplicable: {
      type: Boolean,
      default: false
    },
    // NEW FIELD: Tax Regime Selection (Keka Standard)
    taxRegime: {
      type: String,
      enum: ['old', 'new'],
      default: 'new'
    },
    personalDetails: {
      firstName: {
        type: String,
        required: true,
      },
      lastName: {
        type: String,
        required: true,
      },
      email: {
        type: String,
        required: true,
        unique: true,
      },
      phone: {
        type: String,
        required: true,
      },
      // NEW FIELD: Blood Group
      bloodGroup: String,
      // NEW FIELDS: Addresses
      address: { // Keeping for backward compatibility
        street: String,
        city: String,
        state: String,
        zipCode: String,
      },
      temporaryAddress: {
        street: String,
        city: String,
        state: String,
        zipCode: String,
      },
      permanentAddress: {
        street: String,
        city: String,
        state: String,
        zipCode: String,
      },
      dateOfJoining: {
        type: Date,
        required: true,
      },
      dateOfBirth: Date,
      gender: {
        type: String,
        enum: ["Male", "Female", "Other"],
      },
      emergencyContact: {
        name: String,
        relationship: String,
        phone: String,
        address: String, // NEW FIELD
      },
    },
    jobDetails: {
      department: {
        type: String,
        required: true,
      },
      departmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Department",
        required: false,
        default: null,
      },
      employeeType: String,
      employeeTypeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "EmployeeType",
        required: false,
        default: null,
      },
      category: String,
      categoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "EmployeeCategory",
        required: false,
        default: null,
      },
      organization: String,
      organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Organization",
        required: false,
        default: null,
      },
      businessUnitId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "BusinessUnit",
        required: false,
        default: null,
      },
      teamId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Team",
        required: false,
        default: null,
      },
      costCenterId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "CostCenter",
        required: false,
        default: null,
      },
      designation: { // Employee Designation
        type: String,
        required: true,
      },
      reportingManager: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Employee",
        default: null,
        required: false,
      },
      // NEW FIELDS: Team Lead and Supervisor
      teamLead: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Employee",
        default: null,
      },
      workLocation: String,
      assignedOfficeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "OfficeLocation",
        default: null
      },
      biometricDeviceId: {
        type: String,
        trim: true,
        default: null
      },
      defaultShift: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "WorkingShift",
        default: null,
      },
      attendanceSettings: {
        allowedModes: {
          type: [String],
          enum: ["Web", "Mobile", "Biometric"],
          default: ["Web", "Mobile"]
        },
        requireGeofencing: {
          type: Boolean,
          default: true
        },
        requireIPWhitelisting: {
          type: Boolean,
          default: false
        }
      },
      workState: { // For PT and Statutory Compliance
        type: String,
        default: 'Maharashtra' // Fallback
      },
      holidayListId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'HolidayList',
        default: null
      },
    },
    salaryDetails: {
      bankAccount: {
        accountNumber: { type: String, required: true },
        bankName: { type: String, required: true },
        ifscCode: { type: String, required: true },
        branch: String,
        branchAddress: String, // New Field
      },
      panNumber: String,
      aadharNumber: String,
    },

    // Employee's Personal Payslip Structure
    payslipStructure: {
      type: employeePayslipStructureSchema,
      required: true,
    },

    // NEW FIELD: Variable Pay Structure (Target Amounts)
    variablePayStructure: [{
      componentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'VariablePayConfig',
        required: true
      },
      targetAmount: {
        type: Number,
        required: true,
        min: 0
      },
      frequency: {
        type: String,
        enum: ['Monthly', 'Quarterly', 'Half-Yearly', 'Annually'],
        default: 'Monthly'
      }
    }],

    workingHr: {
      type: Number,
      // required: true,
    },
    otApplicable: {
      type: String,
      enum: ["yes", "no"],
      default: "no",
    },
    esicApplicable: {
      type: String,
      enum: ["yes", "no"],
      default: "no",
    },
    pfApplicable: {
      type: String,
      enum: ["yes", "no"],
      default: "no",
    },
    pfType: {
      type: String,
      enum: ["restricted", "unrestricted"],
      default: "restricted",
    },
    probation: {
      type: String,
      enum: ["yes", "no"],
      default: "no",
    },
    probationDuration: {
      type: Number,
      default: 0, // in months
    },
    isAttending: {
      type: String,
      enum: ["yes", "no"],
      default: "no",
    },
    gratuityApplicable: {
      type: String,
      enum: ["yes", "no"],
      default: "no",
    },
    attendanceApproval: {
      type: attendanceApprovalSchema,
      default: () => ({
        required: "no",
        shift1Supervisor: null,
        shift2Supervisor: null,
      }),
    },
    documents: {
      type: [documentSchema],
      default: [],
    },
    compOffBalance: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ["Active", "Inactive", "Suspended", "Terminated"],
      default: "Active",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    sessionToken: {
      type: String,
    },
    forgotPasswordToken: {
      type: String,
      default: null,
    },
    forgotPasswordExpires: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
employeeSchema.index({ 'jobDetails.department': 1 });
employeeSchema.index({ 'jobDetails.organizationId': 1 });
employeeSchema.index({ 'jobDetails.departmentId': 1 });
employeeSchema.index({ status: 1 });

// Virtual for full name
employeeSchema.virtual('fullName').get(function () {
  return `${this.personalDetails.firstName} ${this.personalDetails.lastName}`;
});

// Method to calculate salary components (Async to pull from other modules)
employeeSchema.methods.calculateSalaryComponents = async function (statutoryConfig = null, params = {}) {
  const now = new Date();
  const month = Number(params.month || now.getMonth() + 1);
  const year = Number(params.year || now.getFullYear());
  const workingDaysInMonth = Number(params.workingDaysInMonth || new Date(year, month, 0).getDate());

  const structure = this.payslipStructure;
  if (!structure) {
    throw new Error("Salary structure (payslipStructure) is missing for this employee.");
  }

  // 1. INTEGRATE LEAVES & ATTENDANCE (LOP)
  let lopDays = params.lopDays || 0;
  try {
    const Leave = mongoose.models.Leave || mongoose.model("Leave");
    const Attendance = mongoose.models.Attendance || mongoose.model("Attendance");
    
    // a. Get Leaves (Include Draft and Approved)
    const leaveRecord = await Leave.findOne({ 
      employeeId: this._id, 
      month: Number(month), 
      year: Number(year),
      status: { $in: ["Approved", "Draft"] } 
    }).sort({ createdAt: -1 });

    let paidLeaves = 0;
    if (leaveRecord && leaveRecord.summary) {
      // 1. Add explicitly marked Unpaid leaves
      const explicitlyUnpaid = (leaveRecord.summary.unpaidLeaves || 0) + (leaveRecord.summary.halfDayUnpaidLeaves || 0) * 0.5;
      lopDays += explicitlyUnpaid;
      
      // 2. Get total Paid leaves taken (Casual, Sick, etc. are mapped to 'Paid' in summary)
      let totalPaidLeavesTaken = (leaveRecord.summary.paidLeaves || 0) + (leaveRecord.summary.halfDayPaidLeaves || 0) * 0.5;

      // 3. ENFORCE MONTHLY QUOTA: If paid leaves exceed 4 days, convert excess to LOP (Automatic)
      const monthlyQuota = 4; 
      if (totalPaidLeavesTaken > monthlyQuota) {
        const excessLeaves = totalPaidLeavesTaken - monthlyQuota;
        lopDays += excessLeaves;
        totalPaidLeavesTaken = monthlyQuota; 
      }

      paidLeaves = totalPaidLeavesTaken;
    }

    // b. Get Absent Days from Attendance (that are not covered by leaves)
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);
    
    // Explicitly cast to ObjectId for robustness
    const empId = new mongoose.Types.ObjectId(this._id);
    const absentRecords = await Attendance.find({
      employee: empId,
      date: { $gte: startDate, $lte: endDate },
      status: "Absent"
    });

    // c. HOLIDAY-AWARE LOP (Keka Standard): Exclude absent days that fall on holidays
    let effectiveAbsentDays = absentRecords.length;
    try {
      const Holiday = mongoose.models.Holiday || mongoose.model("Holiday");
      const HolidayList = mongoose.models.HolidayList || mongoose.model("HolidayList");
      const empOrgId = this.jobDetails?.organizationId;
      const empOfficeId = this.jobDetails?.assignedOfficeId;
      let empHolidayListId = this.jobDetails?.holidayListId;

      // AUTO-RESOLVE: Find holiday list from employee's branch/office location
      if (!empHolidayListId && empOfficeId) {
        const listForOffice = await HolidayList.findOne({
          applicableLocations: empOfficeId,
          year: Number(year),
          status: 'Active'
        }).lean();
        if (listForOffice) empHolidayListId = listForOffice._id;
      }

      // FALLBACK: Use the default holiday list for the org
      if (!empHolidayListId && empOrgId) {
        const defaultList = await HolidayList.findOne({
          organizationId: empOrgId,
          year: Number(year),
          isDefault: true,
          status: 'Active'
        }).lean();
        if (defaultList) empHolidayListId = defaultList._id;
      }

      let holidayQuery = {
        status: "Active",
        date: { $gte: startDate, $lte: endDate },
        isRestricted: { $ne: true } // Only mandatory holidays auto-exclude LOP
      };

      if (empHolidayListId) {
        holidayQuery.holidayListId = empHolidayListId;
      } else if (empOrgId) {
        holidayQuery.organizationId = empOrgId;
      }

      const holidays = await Holiday.find(holidayQuery).lean();
      const holidayDates = new Set();
      holidays.forEach(h => {
        // Expand multi-day holidays into individual dates
        const start = new Date(h.date);
        const end = h.endDate ? new Date(h.endDate) : start;
        const days = h.numberOfDays || 1;
        for (let i = 0; i < days; i++) {
          const d = new Date(start);
          d.setDate(d.getDate() + i);
          if (d <= end) holidayDates.add(d.toDateString());
        }
      });

      // CLAIMED RESTRICTED HOLIDAYS EXCLUSION
      try {
        const RestrictedHolidayClaim = mongoose.models.RestrictedHolidayClaim || mongoose.model("RestrictedHolidayClaim");
        const claims = await RestrictedHolidayClaim.find({
            employeeId: this._id,
            status: "Approved",
            date: { $gte: startDate, $lte: endDate }
        }).lean();
        
        claims.forEach(claim => {
            if (claim.date) holidayDates.add(new Date(claim.date).toDateString());
        });
      } catch (claimErr) {
        console.error(`Error fetching restricted claims for LOP exclusion (${this.employeeId}):`, claimErr);
      }

      // Filter out absent records that fall on a holiday
      const nonHolidayAbsents = absentRecords.filter(
        rec => !holidayDates.has(new Date(rec.date).toDateString())
      );
      effectiveAbsentDays = nonHolidayAbsents.length;
      
      this._tempHolidayDates = holidayDates; 
    } catch (holidayErr) {
      console.error(`Error fetching holidays for LOP exclusion (${this.employeeId}):`, holidayErr);
      this._tempHolidayDates = new Set();
    }

    lopDays += effectiveAbsentDays;

    // d. Get Present Days from Attendance
    const presentRecords = await Attendance.find({
      employee: empId,
      date: { $gte: startDate, $lte: endDate },
      status: { $in: ["Present", "Half-Day"] }
    });
    
    let actualPresentDays = 0;
    let halfDaysCount = 0;
    presentRecords.forEach(rec => {
        const status = (rec.status || "").toLowerCase();
        if (status === "present") {
            actualPresentDays += 1;
        } else if (status.includes("half")) {
            actualPresentDays += 0.5;
            halfDaysCount += 1;
        }
    });
    this._tempActualPresentDays = actualPresentDays;
    this._tempHalfDays = halfDaysCount;

    // e. Calculate Weekly Offs and Holiday Overlap
    let weeklyOffsCount = 0;
    const weeklyOffDates = new Set();
    const shift = await WorkingShift.findById(this.jobDetails?.defaultShift);
    
    const dayMap = { "Sunday": 0, "Monday": 1, "Tuesday": 2, "Wednesday": 3, "Thursday": 4, "Friday": 5, "Saturday": 6 };
    const workingDaysList = shift?.workingDays || ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    const workingDayNumbers = workingDaysList.map(d => dayMap[d]);
    
    let current = new Date(startDate.getTime());
    while (current <= endDate) {
        const day = current.getDay();
        if (!workingDayNumbers.includes(day)) {
            weeklyOffsCount++;
            weeklyOffDates.add(current.toDateString());
        }
        current.setDate(current.getDate() + 1);
    }

    // Resolve Effective Holidays
    let effectiveHolidaysCount = 0;
    if (this._tempHolidayDates) {
        this._tempHolidayDates.forEach(dateStr => {
            if (!weeklyOffDates.has(dateStr)) {
                effectiveHolidaysCount++;
            }
        });
    }
    
    this._tempWeeklyOffs = weeklyOffsCount;
    this._tempHolidays = effectiveHolidaysCount;
    this._tempPaidLeaves = paidLeaves;

  } catch (err) {
    console.error(`Error fetching leaves/attendance for ${this.employeeId}:`, err);
  }

  // 2. INTEGRATE OVERTIME
  let overtimeHours = 0;
  let payrollConfig = params.payrollConfig || null;
  
  try {
    // Auto-fetch PayrollConfig if not provided (for individual/preview calculations)
    if (!payrollConfig && this.jobDetails?.organizationId) {
       const PayrollConfig = mongoose.models.PayrollConfig || mongoose.model("PayrollConfig");
       payrollConfig = await PayrollConfig.findOne({ company: this.jobDetails.organizationId });
    }

    const OvertimeRequest = mongoose.models.OvertimeRequest || mongoose.model("OvertimeRequest");
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);
    
    const otRequests = await OvertimeRequest.find({
      employee: this._id,
      status: "Approved",
      date: { $gte: startDate, $lte: endDate }
    });
    
    overtimeHours = otRequests.reduce((sum, req) => sum + (req.hours || 0), 0);
  } catch (err) {
    console.error("Error fetching overtime for salary calc:", err);
  }

  // 3. INTEGRATE LOANS/ADVANCES
  let loanDeductionsAmount = 0;
  const loanDeductionsList = [];
  try {
    const Loan = mongoose.models.Loan || mongoose.model("Loan");
    const activeLoans = await Loan.find({
      employee: this._id,
      status: "Approved"
    });

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    for (const loan of activeLoans) {
      const pendingInstallment = loan.repaymentSchedule.find(inst => 
        inst.status === "Pending" && 
        new Date(inst.dueDate) >= startDate && 
        new Date(inst.dueDate) <= endDate
      );

      if (pendingInstallment) {
        loanDeductionsAmount += pendingInstallment.amount;
        loanDeductionsList.push({
          name: `Loan Repayment (${loan.type})`,
          amount: pendingInstallment.amount,
          loanId: loan._id,
          installmentId: pendingInstallment._id
        });
      }
    }
  } catch (err) {
    console.error("Error fetching loans for salary calc:", err);
  }

  // 4. INTEGRATE RETRO ADJUSTMENTS
  let retroEarnings = 0;
  let retroDeductions = 0;
  const retroList = [];
  try {
    const RetroAdjustment = mongoose.models.RetroAdjustment || mongoose.model("RetroAdjustment");
    const pendingRetros = await RetroAdjustment.find({
      employeeId: this._id,
      status: "Pending"
    });

    for (const retro of pendingRetros) {
      if (retro.type === 'Earning') {
        retroEarnings += retro.amount;
      } else {
        retroDeductions += retro.amount;
      }
      retroList.push({
        name: `${retro.componentName} (${retro.adjustmentType})`,
        amount: retro.amount,
        type: retro.type,
        retroId: retro._id
      });
    }
  } catch (err) {
    console.error("Error fetching retros for salary calc:", err);
  }

  // 5. INTEGRATE VARIABLE PAY
  let variablePayAmount = 0;
  const variablePayList = [];
  try {
    const PayrollVariableInput = mongoose.models.PayrollVariableInput || mongoose.model("PayrollVariableInput");
    const VariablePayConfig = mongoose.models.VariablePayConfig || mongoose.model("VariablePayConfig");
    
    const varInputs = await PayrollVariableInput.find({
      employeeId: this._id,
      month,
      year,
      status: "Approved"
    }).populate('componentId');

    for (const input of varInputs) {
      variablePayAmount += input.payoutAmount;
      variablePayList.push({
        name: input.componentId?.name || "Variable Pay",
        amount: input.payoutAmount,
        configId: input.componentId?._id
      });
    }
  } catch (err) {
    console.error("Error fetching variable pay for salary calc:", err);
  }

  const standardBasic = structure.basicSalary || 0;
  let basicSalary = standardBasic; // MNC Standard: Display full basic in Earnings
  let lopAmount = 0;
  let proratedDays = workingDaysInMonth; 

  const joiningDate = this.personalDetails?.dateOfJoining ? new Date(this.personalDetails.dateOfJoining) : null;
  const periodStart = new Date(year, month - 1, 1);
  const periodEnd = new Date(year, month, 0);

  // Still keep mid-month joining proration (as it affects Earnings directly)
  if (joiningDate && joiningDate >= periodStart && joiningDate <= periodEnd) {
    const joiningDay = joiningDate.getDate();
    proratedDays = workingDaysInMonth - joiningDay + 1;
    const prorationFactor = proratedDays / workingDaysInMonth;
    basicSalary = Math.round(standardBasic * prorationFactor);
  }

  // Calculate LOP Amount (But don't subtract from basicSalary here - show as deduction instead)
  if (lopDays > 0 && workingDaysInMonth > 0 && standardBasic > 0) {
    lopAmount = Math.round((standardBasic / workingDaysInMonth) * lopDays);
  }

  const earnings = structure.earnings || [];
  const calculatedEarnings = earnings
    .filter(e => e.enabled)
    .map(earning => {
      let amount = 0;
      if (earning.calculationType === 'percentage') {
        amount = (basicSalary * (earning.percentage || 0)) / 100;
      } else {
        amount = earning.fixedAmount || 0;
      }
      return {
        ...earning.toObject(),
        calculatedAmount: Math.round(amount)
      };
    });

  let overtimeRate = this.salaryDetails?.overtimeRate || 0;
  if (!overtimeRate && payrollConfig) {
     if (payrollConfig.overtimeCalculationType === 'Fixed') {
        overtimeRate = payrollConfig.overtimeRate || 0;
     } else {
        // Multiplier Mode: (Basic / WorkingDays / ShiftHours) * Multiplier
        // We use standardBasic (full salary) for calculation, as per most factory laws
        const workingDays = payrollConfig.workingDaysPerMonth || 26;
        const shiftHours = this.workingHr || 9;
        const hourlyRate = (standardBasic / workingDays / shiftHours);
        overtimeRate = hourlyRate * (payrollConfig.overtimeRate || 1.5);
     }
  }

  const overtimeAmount = Math.round(overtimeHours * overtimeRate);
  if (overtimeAmount > 0) {
     calculatedEarnings.push({
       name: "Overtime Pay",
       calculatedAmount: overtimeAmount,
       autoCalculated: true,
       hours: overtimeHours
     });
  }

  for (const v of variablePayList) {
    calculatedEarnings.push({
      name: v.name,
      calculatedAmount: Math.round(v.amount),
      autoCalculated: true,
      configId: v.configId
    });
  }

  for (const r of retroList) {
    if (r.type === 'Earning') {
      calculatedEarnings.push({
        name: `${r.name}`,
        calculatedAmount: Math.round(r.amount),
        autoCalculated: true,
        retroId: r.retroId
      });
    }
  }

  // Calculate Gross Salary (Sum of all earnings including basic)
  const grossSalary = basicSalary + calculatedEarnings.reduce((sum, e) => sum + e.calculatedAmount, 0);

  const deductions = structure.deductions || [];
  let calculatedDeductions = deductions
    .filter(d => d.enabled)
    .map(deduction => {
      let amount = 0;
      if (deduction.calculationType === 'percentage') {
        amount = (basicSalary * (deduction.percentage || 0)) / 100;
      } else {
        amount = deduction.fixedAmount || 0;
      }
      return {
        ...deduction.toObject(),
        calculatedAmount: Math.round(amount)
      };
    });

  // LOP AS DEDUCTION (Clean Professional Look)
  if (lopAmount > 0) {
    calculatedDeductions.push({
      name: 'Loss of Pay (LOP)',
      calculatedAmount: Math.round(lopAmount),
      autoCalculated: true,
      days: lopDays
    });
  }

  for (const loan of loanDeductionsList) {
    calculatedDeductions.push({
      name: loan.name,
      calculatedAmount: Math.round(loan.amount),
      autoCalculated: true,
      loanId: loan.loanId
    });
  }

  for (const r of retroList) {
    if (r.type === 'Deduction') {
      calculatedDeductions.push({
        name: `${r.name}`,
        calculatedAmount: Math.round(r.amount),
        autoCalculated: true,
        retroId: r.retroId
      });
    }
  }

  // ========== AUTO-CALCULATED STATUTORY DEDUCTIONS (India Compliance) ==========
  // Strategy: When auto-calculation fires, REPLACE any manually configured entries
  // to avoid duplicates. If auto-calculation doesn't fire, keep manual entries.

  // Helper to remove existing entries by partial name match
  const removeByName = (keywords) => {
    calculatedDeductions = calculatedDeductions.filter(
      d => !keywords.some(kw => d.name?.toLowerCase().includes(kw.toLowerCase()))
    );
  };

  // INFOSYS/ACCENTURE STYLE PF (Restricted + Prorated Ceiling)
  if (this.pfApplicable === 'yes') {
    // Remove any manually configured PF entries first
    removeByName(['Provident Fund', 'PF']);
    
    // Prorate the 15,000 ceiling by attendance (MNC Standard)
    const totalWorkingDays = workingDaysInMonth - (this._tempWeeklyOffs || 0) - (this._tempHolidays || 0);
    const presentPlusPaidLeaves = Math.max(0, totalWorkingDays - lopDays);
    
    // Pro-rate the wage ceiling based on present days (Keka/Compliance Standard)
    const pfWageLimit = 15000 * (presentPlusPaidLeaves / totalWorkingDays);
    
    const pfWage = Math.min(basicSalary, pfWageLimit);
    const pfEmployee = Math.round(pfWage * 0.12);
    const pfEmployer = Math.round(pfWage * 0.13);

    calculatedDeductions.push({
      name: 'Provident Fund (PF)',
      calculatedAmount: pfEmployee,
      autoCalculated: true,
      employerContribution: pfEmployer
    });
  }

  // 2. ESIC (Only if Contracted Gross Salary <= 21,000)
  const contractedGross = this.payslipStructure.grossSalary || 0;
  if (this.esicApplicable === 'yes' && contractedGross <= 21000) {
    // Remove any manually configured ESIC entries first
    removeByName(['ESIC', 'Employee State Insurance']);

    const esicEmployee = Math.ceil(grossSalary * 0.0075);
    const esicEmployer = Math.ceil(grossSalary * 0.0325);

    calculatedDeductions.push({
      name: 'ESIC',
      calculatedAmount: esicEmployee,
      autoCalculated: true,
      employerContribution: esicEmployer
    });
  }

  // 3. Professional Tax (PT)
  const workState = this.jobDetails?.workState || 'Maharashtra';
  const ptAmount = StatutoryCalculator.calculateProfessionalTax(grossSalary, workState, { ...statutoryConfig, month });

  if (ptAmount > 0) {
    // Remove any manually configured PT entries first
    removeByName(['Professional Tax', 'PT']);

    calculatedDeductions.push({
      name: 'Professional Tax (PT)',
      calculatedAmount: ptAmount,
      autoCalculated: true
    });
  }

  // 4. TDS (Income Tax) — Dual Regime (Keka Standard)
  if (this.isTDSApplicable) {
    const regime = this.taxRegime || 'new';
    const annualGross = (grossSalary - lopAmount) * 12; // TDS is on actual taxable income
    let annualTax = 0;

    if (regime === 'new') {
      // New Regime FY 2025-26 (Budget 2025)
      // 0-4L: NIL, 4-8L: 5%, 8-12L: 10%, 12-16L: 15%, 16-20L: 20%, 20-24L: 25%, >24L: 30%
      // Standard deduction: ₹75,000
      const taxableIncome = Math.max(0, annualGross - 75000);
      if (taxableIncome <= 400000) annualTax = 0;
      else if (taxableIncome <= 800000) annualTax = (taxableIncome - 400000) * 0.05;
      else if (taxableIncome <= 1200000) annualTax = 20000 + (taxableIncome - 800000) * 0.10;
      else if (taxableIncome <= 1600000) annualTax = 60000 + (taxableIncome - 1200000) * 0.15;
      else if (taxableIncome <= 2000000) annualTax = 120000 + (taxableIncome - 1600000) * 0.20;
      else if (taxableIncome <= 2400000) annualTax = 200000 + (taxableIncome - 2000000) * 0.25;
      else annualTax = 300000 + (taxableIncome - 2400000) * 0.30;

      // Section 87A rebate: Full tax rebate if taxable income <= ₹12L (new budget)
      if (taxableIncome <= 1200000) annualTax = 0;

    } else {
      // Old Regime
      // 0-2.5L: NIL, 2.5-5L: 5%, 5-10L: 20%, >10L: 30%
      // Standard deduction: ₹50,000
      // Note: 80C/80D deductions would further reduce taxable income, but we apply a basic calc here
      const standardDeduction = 50000;
      const section80C = 150000; // Max limit — actual declared amount should come from InvestmentDeclaration
      const taxableIncome = Math.max(0, annualGross - standardDeduction - section80C);

      if (taxableIncome <= 250000) annualTax = 0;
      else if (taxableIncome <= 500000) annualTax = (taxableIncome - 250000) * 0.05;
      else if (taxableIncome <= 1000000) annualTax = 12500 + (taxableIncome - 500000) * 0.20;
      else annualTax = 112500 + (taxableIncome - 1000000) * 0.30;

      // Section 87A rebate: Full tax rebate if taxable income <= ₹5L
      if (taxableIncome <= 500000) annualTax = 0;
    }

    // Add 4% Health & Education Cess
    annualTax = Math.round(annualTax * 1.04);

    const monthlyTDS = Math.round(annualTax / 12);

    if (monthlyTDS > 0) {
      calculatedDeductions.push({
        name: `Income Tax (TDS - ${regime === 'new' ? 'New' : 'Old'} Regime)`,
        calculatedAmount: monthlyTDS,
        autoCalculated: true,
        regime: regime
      });
    }
  }

  const totalEarnings = grossSalary;
  const totalDeductions = calculatedDeductions.reduce((sum, d) => sum + d.calculatedAmount, 0);
  const netSalary = Math.round(totalEarnings - totalDeductions);

  return {
    basicSalary,
    standardBasic,
    earnings: calculatedEarnings,
    deductions: calculatedDeductions,
    totalEarnings,
    totalDeductions,
    netSalary,
    salaryType: structure.salaryType,
    lopAmount: Math.round(lopAmount),
    lopDays,
    overtimeHours,
    overtimeAmount,
    loanDeductions: loanDeductionsAmount,
    loanDeductionsList,
    retroEarnings,
    retroDeductions,
    retroList,
    variablePayAmount,
    variablePayList,
    totalDays: workingDaysInMonth,
    weeklyOffs: this._tempWeeklyOffs || 0,
    halfDays: this._tempHalfDays || 0,
    holidays: this._tempHolidays || 0,
    paidLeaves: this._tempPaidLeaves || 0,
    workingDays: workingDaysInMonth - (this._tempWeeklyOffs || 0) - (this._tempHolidays || 0),
    presentDays: Math.max(0, (workingDaysInMonth - (this._tempWeeklyOffs || 0) - (this._tempHolidays || 0)) - lopDays - (this._tempPaidLeaves || 0)),
    paidDays: Math.max(0, (workingDaysInMonth - (this._tempWeeklyOffs || 0) - (this._tempHolidays || 0)) - lopDays)
  };
};

employeeSchema.methods.updateComputedSalary = async function (statutoryConfig = null) {
  const calculated = await this.calculateSalaryComponents(statutoryConfig);
  this.payslipStructure.totalEarnings = calculated.totalEarnings;
  this.payslipStructure.totalDeductions = calculated.totalDeductions;
  this.payslipStructure.netSalary = calculated.netSalary;
};

employeeSchema.pre('save', async function (next) {
  if (!this.workingHr) this.workingHr = 9;
  if (this.isModified('payslipStructure') || this.isModified('jobDetails.workState') || this.isModified('isTDSApplicable')) {
    try {
      let statutoryConfig = null;
      if (this.jobDetails && this.jobDetails.workState) {
        const StatutoryConfig = mongoose.models.StatutoryConfig || mongoose.model('StatutoryConfig');
        statutoryConfig = await StatutoryConfig.findOne({
          state: { $regex: new RegExp(`^${this.jobDetails.workState}$`, 'i') }
        });
      }
      await this.updateComputedSalary(statutoryConfig);
    } catch (error) {
      await this.updateComputedSalary(null);
    }
  }
  if (this.isModified("password") && this.password) {
    const isAlreadyHashed = this.password.startsWith('$2a$') || this.password.startsWith('$2b$') || this.password.startsWith('$2y$');
    if (!isAlreadyHashed) {
      this.password = await bcrypt.hash(this.password, 10);
    }
  }
  next();
});

employeeSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

employeeSchema.methods.getJwtToken = function (role) {
  return jwt.sign({ id: this._id, role: role || this.role }, process.env.JWT_SECRET || "fallback_secret_key_change_me", {
    expiresIn: process.env.JWT_EXPIRE || "30d",
  });
};

if (mongoose.models.Employee) {
  delete mongoose.models.Employee;
}

export default mongoose.model("Employee", employeeSchema);