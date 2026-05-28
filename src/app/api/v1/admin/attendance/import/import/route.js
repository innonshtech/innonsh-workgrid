import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import Employee from "@/lib/db/models/payroll/Employee";
import Attendance from "@/lib/db/models/payroll/Attendance";
import AttendanceThreshold from "@/lib/db/models/payroll/AttendanceThreshold";
import Notification from "@/lib/db/models/notifications/NotificationConfig";
import nodemailer from "nodemailer";
import { sendAttendanceThresholdNotification } from "@/utils/notifications";

// Email configuration
const transporter = nodemailer.createTransport({
  service: "gmail", // or your email service
  auth: {
    user: process.env.EMAIL_USER, // Your email
    pass: process.env.EMAIL_PASSWORD, // Your email password or app password
  },
});

// Function to send mismatch report email
async function sendMismatchEmail(errors, failedCount, successCount, totalRecords) {
  if (errors.length === 0) return; // No errors to report

  const emailHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
        }
        .container {
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background-color: #f59e0b;
          color: white;
          padding: 20px;
          border-radius: 8px 8px 0 0;
        }
        .content {
          background-color: #f9fafb;
          padding: 20px;
          border: 1px solid #e5e7eb;
        }
        .summary {
          background-color: white;
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 20px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .summary-item {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #e5e7eb;
        }
        .summary-item:last-child {
          border-bottom: none;
        }
        .error-list {
          background-color: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 8px;
          padding: 15px;
          margin-top: 20px;
        }
        .error-item {
          padding: 8px;
          margin: 5px 0;
          background-color: white;
          border-left: 4px solid #ef4444;
          border-radius: 4px;
        }
        .success-badge {
          color: #10b981;
          font-weight: bold;
        }
        .failed-badge {
          color: #ef4444;
          font-weight: bold;
        }
        .footer {
          text-align: center;
          padding: 20px;
          color: #6b7280;
          font-size: 12px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2 style="margin: 0;">⚠️ Attendance Import Mismatch Report</h2>
          <p style="margin: 5px 0 0 0;">Date: ${new Date().toLocaleString()}</p>
        </div>
        
        <div class="content">
          <div class="summary">
            <h3 style="margin-top: 0;">Import Summary</h3>
            <div class="summary-item">
              <span>Total Records Processed:</span>
              <strong>${totalRecords}</strong>
            </div>
            <div class="summary-item">
              <span>Successfully Imported:</span>
              <strong class="success-badge">${successCount}</strong>
            </div>
            <div class="summary-item">
              <span>Failed Records:</span>
              <strong class="failed-badge">${failedCount}</strong>
            </div>
            <div class="summary-item">
              <span>Success Rate:</span>
              <strong>${((successCount / totalRecords) * 100).toFixed(1)}%</strong>
            </div>
          </div>

          <div class="error-list">
            <h3 style="margin-top: 0; color: #ef4444;">❌ Error Details (${errors.length} issues)</h3>
            ${errors.map((error, index) => `
              <div class="error-item">
                <strong>#${index + 1}:</strong> ${error}
              </div>
            `).join('')}
          </div>

          <div style="margin-top: 20px; padding: 15px; background-color: #dbeafe; border-radius: 8px; border-left: 4px solid #3b82f6;">
            <strong>📋 Common Issues:</strong>
            <ul style="margin: 10px 0;">
              <li>Employee not found: Verify employee codes exist in the system</li>
              <li>Duplicate entry: Attendance already recorded for this date</li>
              <li>Invalid status: Only Present, Absent, Leave, or Weekend allowed</li>
            </ul>
          </div>
        </div>

        <div class="footer">
          <p>This is an automated email from the Payroll Attendance System.</p>
          <p>Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: "gaikwadsameer422@gmail.com",
    subject: `🚨 Attendance Import Alert: ${failedCount} Failed Records`,
    html: emailHTML,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("✅ Mismatch email sent successfully");
  } catch (error) {
    console.error("❌ Failed to send email:", error);
    // Don't fail the entire import if email fails
  }
}

// Function to check and notify attendance thresholds
async function checkAttendanceThresholds(date) {
  try {
    console.log("🔍 Checking attendance thresholds for date:", date);

    // Get all active thresholds
    const thresholds = await AttendanceThreshold.find({ isActive: true })
      .populate('criteria.organizationId', 'name')
      .populate('criteria.categoryId', 'employeeCategory');
    console.log(`ℹ️ Found ${thresholds.length} active attendance thresholds`);
    if (thresholds.length === 0) {
      console.log("ℹ️ No active attendance thresholds found");
      return;
    }

    // Get attendance records for the date
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const attendanceRecords = await Attendance.find({
      date: { $gte: startOfDay, $lte: endOfDay },
      status: { $in: ['Present', 'On Leave'] } // Count present and on leave as active
    }).populate({
      path: 'employee',
      select: 'jobDetails',
      populate: [
        { path: 'jobDetails.categoryId', select: 'employeeCategory' },
        // { path: 'subCategoryId', select: 'employeeSubCategory' }, // Removed: Not in schema
        { path: 'jobDetails.organizationId', select: 'name' }
      ]
    });

    console.log(`📅 Found ${attendanceRecords.length} attendance records for date ${date}`);

    // Group attendance by organization, employee type, and subtype
    const attendanceCount = {};
    console.log("Attendance Records:", attendanceRecords);
    attendanceRecords.forEach(record => {
      const employee = record.employee;
      if (!employee) return;

      const orgId = employee.jobDetails?.organizationId?._id?.toString();
      // Updated to access categoryId from jobDetails
      const employeeType = employee.jobDetails?.categoryId?.employeeCategory || employee.jobDetails?.employeeType || 'Unknown';

      // subCategoryId is not in schema currently, so defaulting to null/unknown behavior
      const subType = null;

      const key = `${orgId}-${employeeType}-${subType || 'null'}`;

      if (!attendanceCount[key]) {
        attendanceCount[key] = {
          organizationId: orgId,
          organizationName: employee.jobDetails?.organizationId?.name || 'Unknown',
          employeeType,
          subType,
          count: 0
        };
      }
      attendanceCount[key].count++;
    });

    console.log("📊 Attendance count by category:", attendanceCount);

    // Check each threshold
    // Check each threshold
    for (const threshold of thresholds) {
      if (!threshold.criteria || threshold.criteria.length === 0) continue;

      let currentTotalCount = 0;
      let breakdown = [];
      let involvedOrgs = new Set();
      let involvedCategories = new Set();

      for (const criterion of threshold.criteria) {
        if (!criterion.organizationId) continue;

        const orgId = criterion.organizationId._id.toString();
        const categoryName = criterion.categoryId?.employeeCategory || 'Unknown';
        const subType = criterion.subType;

        involvedOrgs.add(criterion.organizationId.name);
        involvedCategories.add(categoryName);

        // Sum counts for this specific criterion
        if (subType) {
          const key = `${orgId}-${categoryName}-${subType}`;
          currentTotalCount += attendanceCount[key]?.count || 0;
        } else {
          // Match all subtypes for this org+category
          const prefix = `${orgId}-${categoryName}-`;
          Object.keys(attendanceCount).forEach(k => {
            if (k.startsWith(prefix)) {
              currentTotalCount += attendanceCount[k].count;
            }
          });
        }

        breakdown.push(`${criterion.organizationId.name} - ${categoryName}${subType ? ` (${subType})` : ''}`);
      }

      console.log(`🔍 Checking threshold: Total ${currentTotalCount} vs Limit ${threshold.threshold}`);

      if (currentTotalCount > threshold.threshold) {
        const groupName = [...involvedCategories].join(', ');
        const orgName = [...involvedOrgs].join(', ');

        console.log(`🚨 Threshold exceeded! Count: ${currentTotalCount}, Limit: ${threshold.threshold}`);

        // Create notification in database
        const notification = new Notification({
          type: 'threshold-exceeded',
          title: `Attendance Threshold Exceeded: ${groupName}`,
          message: `Combined count for ${breakdown.join(', ')} exceeded limit of ${threshold.threshold} (current: ${currentTotalCount})`,
          priority: 'high',
          read: false,

          // Assign to the first organization in the criteria as "primary"
          organization: threshold.criteria[0].organizationId._id,

          details: {
            categoryName: groupName,
            organization: orgName,
            currentCount: currentTotalCount,
            threshold: threshold.threshold,
            exceededBy: currentTotalCount - threshold.threshold,
            date
          }
        });

        await notification.save();
        console.log('✅ Threshold exceeded notification saved to database');

        // Send email notification
        try {
          await sendAttendanceThresholdNotification({
            employeeType: groupName,
            organization: orgName,
            currentCount: currentTotalCount,
            threshold: threshold.threshold,
            date
          });

          notification.emailSent = true;
          notification.emailRecipient = process.env.ATTENDANCE_THRESHOLD_EMAIL || process.env.SMTP_USER;
          await notification.save();
        } catch (emailError) {
          console.error('❌ Failed to send email notification:', emailError);
        }
      }
    }

  } catch (error) {
    console.error("❌ Error checking attendance thresholds:", error);
    // Don't throw error to avoid breaking attendance import
  }
}

export async function POST(request) {
  try {
    await dbConnect();
    const { attendanceRecords } = await request.json();
    console.log("Received Records:", attendanceRecords);

    if (!Array.isArray(attendanceRecords) || attendanceRecords.length === 0) {
      return NextResponse.json(
        { error: "No attendance records received" },
        { status: 400 }
      );
    }

    let success = 0;
    let failed = 0;
    let errors = [];

    for (const record of attendanceRecords) {
      try {
        const {
          employeeCode,
          employeeName,
          date,
          status,
          checkIn,
          checkOut,
          workedHours,
          dayType,
        } = record;

        // 1. FIND EMPLOYEE USING employeeId
        const employee = await Employee.findOne({
          employeeId: employeeCode,
        });

        if (!employee) {
          failed++;
          errors.push(`Employee not found: ${employeeCode} (${employeeName || 'Unknown'})`);
          continue;
        }

        // 2. VALIDATE STATUS
        const allowedStatus = ["Present", "Absent", "Leave", "Weekend"];
        if (!allowedStatus.includes(status)) {
          failed++;
          errors.push(`Invalid status "${status}" for ${employeeCode} on ${date}`);
          continue;
        }

        // 3. CHECK DUPLICATE
        const existing = await Attendance.findOne({
          employee: employee._id,
          date: new Date(date),
        });

        if (existing) {
          failed++;
          errors.push(
            `Duplicate entry: ${employeeCode} (${employeeName || 'Unknown'}) already has attendance on ${new Date(date).toLocaleDateString()}`
          );
          continue;
        }

        // 4. CALCULATE TOTAL HOURS and OVERTIME if checkIn and checkOut exist
        let totalHours = 0;
        let overtimeHours = 0;
        let finalDayType = dayType; // Use the dayType from frontend

        if (checkIn && checkOut) {
          const checkInTime = new Date(checkIn);
          const checkOutTime = new Date(checkOut);
          const diffMs = checkOutTime - checkInTime;
          totalHours = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));

          // Calculate overtime if applicable
          if (employee.otApplicable === 'yes' && employee.workingHr) {
            const standardWorkingHours = employee.workingHr;
            if (totalHours > standardWorkingHours) {
              overtimeHours = parseFloat((totalHours - standardWorkingHours).toFixed(2));
            }
          }
        }

        // 5. USE dayType as determined by frontend

        // 6. CREATE ATTENDANCE RECORD
        const data = {
          employee: employee._id,
          date,
          status,
          checkIn: checkIn || null,
          checkOut: checkOut || null,
          totalHours,
          overtimeHours,
          dayType: dayType, // Use dayType as sent from frontend
          workedHours: workedHours || 0,
        };

        await Attendance.create(data);
        success++;

      } catch (err) {
        failed++;
        errors.push(`Error processing record: ${err.message}`);
      }
    }

    // Send email if there are any errors
    if (failed > 0) {
      await sendMismatchEmail(errors, failed, success, attendanceRecords.length);
    }

    // Check attendance thresholds for imported dates
    if (success > 0) {
      const uniqueDates = [...new Set(attendanceRecords.map(record => record.date))];
      for (const dateStr of uniqueDates) {
        try {
          await checkAttendanceThresholds(new Date(dateStr));
        } catch (error) {
          console.error(`Error checking thresholds for date ${dateStr}:`, error);
        }
      }
    }

    return NextResponse.json({
      success,
      failed,
      errors,
      message: `Import completed: ${success} successful, ${failed} failed${failed > 0 ? ' (Email sent with details)' : ''}`,
      emailSent: failed > 0,
    });

  } catch (error) {
    console.error("Import error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}