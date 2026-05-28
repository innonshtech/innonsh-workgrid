import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import Attendance from "@/lib/db/models/payroll/Attendance";
import Employee from "@/lib/db/models/payroll/Employee"; // Ensure Employee model is registered
import jwt from "jsonwebtoken";

export async function GET(request) {
  try {
    await dbConnect();

    const token = request.cookies.get("employee_token")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Verify token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "fallback_secret_key_change_me"
    );

    if (!decoded || !decoded.id) {
       return NextResponse.json(
        { error: "Invalid token" },
        { status: 401 }
      );
    }

    // Fetch attendance records
    const attendanceRecords = await Attendance.find({ employee: decoded.id })
      .sort({ date: -1 }) // Newest first
      .lean();

    return NextResponse.json({
      success: true,
      data: attendanceRecords,
    });

  } catch (error) {
    console.error("Attendance fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch attendance records" },
      { status: 500 }
    );
  }
}
