// src/lib/db/models/payroll/Leave.js
import mongoose from "mongoose";

// Individual leave entry schema
const leaveEntrySchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
  },
  leaveType: {
    type: String,
    enum: ["Paid", "Unpaid", "Half-Day Paid", "Half-Day Unpaid"],
    required: true,
  },
  reason: {
    type: String,
    default: "",
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  approvedAt: {
    type: Date,
    default: Date.now,
  },
});

// Monthly leave summary schema
const leaveSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    employeeCode: {
      type: String,
      required: true,
    },
    employeeName: {
      type: String,
      required: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: false,
      default: null,
    },
    organizationType: {
      type: String,
      required: true,
    },
    department: {
      type: String,
      required: true,
    },
    
    // Month and Year tracking
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
    
    // Leave entries for the month
    leaves: [leaveEntrySchema],
    
    // Monthly summary (auto-calculated)
    summary: {
      totalDays: {
        type: Number,
        default: 0,
      },
      paidLeaves: {
        type: Number,
        default: 0,
      },
      unpaidLeaves: {
        type: Number,
        default: 0,
      },
      halfDayPaidLeaves: {
        type: Number,
        default: 0,
      },
      halfDayUnpaidLeaves: {
        type: Number,
        default: 0,
      },
    },
    
    // Monthly leave balance - MONTHLY QUOTA SYSTEM
    annualLeaveBalance: {
      totalEntitled: {
        type: Number,
        default: 0, // No longer hardcoded to 31
      },
      used: {
        type: Number,
        default: 0, // Total paid leaves used in this month
      },
      remaining: {
        type: Number,
        default: 0, // Remaining monthly quota at END of this month
      },
      balanceAtMonthStart: {
        type: Number,
        default: 0, // Remaining monthly quota at START of this month
      },
      thisMonthUnpaid: {
        type: Number,
        default: 0, // Unpaid leaves taken in this specific month only
      },
    },
    
    status: {
      type: String,
      enum: ["Draft", "Approved", "Rejected"],
      default: "Draft",
    },
    
    notes: {
      type: String,
      default: "",
    },
    
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for unique month-year per employee
leaveSchema.index({ employeeId: 1, month: 1, year: 1 }, { unique: true });
leaveSchema.index({ organizationId: 1 });
leaveSchema.index({ organizationType: 1 });
leaveSchema.index({ month: 1, year: 1 });
leaveSchema.index({ employeeCode: 1 });
leaveSchema.index({ status: 1 });

// Method to calculate monthly summary
leaveSchema.methods.calculateSummary = function () {
  let totalDays = 0;
  let paidLeaves = 0;
  let unpaidLeaves = 0;
  let halfDayPaidLeaves = 0;
  let halfDayUnpaidLeaves = 0;

  this.leaves.forEach((leave) => {
    const type = (leave.leaveType || "").toLowerCase();
    
    if (type.includes("unpaid")) {
      if (type.includes("half")) {
        halfDayUnpaidLeaves += 1;
        totalDays += 0.5;
      } else {
        unpaidLeaves += 1;
        totalDays += 1;
      }
    } else {
      // Treat everything else (Paid, Sick, Casual, etc.) as Paid
      if (type.includes("half")) {
        halfDayPaidLeaves += 1;
        totalDays += 0.5;
      } else {
        paidLeaves += 1;
        totalDays += 1;
      }
    }
  });

  this.summary = {
    totalDays,
    paidLeaves,
    unpaidLeaves,
    halfDayPaidLeaves,
    halfDayUnpaidLeaves,
  };

  // Calculate this month's unpaid leaves
  const thisMonthUnpaid = unpaidLeaves + (halfDayUnpaidLeaves * 0.5);
  this.annualLeaveBalance.thisMonthUnpaid = thisMonthUnpaid;

  return this.summary;
};

// Method to update monthly leave balance
leaveSchema.methods.updateAnnualBalance = async function () {
  try {
    const Employee = mongoose.model("Employee");
    const PayrollConfig = mongoose.model("PayrollConfig");
    
    const employee = await Employee.findById(this.employeeId);
    
    // Resolve quota: 
    // 1. Employee Specific Override
    // 2. Organization Policy (PayrollConfig)
    // 3. Legacy/Branch fallback
    let totalEntitled = employee?.totalLeaveEntitled;
    
    if (!totalEntitled) {
      const config = await PayrollConfig.findOne({ company: this.organizationId });
      totalEntitled = config?.annualPaidLeaveQuota || 
                      employee?.annualLeaveBalance || 
                      employee?.payslipStructure?.totalLeaveEntitled || 
                      0;
    }
    
    // Get all leave records for this employee in this year
    const LeaveModel = mongoose.model("Leave");
    const allYearLeaves = await LeaveModel.find({
      employeeId: this.employeeId,
      year: this.year,
    });
    
    console.log(`📊 Updating monthly balances for ${this.employeeCode} in ${this.year} (Monthly Quota: ${totalEntitled})`);
    
    for (const monthRecord of allYearLeaves) {
      // In monthly mode, each month starts with the full quota
      const balanceAtMonthStart = totalEntitled;
      
      // Calculate total paid leaves used this month (half days count as 0.5)
      const thisMonthPaidUsed = (monthRecord.summary.paidLeaves || 0) + 
                               ((monthRecord.summary.halfDayPaidLeaves || 0) * 0.5);
      
      // Balance at END of this month
      const balanceAtMonthEnd = balanceAtMonthStart - thisMonthPaidUsed;
      
      // Update the record's balance info
      monthRecord.annualLeaveBalance = {
        totalEntitled: totalEntitled, // Monthly quota
        used: thisMonthPaidUsed, // Used this month
        remaining: balanceAtMonthEnd, // Balance at end of month
        balanceAtMonthStart: balanceAtMonthStart,
        thisMonthUnpaid: (monthRecord.summary.unpaidLeaves || 0) + 
                        ((monthRecord.summary.halfDayUnpaidLeaves || 0) * 0.5)
      };
      
      await monthRecord.save();
      console.log(`   Month ${monthRecord.month}: Start=${balanceAtMonthStart}, Used=${thisMonthPaidUsed}, End=${balanceAtMonthEnd}`);
    }
    
    console.log(`   ✅ Updated ${allYearLeaves.length} month records`);
    
    return this.annualLeaveBalance;
  } catch (error) {
    console.error("❌ Error updating monthly balance:", error);
    throw error;
  }
};

// Pre-save middleware to calculate summary
leaveSchema.pre("save", function (next) {
  this.calculateSummary();
  next();
});

// Delete existing model to avoid conflicts
delete mongoose.models.Leave;

export default mongoose.models.Leave || mongoose.model("Leave", leaveSchema);