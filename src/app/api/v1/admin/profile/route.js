import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import User from "@/lib/db/models/User";
import { getAuthUser, authorize } from "@/lib/auth-util";

export async function GET(request) {
  try {
    const authUser = await getAuthUser();
    authorize(authUser, ["admin", "hr", "company_admin", "super_admin"]);
    
    await dbConnect();

    const user = await User.findById(authUser.id).select("-password");

    return NextResponse.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error("GET PROFILE ERROR:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const authUser = await getAuthUser();
    authorize(authUser, ["admin", "hr", "company_admin", "super_admin"]);
    
    await dbConnect();
    const body = await request.json();

    const updatedUser = await User.findByIdAndUpdate(
      authUser.id,
      { name: body.name },
      { new: true }
    ).select("-password");

    return NextResponse.json({
      success: true,
      data: updatedUser,
      message: "Profile updated successfully"
    });
  } catch (error) {
    console.error("PUT PROFILE ERROR:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
