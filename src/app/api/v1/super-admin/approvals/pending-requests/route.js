// src/app/api/super-admin/pending-requests/route.js
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import User from '@/lib/db/models/User';
import { getAuthUser, authorize } from '@/lib/auth-util';

export async function GET(req) {
  try {
    const authUser = await getAuthUser();
    authorize(authUser, ['super_admin']);

    await dbConnect();

    const pendingUsers = await User.find({ status: 'pending' }).select('-password').sort({ createdAt: -1 });

    return NextResponse.json({ success: true, count: pendingUsers.length, requests: pendingUsers });
  } catch (error) {
    console.error('Pending requests fetch error:', error);
    if (error.message?.includes('Unauthorized') || error.message?.includes('Forbidden')) {
      return NextResponse.json({ message: error.message }, { status: 401 });
    }
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
