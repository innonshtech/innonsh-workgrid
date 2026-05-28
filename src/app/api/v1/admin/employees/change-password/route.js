
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import Employee from "@/lib/db/models/payroll/Employee";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_key_change_me";

export async function PUT(request) {
  try {
    await dbConnect();

    // 1. Get Token
    const token = request.cookies.get("authToken")?.value || request.cookies.get("employee_token")?.value;
    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized. Please login again." },
        { status: 401 }
      );
    }

    // 2. Verify Token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return NextResponse.json(
        { error: "Invalid session. Please login again." },
        { status: 401 }
      );
    }

    const employeeId = decoded.id;
    const { currentPassword, newPassword, confirmPassword } = await request.json();

    // 3. Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { error: "Please provide all required fields." },
        { status: 400 }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: "New password and confirm password do not match." },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "New password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    // 4. Find Employee & Verify Current Password
    const employee = await Employee.findById(employeeId).select("+password");

    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found." },
        { status: 404 }
      );
    }

    const isMatch = await employee.comparePassword(currentPassword);
    if (!isMatch) {
      return NextResponse.json(
        { error: "Incorrect current password." },
        { status: 400 }
      );
    }

    // 5. Update Password
    employee.password = newPassword;
    await employee.save(); // Pre-save hook will hash the password

    return NextResponse.json({
      success: true,
      message: "Password updated successfully.",
    });

  } catch (error) {
    console.error("Password update error:", error);
    return NextResponse.json(
      { error: "An error occurred while updating the password." },
      { status: 500 }
    );
  }
}
