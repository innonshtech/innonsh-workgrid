import mongoose from "mongoose";

const earningSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  percentage: {
    type: Number,
    default: 0,
  },
  calculationType: {
    type: String,
    enum: ["percentage", "fixed", "computed", "performance_linked"],
    default: "percentage",
  },
});

const deductionSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  percentage: {
    type: Number,
    default: 0,
  },
  calculationType: {
    type: String,
    enum: ["percentage", "fixed", "computed"],
    default: "percentage",
  },
});

const payslipSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    payrollRunId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PayrollRun",
      default: null,
      index: true,
    },
    payslipId: {
      type: String,
      required: true,
      unique: true,
    },
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    year: {
      type: Number,
      required: true,
    },
    basicSalary: {
      type: Number,
      required: true,
      min: 0,
    },
    earnings: [earningSchema],
    deductions: [deductionSchema],
    grossSalary: {
      type: Number,
      required: true,
      min: 0,
    },
    totalDeductions: {
      type: Number,
      required: true,
      min: 0,
    },
    netSalary: {
      type: Number,
      required: true,
      min: 0,
    },
    workingDays: {
      type: Number,
      required: true,
      min: 1,
      max: 31,
    },
    presentDays: {
      type: Number,
      required: true,
      min: 0,
    },
    leaveDays: {
      type: Number,
      default: 0,
      min: 0,
    },
    paidLeaveDays: {
      type: Number,
      default: 0,
      min: 0,
    },
    unpaidLeaveDays: {
      type: Number,
      default: 0,
      min: 0,
    },
    overtimeHours: {
      type: Number,
      default: 0,
    },
    overtimeAmount: {
      type: Number,
      default: 0,
    },
    totalDays: {
      type: Number,
      default: 0,
    },
    weeklyOffs: {
      type: Number,
      default: 0,
    },
    halfDays: {
      type: Number,
      default: 0,
    },
    holidays: {
      type: Number,
      default: 0,
    },
    paidDays: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      default: "Draft",
    },
    paymentDate: Date,
    paymentMethod: {
      type: String,
    },
    notes: String,
    organizationName: {
      type: String,
      required: true,
    },
    salaryType: {
      type: String,
      enum: ["monthly", "perday"],
      required: true,
    },
    employeeType: {
      type: String,
      default: null,
    },
    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    pfDetails: {
      employeeContribution: {
        type: Number,
        default: 0,
      },
      employerContribution: {
        type: Number,
        default: 0,
      },
      pensionContribution: {
        type: Number,
        default: 0,
      },
      edliContribution: {
        type: Number,
        default: 0,
      },
      adminCharges: {
        type: Number,
        default: 0,
      },
      uanNumber: String,
    },
    esicDetails: {
      employeeContribution: {
        type: Number,
        default: 0,
      },
      employerContribution: {
        type: Number,
        default: 0,
      },
      ipNumber: String,
    },
    professionalTax: {
      type: Number,
      default: 0,
    },
    leaveDetails: {
      paidLeaves: {
        type: Number,
        default: 0,
      },
      unpaidLeaves: {
        type: Number,
        default: 0,
      },
      leaveDeduction: {
        type: Number,
        default: 0,
      },
    },
    lopDays: {
      type: Number,
      default: 0,
    },
    isPFApplicable: {
      type: Boolean,
      default: false,
    },
    isESICApplicable: {
      type: Boolean,
      default: false,
    },
    isPTApplicable: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for unique payslip per employee, month, year
payslipSchema.index({ employee: 1, month: 1, year: 1 }, { unique: true });
// payslipSchema.index({ status: 1 });

export default mongoose.models.Payslip || mongoose.model("Payslip", payslipSchema);