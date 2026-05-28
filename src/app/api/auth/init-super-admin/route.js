// src/app/api/auth/init-super-admin/route.js
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import User from '@/lib/db/models/User';

/**
 * EMERGENCY INITIALIZATION: Creates the very first Super Admin.
 * INSTRUCTIONS: Delete this file or remove this route after use in production!
 */
export async function GET() {
  try {
    await dbConnect();

    const existingSuperAdmin = await User.findOne({ role: 'super_admin' });
    if (existingSuperAdmin) {
      return NextResponse.json({ message: 'Super Admin already exists' }, { status: 400 });
    }

    // Default credentials for the first super admin
    const superAdmin = await User.create({
      name: 'Platform Owner',
      email: 'owner@bizmate.com',
      password: 'SuperSecurePassword123!', // Hashed by pre-save hook
      role: 'super_admin',
      isActive: true,
      status: 'active'
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Super Admin created successfully!',
      credentials: {
        email: 'owner@bizmate.com',
        password: 'SuperSecurePassword123!'
      }
    });
  } catch (error) {
    return NextResponse.json({ message: 'Error: ' + error.message }, { status: 500 });
  }
}

// Also support POST for Postman convenience
export async function POST() {
  return GET();
}
