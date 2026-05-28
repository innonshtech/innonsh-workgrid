// src/app/api/v1/reset-password/route.js
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/db/connect';
import User from '@/lib/db/models/User';
import Employee from '@/lib/db/models/payroll/Employee';

export async function POST(request) {
  try {
    await dbConnect();
    const { token, newPassword, role = 'admin' } = await request.json();

    if (!token || !newPassword) {
      return NextResponse.json({ error: 'Token and new password are required' }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters long' }, { status: 400 });
    }

    // Hash the incoming raw token to compare with stored hashed token
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find user/employee with matching token that hasn't expired
    let targetEntity = null;
    let Model = (role === 'employee') ? Employee : User;

    targetEntity = await Model.findOne({
      forgotPasswordToken: hashedToken,
      forgotPasswordExpires: { $gt: new Date() },
    });

    if (!targetEntity) {
      return NextResponse.json({
        error: 'Password reset link is invalid or has expired. Please request a new one.',
      }, { status: 400 });
    }

    // Set the new password (plain text)
    // Both User and Employee models have pre-save hooks that will handle the hashing
    targetEntity.password = newPassword;
    targetEntity.forgotPasswordToken = null;
    targetEntity.forgotPasswordExpires = null;
    // invalidate any existing sessions
    targetEntity.sessionToken = null;
    await targetEntity.save({ validateBeforeSave: false });

    return NextResponse.json({ message: 'Password reset successfully. You can now log in.' });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json({ error: 'An error occurred. Please try again.' }, { status: 500 });
  }
}
