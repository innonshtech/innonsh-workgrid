import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import Attendance from "@/lib/db/models/payroll/Attendance";
import AttendanceThreshold from "@/lib/db/models/payroll/AttendanceThreshold";
import Notification from "@/lib/db/models/notifications/NotificationConfig";
import Employee from "@/lib/db/models/payroll/Employee";
import OfficeLocation from "@/lib/db/models/crm/organization/OfficeLocation";
import Organization from "@/lib/db/models/crm/organization/Organization";
import { sendAttendanceThresholdNotification } from "@/utils/notifications";
import { getAuthUser, authorize } from "@/lib/auth-util";

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
      status: { $in: ['Present', 'Leave'] } // Count present and on leave as active
    }).populate({
      path: 'employee',
      select: 'jobDetails',
      populate: [
        { path: 'jobDetails.categoryId', select: 'employeeCategory' },
        // { path: 'subCategoryId', select: 'employeeSubCategory' }, // Removed: Not in schema
        { path: 'jobDetails.organizationId', select: 'name' }
      ]
    });

    // Group attendance by organization, employee type, and subtype
    const attendanceCount = {};

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
    // Don't throw error to avoid breaking attendance creation
  }
}

export async function GET(request) {
  try {
    const authUser = await getAuthUser();
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const organizationId = searchParams.get("organizationId");
    const employeeId = searchParams.get("employeeId");
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 100;
    const skip = (page - 1) * limit;

    let filter = {};

    // SaaS PROTECTION: Restrict data by organization
    if (authUser.role === "admin" || authUser.role === "supervisor") {
      // Find all employee IDs in this organization
      const orgEmployees = await Employee.find({ 
        "jobDetails.organizationId": authUser.organizationId 
      }).distinct("_id");
      
      filter.employee = { $in: orgEmployees };
    } else if (authUser.role === "employee" || authUser.role === "attendance_only") {
      // Employees can only see their own attendance
      filter.employee = authUser.id;
    } else if (authUser.role === "super_admin" && organizationId) {
       const orgEmployees = await Employee.find({ 
        "jobDetails.organizationId": organizationId 
      }).distinct("_id");
      filter.employee = { $in: orgEmployees };
    }

    // Date filtering - support both single date and date range
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      filter.date = {
        $gte: startOfDay,
        $lte: endOfDay,
      };
    } else if (startDate && endDate) {
      // Date range filtering for monthly view
      filter.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    } else if (startDate) {
      filter.date = { $gte: new Date(startDate) };
    } else if (endDate) {
      filter.date = { $lte: new Date(endDate) };
    }

    // Employee filtering
    if (employeeId) {
      if (filter.employee && filter.employee.$in) {
        const isAllowed = filter.employee.$in.some(id => id.toString() === employeeId);
        filter.employee = isAllowed ? employeeId : { $in: [] };
      } else if (filter.employee && filter.employee.toString() !== employeeId.toString()) {
        filter.employee = { $in: [] };
      } else {
        filter.employee = employeeId;
      }
    }

    // Status filtering
    if (status) {
      filter.status = status;
    }

    // Fetch attendance with proper population
    let attendance = await Attendance.find(filter)
      .populate({
        path: "employee",
        select: "employeeId personalDetails jobDetails",
        populate: {
          path: "jobDetails.organizationId",
          select: "name",
        },
      })
      .populate("proxyDetails.markedBy", "name")
      .populate("proxyDetails.approvedBy", "name")
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit);

    // Filter logic integrated into MongoDB query above for security and performance


    const total = await Attendance.countDocuments(filter);

    return NextResponse.json({
      success: true,
      attendance,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching attendance:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const authUser = await getAuthUser();
    await dbConnect();

    const body = await request.json();
    const {
      employee,
      date,
      checkIn,
      checkOut,
      status,
      isProxy,
      proxyDetails,
      overtimeHours,
      notes,
      location, // { coordinates: [lng, lat], accuracy }
      ipAddress,
      deviceId,
      attendanceMethod = 'Web' // Default
    } = body;

    // Validate required fields
    if (!employee || !date || !status) {
      return NextResponse.json(
        { success: false, error: "Employee, date, and status are required" },
        { status: 400 }
      );
    }

    // SaaS PROTECTION: Validate employee ownership
    const empRecordForAuth = await Employee.findById(employee);
    if (!empRecordForAuth) {
      return NextResponse.json({ success: false, error: "Employee not found" }, { status: 404 });
    }
    if (authUser.role === "admin" && empRecordForAuth.jobDetails?.organizationId?.toString() !== authUser.organizationId) {
      return NextResponse.json({ success: false, error: "Forbidden: Employee belongs to another organization" }, { status: 403 });
    } else if ((authUser.role === "employee" || authUser.role === "attendance_only") && authUser.id !== employee.toString()) {
      return NextResponse.json({ success: false, error: "Forbidden: You can only log your own attendance" }, { status: 403 });
    }

    // Check for existing attendance on the same date
    const attendanceDate = new Date(date);
    const startOfDay = new Date(attendanceDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(attendanceDate);
    endOfDay.setHours(23, 59, 59, 999);

    const existingAttendance = await Attendance.findOne({
      employee,
      date: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
    });

    if (existingAttendance) {
      return NextResponse.json(
        {
          success: false,
          error: "Attendance record already exists for this employee and date",
        },
        { status: 400 }
      );
    }

    // --- GEO-FENCING LOGIC START ---
    let isGeofenceVerified = false;
    let distanceFromOffice = null;
    let verificationFailureReason = null;
    let attendanceStatus = status;

    // Fetch employee details for geofencing check
    if (attendanceMethod === 'Mobile' || attendanceMethod === 'Web') {
      const employeeRecord = await Employee.findOne({ _id: employee, 'jobDetails.assignedOfficeId': { $ne: null } })
        .populate('jobDetails.assignedOfficeId');

      if (employeeRecord && employeeRecord.jobDetails?.assignedOfficeId && location?.coordinates) {
        const office = employeeRecord.jobDetails.assignedOfficeId;
        if (office.coordinates && office.isActive) {
          // Calculate Distance (Haversine Formula) - Simple implementation
          const R = 6371e3; // metres
          const lat1 = location.coordinates[1] * Math.PI / 180; // lat
          const lat2 = office.coordinates.latitude * Math.PI / 180;
          const deltaLat = (office.coordinates.latitude - location.coordinates[1]) * Math.PI / 180;
          const deltaLng = (office.coordinates.longitude - location.coordinates[0]) * Math.PI / 180;

          const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

          distanceFromOffice = R * c; // in meters

          const allowedRadius = office.radius || 100;

          if (distanceFromOffice <= allowedRadius) {
            isGeofenceVerified = true;
          } else {
            isGeofenceVerified = false;
            verificationFailureReason = `Outside allowed radius. Distance: ${Math.round(distanceFromOffice)}m, Allowed: ${allowedRadius}m`;

            // If strict geofencing is enabled, reject or mark as absent/mismatched?
            // For now, we just log it. The UI can show a warning.
            // Optional: attendanceStatus = 'Pending Approval'; 
          }
        }
      }
    }
    // --- GEO-FENCING LOGIC END ---

    // Calculate total hours if both checkIn and checkOut are provided
    let totalHours = 0;
    if (checkIn && checkOut) {
      const checkInTime = new Date(checkIn);
      const checkOutTime = new Date(checkOut);
      const diffMs = checkOutTime - checkInTime;
      totalHours = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));
    }

    // Create attendance record
    const attendance = await Attendance.create({
      employee,
      date: attendanceDate,
      checkIn: checkIn ? new Date(checkIn) : null,
      checkOut: checkOut ? new Date(checkOut) : null,
      totalHours,
      status: attendanceStatus,
      isProxy: isProxy || false,
      proxyDetails: isProxy ? proxyDetails : undefined,
      overtimeHours: overtimeHours || 0,
      notes,
      location: {
        type: 'Point',
        coordinates: location?.coordinates || [0, 0],
        accuracy: location?.accuracy
      },
      attendanceMethod,
      distanceFromOffice,
      isGeofenceVerified,
      verificationFailureReason,
      ipAddress,
      deviceId,
    });

    // Populate employee details before returning
    await attendance.populate({
      path: "employee",
      select: "employeeId personalDetails jobDetails",
      populate: {
        path: "jobDetails.organizationId",
        select: "name",
      },
    });

    // Check attendance thresholds asynchronously (don't wait for completion)
    checkAttendanceThresholds(attendanceDate).catch(error => {
      console.error("Error in threshold check:", error);
    });

    return NextResponse.json({
      success: true,
      attendance,
    });
  } catch (error) {
    console.error("Error creating attendance:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    const authUser = await getAuthUser();
    await dbConnect();

    const body = await request.json();
    const {
      employee,
      date,
      checkIn,
      checkOut,
      status,
      overtimeHours,
      notes,
      location,
    } = body;

    // SaaS PROTECTION: Validate employee ownership
    if (employee) {
      const empRecordForAuth = await Employee.findById(employee);
      if (empRecordForAuth) {
        if (authUser.role === "admin" && empRecordForAuth.jobDetails?.organizationId?.toString() !== authUser.organizationId) {
          return NextResponse.json({ success: false, error: "Forbidden: Employee belongs to another organization" }, { status: 403 });
        } else if ((authUser.role === "employee" || authUser.role === "attendance_only") && authUser.id !== employee.toString()) {
          return NextResponse.json({ success: false, error: "Forbidden: You can only update your own attendance" }, { status: 403 });
        }
      }
    }

    if (!employee || !date) {
      return NextResponse.json(
        { success: false, error: "Employee and date are required" },
        { status: 400 }
      );
    }

    // Find attendance record for the date
    const attendanceDate = new Date(date);
    const startOfDay = new Date(attendanceDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(attendanceDate);
    endOfDay.setHours(23, 59, 59, 999);

    let updatedAttendance;

    // Check if this is a check-out update
    if (checkOut) {
      const existingRecord = await Attendance.findOne({
        employee,
        date: {
          $gte: startOfDay,
          $lte: endOfDay,
        },
      });

      if (existingRecord && existingRecord.checkIn) {
        // Calculate total hours
        const checkInTime = new Date(existingRecord.checkIn);
        const checkOutTime = new Date(checkOut);
        const diffMs = checkOutTime - checkInTime;
        const totalHours = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));

        updatedAttendance = await Attendance.findOneAndUpdate(
          {
            employee,
            date: { $gte: startOfDay, $lte: endOfDay },
          },
          {
            $set: {
              checkOut: checkOutTime,
              totalHours: totalHours,
              status: status || "Present",
            },
          },
          { new: true }
        );
      }
    } else {
      // Regular update
      const updateData = {};
      if (checkIn) updateData.checkIn = new Date(checkIn);
      if (status) updateData.status = status;
      if (overtimeHours !== undefined) updateData.overtimeHours = overtimeHours;
      if (notes !== undefined) updateData.notes = notes;
      if (location) updateData.location = location;

      // Recalculate total hours if both times are present
      const existingRecord = await Attendance.findOne({
        employee,
        date: { $gte: startOfDay, $lte: endOfDay },
      });

      if (existingRecord) {
        const newCheckIn = checkIn ? new Date(checkIn) : existingRecord.checkIn;
        const newCheckOut = existingRecord.checkOut;

        if (newCheckIn && newCheckOut) {
          const diffMs = new Date(newCheckOut) - new Date(newCheckIn);
          updateData.totalHours = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));
        }
      }

      updatedAttendance = await Attendance.findOneAndUpdate(
        {
          employee,
          date: { $gte: startOfDay, $lte: endOfDay },
        },
        { $set: updateData },
        { new: true }
      );
    }

    if (!updatedAttendance) {
      return NextResponse.json(
        { success: false, error: "Attendance record not found" },
        { status: 404 }
      );
    }

    // Populate employee details
    await updatedAttendance.populate({
      path: "employee",
      select: "employeeId personalDetails jobDetails",
      populate: {
        path: "jobDetails.organizationId",
        select: "name",
      },
    });

    return NextResponse.json({
      success: true,
      attendance: updatedAttendance,
    });
  } catch (error) {
    console.error("Error updating attendance:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    const authUser = await getAuthUser();
    authorize(authUser, ["admin", "super_admin"]);
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Attendance ID is required" },
        { status: 400 }
      );
    }

    const deletedAttendance = await Attendance.findByIdAndDelete(id);

    if (!deletedAttendance) {
      return NextResponse.json(
        { success: false, error: "Attendance record not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Attendance record deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting attendance:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}