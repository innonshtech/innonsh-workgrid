import mongoose from "mongoose";

const fnfSettlementSchema = new mongoose.Schema(
    {
        employee: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Employee",
            required: true,
        },
        exitRequest: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "ExitRequest",
            required: true,
            unique: true, // One FNF per exit request
        },
        settlementDate: {
            type: Date,
            default: Date.now,
        },
        resignationDate: Date,
        lastWorkingDate: Date,

        // Days Calculation
        salaryMonth: { // The month for which salary is being processed in FNF
            month: Number,
            year: Number
        },
        totalDaysInMonth: Number,
        daysWorked: Number, // Days present/payable in the exit month
        lopDays: Number,
        payableDays: Number,

        // Financials
        salaryDetailsSnapshot: { // Snapshot of salary structure at time of exit
            basicSalary: Number,
            grossSalary: Number,
            salaryType: String, // monthly or perday
        },

        // Calculated Earnings
        earnings: {
            basic: Number,
            hra: Number,
            specialAllowance: Number,
            otherEarnings: Number, // Sum of others
            totalEarnings: Number
        },

        // Calculated Deductions
        deductions: {
            pf: Number,
            pt: Number,
            esic: Number,
            tds: Number,
            otherDeductions: Number,
            totalDeductions: Number
        },

        // Leave Encashment
        leaveEncashment: {
            eligibleDays: Number, // Leaves available for encashment
            encashmentRate: Number, // Per day rate
            amount: Number, // eligibleDays * rate
            formula: String // e.g., "(Basic / 26) * Days" or "(Gross / 30) * Days"
        },

        // Gratuity
        gratuity: {
            isApplicable: Boolean,
            tenureYears: Number,
            amount: Number
        },

        // Notice Period
        noticePeriod: {
            requiredDays: Number,
            servedDays: Number,
            shortfallDays: Number,
            recoveryRate: Number,
            recoveryAmount: Number // Shortfall * Rate (Deduction)
        },

        // Ad-hoc
        additions: [{
            description: String,
            amount: Number
        }],
        adhocDeductions: [{
            description: String, // e.g., Asset Damage, Advance Recovery
            amount: Number
        }],

        // Totals
        grossPayable: Number, // Earnings + Leave Encashment + Gratuity + Additions
        totalRecoveries: Number, // Deductions + Notice Recovery + Adhoc Deductions
        netPayable: Number, // Gross - Recoveries

        status: {
            type: String,
            enum: ["Draft", "Pending_Approval", "Approved", "Paid"],
            default: "Draft"
        },

        processedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        approvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },

        notes: String,
        bankDetailsSnapshot: {
            bankName: String,
            accountNumber: String,
            ifscCode: String
        }
    },
    {
        timestamps: true,
    }
);

// Delete existing model if it exists to prevent overwrite errors in dev
if (mongoose.models.FnFSettlement) {
    delete mongoose.models.FnFSettlement;
}

export default mongoose.models.FnFSettlement || mongoose.model("FnFSettlement", fnfSettlementSchema);
