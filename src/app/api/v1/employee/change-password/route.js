import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getAuthUser, authorize } from "@/lib/auth-util";
import dbConnect from "@/lib/db/connect";
import Employee from "@/lib/db/models/payroll/Employee";

export async function POST(req) {
  try {
    // 1. Get user from JWT
    const user = await getAuthUser();

    // 2. Authorize employee role
    authorize(user, ['employee']);

    // Parse payload
    const body = await req.json();
    const { currentPassword, newPassword, confirmPassword } = body;

    // Validate request
    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json({ success: false, error: "All fields are required" }, { status: 400 });
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json({ success: false, error: "New passwords do not match" }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ success: false, error: "New password must be at least 8 characters long" }, { status: 400 });
    }

    // Connect to DB
    await dbConnect();

    // 3. Fetch employee from DB
    const dbUser = await Employee.findById(user.id).select('+password');
    if (!dbUser) {
      return NextResponse.json({ success: false, error: "Employee not found" }, { status: 404 });
    }

    // 4. Validate current password matches
    const isMatch = await bcrypt.compare(currentPassword, dbUser.password);
    if (!isMatch) {
      return NextResponse.json({ success: false, error: "Invalid current password" }, { status: 401 });
    }

    // 5. Update DB (pre-save hook in Employee model will handle hashing securely)
    dbUser.password = newPassword;
    await dbUser.save();

    // 7. Return success
    return NextResponse.json({
      success: true,
      message: "Password updated successfully"
    }, { status: 200 });

  } catch (error) {
    console.error("Change Password Error:", error);
    
    // Handle auth errors natively
    if (error.message.startsWith("Forbidden") || error.message.startsWith("Unauthorized")) {
      return NextResponse.json({ success: false, error: error.message }, { status: 403 });
    }
    
    return NextResponse.json({
      success: false,
      error: "An internal server error occurred"
    }, { status: 500 });
  }
}
