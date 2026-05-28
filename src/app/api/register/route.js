

import dbConnect from "../../../lib/db/connect"; // Adjust path to your MongoDB connection utility
import User from "../../../lib/db/models/User"; // Adjust path to your User model
import bcrypt from "bcrypt";
import { NextResponse } from "next/server";
import { logActivity } from "@/lib/logger";
 
export async function POST(req) {
  try {
    // Connect to MongoDB
    await dbConnect();
 
    console.log("hello");
   
    // Parse the request body
    const { name, email, password, role, department, position, employeeId } = await req.json();
 
    console.log("hello");
 
    console.log(name, email, password, role);
   
   
    // Input validation
    if (!name || !email || !password) {
      return NextResponse.json(
        { message: "Name, email, and password are required" },
        { status: 400 }
      );
    }
 
    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { message: "Email already registered" },
        { status: 400 }
      );
    }
 
    // Check if employeeId is provided and unique (if applicable)
    if (employeeId) {
      const existingEmployeeId = await User.findOne({ employeeId });
      if (existingEmployeeId) {
        return NextResponse.json(
          { message: "Employee ID already in use" },
          { status: 400 }
        );
      }
    }
 
    // Hash the password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
 
    // Create new user
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      role: role || "employee", // Default to 'employee' if not provided
      department,
      position,
      employeeId,
      isActive: true,
    });
 
    // Save user to database
    await newUser.save();

    // Log activity
    await logActivity({
      action: "created",
      entity: "User",
      entityId: newUser._id,
      description: `Registered new user: ${newUser.name} (${newUser.email}) - ${newUser.role}`,
      performedBy: {
        userId: newUser._id, // Self-registration usually
        name: newUser.name,
        email: newUser.email,
        role: newUser.role
      },
      details: {
        email: newUser.email,
        role: newUser.role,
        department: newUser.department
      },
      req: req
    });
 
    // Respond with success (excluding password in response)
    return NextResponse.json(
      {
        message: "User registered successfully",
        user: {
          id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          department: newUser.department,
          position: newUser.position,
          employeeId: newUser.employeeId,
          isActive: newUser.isActive,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { message: "Server error during registration" },
      { status: 500 }
    );
  }
}
 