import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import User from '@/lib/db/models/User';
import Employee from '@/lib/db/models/payroll/Employee';
import Organization from '@/lib/db/models/crm/organization/Organization';
import { getAuthUser } from '@/lib/auth-util';
import { ApiResponse } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    await dbConnect();
    const authUser = await getAuthUser();
    
    // For GDPR, users should be able to request their own data.
    // If admin, they might request the org data.
    const isOrgLevelExport = req.nextUrl.searchParams.get('scope') === 'organization';

    if (isOrgLevelExport) {
      if (!['admin', 'super_admin'].includes(authUser.role)) {
        return ApiResponse.forbidden('Only admins can export organizational data');
      }
      
      const orgId = authUser.organizationId;
      if (!orgId) return ApiResponse.badRequest('No organization associated with this admin');
      
      const [organization, employees, admins] = await Promise.all([
        Organization.findById(orgId).lean(),
        Employee.find({ "jobDetails.organizationId": orgId }).lean(),
        User.find({ organizationId: orgId }).select('-password').lean()
      ]);

      const exportData = {
        generatedAt: new Date().toISOString(),
        organization,
        personnel: { admins, employees }
      };

      return new NextResponse(JSON.stringify(exportData, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="org_data_export_${orgId}_${Date.now()}.json"`,
        },
      });
    }

    // Individual User/Employee Export
    let personalData = null;
    if (['admin', 'super_admin', 'recruiter'].includes(authUser.role)) {
       personalData = await User.findById(authUser.id).select('-password').lean();
    } else {
       personalData = await Employee.findById(authUser.id).lean();
    }

    const exportData = {
      generatedAt: new Date().toISOString(),
      personalData,
    };

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="personal_data_export_${authUser.id}_${Date.now()}.json"`,
      },
    });

  } catch (error) {
    console.error('GDPR Export Error:', error);
    return ApiResponse.error(error.message);
  }
}
