import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import CustomTemplate from '@/lib/db/models/crm/CustomTemplate';
import { getAuthUser } from '@/lib/auth-util';
import { ApiResponse } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    await dbConnect();
    const authUser = await getAuthUser();
    
    if (!['admin', 'super_admin'].includes(authUser.role)) {
      return ApiResponse.forbidden('Insufficient permissions');
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    
    let query = { organizationId: authUser.organizationId };
    if (type) {
      query.type = type;
    }

    const templates = await CustomTemplate.find(query).sort({ createdAt: -1 }).lean();
    return ApiResponse.success({ templates });
  } catch (error) {
    console.error('Fetch Templates Error:', error);
    return ApiResponse.error('Failed to fetch templates');
  }
}

export async function POST(req) {
  try {
    await dbConnect();
    const authUser = await getAuthUser();
    
    if (!['admin', 'super_admin'].includes(authUser.role)) {
      return ApiResponse.forbidden('Insufficient permissions');
    }

    const body = await req.json();
    const { name, type, subject, content, isDefault } = body;

    if (!name || !type || !content) {
      return ApiResponse.badRequest('Name, type, and content are required');
    }

    // If this is set as default, we must unset the previous default in a pre-save hook 
    // (handled by the DB index or manual update)
    if (isDefault) {
      await CustomTemplate.updateMany(
        { organizationId: authUser.organizationId, type, isDefault: true },
        { $set: { isDefault: false } }
      );
    }

    const newTemplate = await CustomTemplate.create({
      organizationId: authUser.organizationId,
      name,
      type,
      subject,
      content,
      isDefault: isDefault || false,
      createdBy: authUser.id
    });

    return ApiResponse.success({ template: newTemplate }, 201, 'Template saved successfully');
  } catch (error) {
    console.error('Create Template Error:', error);
    return ApiResponse.error(error.message);
  }
}
