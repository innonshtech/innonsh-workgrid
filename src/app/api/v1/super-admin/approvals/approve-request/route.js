// src/app/api/super-admin/approve-request/route.js
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import User from '@/lib/db/models/User';
import Organization from '@/lib/db/models/crm/organization/Organization';
import jwt from 'jsonwebtoken';
import { logActivity } from '@/lib/logger';

const JWT_SECRET = process.env.JWT_SECRET;

export async function POST(req) {
  try {
    const token = req.cookies.get('authToken')?.value;
    if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== 'super_admin') {
      return NextResponse.json({ message: 'Forbidden: Super Admin access required' }, { status: 403 });
    }

    const { userId, action } = await req.json(); // action: 'approve' or 'reject'
    if (!userId || !action) {
      return NextResponse.json({ message: 'User ID and action are required' }, { status: 400 });
    }

    await dbConnect();

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    if (action === 'reject') {
      user.status = 'rejected';
      user.isActive = false;
      await user.save();
      return NextResponse.json({ success: true, message: 'Request rejected' });
    }

    if (action === 'approve') {
      // 1. Generate orgId
      const lastOrg = await Organization.findOne().sort({ createdAt: -1 });
      let newOrgId = "ORG001";
      if (lastOrg && lastOrg.orgId) {
        const lastNum = parseInt(lastOrg.orgId.replace(/\D/g, "")) || 0;
        newOrgId = `ORG${String(lastNum + 1).padStart(3, "0")}`;
      }

      // 2. Create Organization
      const organization = await Organization.create({
        orgId: newOrgId,
        name: user.companyName,
        email: user.email,
        phone: user.phone || "",
        status: "Active",
        industry: user.industry || "",
        companySize: user.companySize || "",
        adminUserId: user._id
      });

      // 3. Activate User
      user.organizationId = organization._id;
      user.isActive = true;
      user.status = 'active';
      await user.save();

      await logActivity({
        action: "approved_registration",
        entity: "User",
        entityId: user._id,
        description: `Super Admin approved registration for ${user.name} (${user.companyName})`,
        performedBy: {
          userId: decoded.id,
          name: "Super Admin",
          role: 'super_admin'
        },
        req
      });

      return NextResponse.json({ 
        success: true, 
        message: 'Request approved and Organization created!',
        organization: {
          id: organization._id,
          orgId: organization.orgId,
          name: organization.name
        }
      });
    }

    return NextResponse.json({ message: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Approve request error:', error);
    return NextResponse.json({ message: 'Server error: ' + error.message }, { status: 500 });
  }
}
