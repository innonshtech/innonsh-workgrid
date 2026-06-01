import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import Role from '@/lib/db/models/crm/Permission/Role';
import { getAuthUser } from '@/lib/auth-util';
import { ApiResponse } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

// GET all roles for the organization
export async function GET(req) {
  try {
    await dbConnect();
    const user = await getAuthUser();
    
    // Admins and Super Admins only
    if (!['super_admin', 'admin'].includes(user.role)) {
      return ApiResponse.forbidden();
    }

    const query = {};
    // If not super admin, restrict to their organization + system roles
    if (user.role !== 'super_admin') {
      if (!user.organizationId) {
        return ApiResponse.badRequest('Admin user must belong to an organization to view roles');
      }
      query.$or = [
        { organizationId: user.organizationId },
        { isSystemRole: true }
      ];
    }

    const roles = await Role.find(query).sort({ isSystemRole: -1, name: 1 }).lean();
    return ApiResponse.success({ roles });

  } catch (error) {
    console.error('Error fetching roles:', error);
    return ApiResponse.error(error.message);
  }
}

// CREATE a new role
export async function POST(req) {
  try {
    await dbConnect();
    const user = await getAuthUser();
    
    if (!['super_admin', 'admin'].includes(user.role)) {
      return ApiResponse.forbidden();
    }

    const body = await req.json();
    const { name, description, permissions } = body;

    if (!name) {
      return ApiResponse.badRequest('Role name is required');
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    const orgId = user.role === 'super_admin' ? (body.organizationId || null) : user.organizationId;

    // Check if role slug already exists for this org
    const existing = await Role.findOne({ slug, organizationId: orgId });
    if (existing) {
      return ApiResponse.badRequest('A role with this name already exists in your organization');
    }

    const newRole = await Role.create({
      name,
      slug,
      organizationId: orgId,
      description,
      permissions: permissions || [],
      isSystemRole: false,
      createdBy: user.id
    });

    return ApiResponse.success({ role: newRole }, 201, 'Role created successfully');

  } catch (error) {
    console.error('Error creating role:', error);
    return ApiResponse.error(error.message);
  }
}
